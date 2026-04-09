/* ============================================
   store-finder.js — Find grocery stores nearby
   Uses browser geolocation + Overpass API (OpenStreetMap)
   for real, free, worldwide grocery store data.
   ============================================ */

var GroceryGPS = GroceryGPS || {};

GroceryGPS.storeFinder = (function () {

  var userLat = null;
  var userLng = null;
  var nearbyStores = [];       // Raw results from Overpass (sorted by distance)
  var isLoadingLocation = false;
  var isLoadingStores = false;
  var locationDenied = false;

  var OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
  var SEARCH_RADIUS_M = 8000;  // 8 km — reasonable walking+driving radius
  var EXPANDED_RADIUS_M = 40000; // 40 km — used when user searches by name

  // =====================
  //  INIT (called on screen open)
  // =====================

  function initFinder() {
    var input = document.getElementById('store-search-input');
    if (input) input.value = '';

    // Always try to get location on screen open unless previously denied
    if (!locationDenied && (userLat === null || userLng === null)) {
      findNearby({ silent: true });
    } else {
      renderAll();
    }
  }

  // =====================
  //  GEOLOCATION
  // =====================

  function findNearby(opts) {
    opts = opts || {};
    if (isLoadingLocation) return;

    if (!navigator.geolocation) {
      if (!opts.silent) alert('Geolocation not supported on this device.');
      renderAll();
      return;
    }

    isLoadingLocation = true;
    show('finder-searching');
    updateSearchingText('Finding your location...');

    navigator.geolocation.getCurrentPosition(
      function (position) {
        isLoadingLocation = false;
        userLat = position.coords.latitude;
        userLng = position.coords.longitude;
        locationDenied = false;
        fetchNearbyFromOverpass(userLat, userLng, SEARCH_RADIUS_M);
      },
      function (error) {
        isLoadingLocation = false;
        hide('finder-searching');

        if (error.code === error.PERMISSION_DENIED) {
          locationDenied = true;
          if (!opts.silent) {
            alert('Location access denied. Enable it in Safari settings or use search.');
          }
        } else if (!opts.silent) {
          alert('Could not get your location: ' + (error.message || 'unknown error'));
        }
        renderAll();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }

  // =====================
  //  OVERPASS API (OpenStreetMap)
  // =====================

  function fetchNearbyFromOverpass(lat, lng, radiusMeters) {
    isLoadingStores = true;
    updateSearchingText('Finding nearby stores...');

    // Overpass QL query — fetch supermarkets, grocery stores, and large stores
    var query =
      '[out:json][timeout:15];' +
      '(' +
        'node["shop"="supermarket"](around:' + radiusMeters + ',' + lat + ',' + lng + ');' +
        'way["shop"="supermarket"](around:' + radiusMeters + ',' + lat + ',' + lng + ');' +
        'node["shop"="grocery"](around:' + radiusMeters + ',' + lat + ',' + lng + ');' +
        'way["shop"="grocery"](around:' + radiusMeters + ',' + lat + ',' + lng + ');' +
        'node["shop"="greengrocer"](around:' + radiusMeters + ',' + lat + ',' + lng + ');' +
      ');' +
      'out center tags;';

    fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query)
    })
    .then(function (r) {
      if (!r.ok) throw new Error('Overpass API returned ' + r.status);
      return r.json();
    })
    .then(function (data) {
      isLoadingStores = false;
      hide('finder-searching');

      var elements = data.elements || [];
      nearbyStores = elements.map(function (el) {
        var coords = el.type === 'node'
          ? { lat: el.lat, lng: el.lon }
          : (el.center ? { lat: el.center.lat, lng: el.center.lon } : null);
        if (!coords) return null;

        var tags = el.tags || {};
        var name = tags.name || tags.brand || 'Unnamed store';
        var address = buildAddress(tags);
        var distance = haversineDistance(lat, lng, coords.lat, coords.lng);

        return {
          osmId: el.type + '/' + el.id,
          name: name,
          address: address,
          lat: coords.lat,
          lng: coords.lng,
          distance: distance,
          brand: tags.brand || null
        };
      }).filter(function (s) { return s !== null; });

      // Sort by distance
      nearbyStores.sort(function (a, b) { return a.distance - b.distance; });

      renderAll();
    })
    .catch(function (err) {
      isLoadingStores = false;
      hide('finder-searching');
      console.error('Overpass error:', err);
      // Soft fail — still show saved stores
      nearbyStores = [];
      renderAll();
    });
  }

  function buildAddress(tags) {
    var parts = [];
    if (tags['addr:housenumber'] && tags['addr:street']) {
      parts.push(tags['addr:housenumber'] + ' ' + tags['addr:street']);
    } else if (tags['addr:street']) {
      parts.push(tags['addr:street']);
    }
    if (tags['addr:city']) parts.push(tags['addr:city']);
    if (tags['addr:state']) parts.push(tags['addr:state']);
    return parts.join(', ') || '';
  }

  // =====================
  //  SEARCH
  // =====================

  function onSearchInput(value) {
    renderAll(value);
  }

  // =====================
  //  RENDERING
  // =====================

  function renderAll(searchQuery) {
    var query = (searchQuery || '').toLowerCase().trim();
    var savedStores = GroceryGPS.storage.listStores();

    // Build "saved stores" section — prioritized, sorted by lastUsedAt desc
    var savedSorted = savedStores.slice().sort(function (a, b) {
      var tA = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
      var tB = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
      return tB - tA;
    });

    // Filter by query if present
    var savedFiltered = query
      ? savedSorted.filter(function (s) {
          return (s.name || '').toLowerCase().indexOf(query) !== -1 ||
                 (s.address || '').toLowerCase().indexOf(query) !== -1;
        })
      : savedSorted;

    // Filter nearby by query, and when searching deduplicate by name+address (OSM has dupes)
    var nearbySource = nearbyStores.slice();

    // Remove nearby stores that are already saved
    nearbySource = nearbySource.filter(function (ns) {
      return !savedStores.find(function (s) {
        return s.osmId === ns.osmId || normalizeKey(s.name, s.address) === normalizeKey(ns.name, ns.address);
      });
    });

    var nearbyFiltered = query
      ? nearbySource.filter(function (s) {
          return s.name.toLowerCase().indexOf(query) !== -1 ||
                 (s.brand && s.brand.toLowerCase().indexOf(query) !== -1) ||
                 s.address.toLowerCase().indexOf(query) !== -1;
        })
      : nearbySource;

    // Always sort nearby results by distance (already sorted, but re-sort after filter)
    nearbyFiltered.sort(function (a, b) { return a.distance - b.distance; });

    renderSections(savedFiltered, nearbyFiltered, query);
  }

  function normalizeKey(name, address) {
    return ((name || '') + '|' + (address || '')).toLowerCase().replace(/\s+/g, '');
  }

  function renderSections(savedList, nearbyList, query) {
    var container = document.getElementById('finder-results');
    if (!container) return;
    container.classList.remove('hidden');

    var html = '';

    // Saved stores section
    if (savedList.length > 0) {
      html += '<div class="finder-section-label">Your Stores</div>';
      savedList.forEach(function (s, i) {
        html += renderStoreRow({
          name: s.name,
          address: s.address || '',
          distance: (userLat !== null && s.lat && s.lng)
            ? haversineDistance(userLat, userLng, s.lat, s.lng)
            : null,
          aisleCount: (s.aisles || []).length,
          isSaved: true,
          onclickArg: "'saved:" + s.id + "'"
        });
      });
    }

    // Nearby stores section
    if (nearbyList.length > 0) {
      var label = userLat !== null ? 'Nearby Stores' : 'Search Results';
      html += '<div class="finder-section-label">' + label + '</div>';
      nearbyList.forEach(function (s, i) {
        html += renderStoreRow({
          name: s.name,
          address: s.address,
          distance: s.distance,
          isSaved: false,
          onclickArg: "'nearby:" + i + "'"
        });
      });
    }

    // Empty state
    if (savedList.length === 0 && nearbyList.length === 0) {
      if (isLoadingStores) {
        html = '';
      } else if (query) {
        html = '<div class="empty-state" style="padding:24px 0;">' +
                 '<div class="empty-state-desc">No matches for "' + escapeHtml(query) + '"</div>' +
                 '<div class="empty-state-desc" style="margin-top:8px;font-size:0.75rem;opacity:0.6;">Try a different name or add the store manually.</div>' +
               '</div>';
      } else if (locationDenied || userLat === null) {
        html = '<div class="empty-state" style="padding:24px 0;">' +
                 '<div class="empty-state-desc">Grant location access to see nearby stores, or type a name to search.</div>' +
               '</div>';
      } else {
        html = '<div class="empty-state" style="padding:24px 0;">' +
                 '<div class="empty-state-desc">No grocery stores found within 8 km.</div>' +
               '</div>';
      }
    }

    // Store the lists so selectStore can find them
    nearbyStores._filtered = nearbyList;

    container.innerHTML = html;
  }

  function renderStoreRow(opts) {
    var distText = opts.distance !== null && opts.distance !== undefined
      ? (opts.distance < 1
          ? (opts.distance * 1000).toFixed(0) + ' m'
          : opts.distance.toFixed(1) + ' km')
      : '';

    var badge = opts.isSaved
      ? '<span class="finder-badge finder-badge--saved">' + (opts.aisleCount || 0) + ' aisles</span>'
      : '';

    return (
      '<div class="store-result" onclick="GroceryGPS.storeFinder.selectStore(' + opts.onclickArg + ')">' +
        '<div class="store-result-pin">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>' +
            '<circle cx="12" cy="9" r="2.5"/>' +
          '</svg>' +
        '</div>' +
        '<div class="store-result-info">' +
          '<div class="store-result-name">' + escapeHtml(opts.name) + '</div>' +
          '<div class="store-result-address">' + escapeHtml(opts.address) + '</div>' +
          badge +
        '</div>' +
        '<div class="store-result-distance">' + distText + '</div>' +
      '</div>'
    );
  }

  // =====================
  //  SELECTION
  // =====================

  function selectStore(id) {
    if (typeof id === 'string' && id.indexOf('saved:') === 0) {
      var storeId = id.substring(6);
      GroceryGPS.storage.setActiveStoreId(storeId);
      GroceryGPS.app.showScreen('list-input');
      return;
    }

    if (typeof id === 'string' && id.indexOf('nearby:') === 0) {
      var index = parseInt(id.substring(7), 10);
      var filtered = nearbyStores._filtered || nearbyStores;
      var store = filtered[index];
      if (!store) return;

      // Check if already saved (by osmId or name match)
      var existing = GroceryGPS.storage.listStores().find(function (s) {
        return s.osmId === store.osmId ||
               normalizeKey(s.name, s.address) === normalizeKey(store.name, store.address);
      });

      if (existing) {
        GroceryGPS.storage.setActiveStoreId(existing.id);
        GroceryGPS.app.showScreen('list-input');
        return;
      }

      // Create a fresh store and open the editor
      var newStore = {
        id: GroceryGPS.storage.generateId('store'),
        osmId: store.osmId,
        name: store.name,
        address: store.address,
        lat: store.lat,
        lng: store.lng,
        entrance: { side: 'south', position: 0.3 },
        exit: { side: 'south', position: 0.7 },
        aisles: [],
        zones: [],
        layout: { aisleRows: 1, aisleCols: 0, orientation: 'horizontal' }
      };

      GroceryGPS.storage.saveStore(newStore);
      GroceryGPS.storage.setActiveStoreId(newStore.id);
      GroceryGPS.storeEditor.loadStoreForEditing(newStore.id);
      GroceryGPS.app.showScreen('store-editor');
    }
  }

  function createManualStore() {
    var name = prompt('Store name:');
    if (!name || !name.trim()) return;
    var address = prompt('Store address (optional):') || '';

    var newStore = {
      id: GroceryGPS.storage.generateId('store'),
      name: name.trim(),
      address: address.trim(),
      lat: userLat,
      lng: userLng,
      entrance: { side: 'south', position: 0.3 },
      exit: { side: 'south', position: 0.7 },
      aisles: [],
      zones: [],
      layout: { aisleRows: 1, aisleCols: 0, orientation: 'horizontal' }
    };

    GroceryGPS.storage.saveStore(newStore);
    GroceryGPS.storage.setActiveStoreId(newStore.id);
    GroceryGPS.storeEditor.loadStoreForEditing(newStore.id);
    GroceryGPS.app.showScreen('store-editor');
  }

  // =====================
  //  UTILITIES
  // =====================

  function haversineDistance(lat1, lon1, lat2, lon2) {
    var R = 6371; // km
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function toRad(deg) { return deg * (Math.PI / 180); }

  function show(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }

  function hide(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }

  function updateSearchingText(text) {
    var el = document.querySelector('#finder-searching span');
    if (el) el.textContent = text;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =====================
  //  LIFECYCLE
  // =====================

  document.addEventListener('screenchange', function (e) {
    if (e.detail.screen === 'store-finder') {
      initFinder();
    }
  });

  return {
    findNearby: findNearby,
    initFinder: initFinder,
    onSearchInput: onSearchInput,
    selectStore: selectStore,
    createManualStore: createManualStore
  };

})();
