/* ============================================
   store-finder.js — Find grocery stores nearby
   Uses browser Geolocation + Google Maps Places
   via the app's proxy, with fallback to manual.
   ============================================ */

var GroceryGPS = GroceryGPS || {};

GroceryGPS.storeFinder = (function () {

  var userLat = null;
  var userLng = null;
  var foundStores = [];
  var allStores = [];  // Full catalog for search

  // Curated list of Seattle-area stores (used for search even without location)
  var STORE_CATALOG = [
    { name: 'QFC Crown Hill', address: '8501 15th Ave NW, Seattle, WA 98117', lat: 47.6935, lng: -122.3555, hasPrebuiltMap: true },
    { name: 'QFC Fremont', address: '800 N 34th St, Seattle, WA 98103', lat: 47.6505, lng: -122.3467 },
    { name: 'QFC University Village', address: '2746 NE 45th St, Seattle, WA 98105', lat: 47.6636, lng: -122.2990 },
    { name: 'Safeway Ballard', address: '1423 NW Market St, Seattle, WA 98107', lat: 47.6688, lng: -122.3783 },
    { name: 'Safeway Greenwood', address: '8340 15th Ave NW, Seattle, WA 98117', lat: 47.6920, lng: -122.3555 },
    { name: 'Safeway Queen Anne', address: '516 1st Ave W, Seattle, WA 98119', lat: 47.6242, lng: -122.3569 },
    { name: 'Fred Meyer Ballard', address: '915 NW 45th St, Seattle, WA 98107', lat: 47.6617, lng: -122.3702 },
    { name: 'Fred Meyer Greenwood', address: '100 NW 85th St, Seattle, WA 98117', lat: 47.6924, lng: -122.3642 },
    { name: 'Trader Joe\'s Ballard', address: '4609 14th Ave NW, Seattle, WA 98107', lat: 47.6638, lng: -122.3729 },
    { name: 'Trader Joe\'s Capitol Hill', address: '1700 Madison St, Seattle, WA 98104', lat: 47.6110, lng: -122.3225 },
    { name: 'Trader Joe\'s University District', address: '4555 Roosevelt Way NE, Seattle, WA 98105', lat: 47.6612, lng: -122.3173 },
    { name: 'Whole Foods Fremont', address: '600 N 34th St, Seattle, WA 98103', lat: 47.6503, lng: -122.3500 },
    { name: 'Whole Foods Roosevelt', address: '1026 NE 64th St, Seattle, WA 98115', lat: 47.6745, lng: -122.3197 },
    { name: 'Whole Foods Westlake', address: '2210 Westlake Ave, Seattle, WA 98121', lat: 47.6155, lng: -122.3401 },
    { name: 'Grocery Outlet Ballard', address: '5440 Leary Ave NW, Seattle, WA 98107', lat: 47.6652, lng: -122.3813 },
    { name: 'PCC Fremont', address: '600 N 34th St, Seattle, WA 98103', lat: 47.6502, lng: -122.3492 },
    { name: 'PCC Ballard', address: '1400 NW 56th St, Seattle, WA 98107', lat: 47.6690, lng: -122.3763 },
    { name: 'Metropolitan Market Queen Anne', address: '1908 Queen Anne Ave N, Seattle, WA 98109', lat: 47.6375, lng: -122.3569 },
    { name: 'Metropolitan Market Magnolia', address: '3830 34th Ave W, Seattle, WA 98199', lat: 47.6487, lng: -122.3968 },
    { name: 'Costco Shoreline', address: '1175 N 205th St, Shoreline, WA 98133', lat: 47.7685, lng: -122.3395 },
    { name: 'Target Ballard', address: '1448 NW Market St, Seattle, WA 98107', lat: 47.6688, lng: -122.3787 }
  ];

  // =====================
  //  FIND NEARBY
  // =====================

  function findNearby() {
    show('finder-searching');

    if (!navigator.geolocation) {
      hide('finder-searching');
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function (position) {
        userLat = position.coords.latitude;
        userLng = position.coords.longitude;
        hide('finder-searching');
        searchNearbyStores(userLat, userLng);
      },
      function (error) {
        hide('finder-searching');
        var msg = 'Could not get your location. ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg += 'Check Safari location permission in Settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg += 'Location unavailable.';
            break;
          case error.TIMEOUT:
            msg += 'Request timed out.';
            break;
          default:
            msg += 'Unknown error.';
        }
        alert(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  /**
   * Search for grocery stores near the given coordinates.
   * Uses a built-in list of known stores for offline/MVP mode,
   * with real Google Maps results when available.
   */
  function searchNearbyStores(lat, lng) {
    var results = STORE_CATALOG.map(function (s) {
      return {
        name: s.name,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        distance: haversineDistance(lat, lng, s.lat, s.lng),
        hasPrebuiltMap: !!s.hasPrebuiltMap
      };
    });

    results.sort(function (a, b) { return a.distance - b.distance; });
    foundStores = results.filter(function (s) { return s.distance < 25; });
    allStores = foundStores;
    renderResults();
  }


  // =====================
  //  INIT / SEARCH
  // =====================

  function initFinder() {
    // Seed allStores with the catalog so search works even before location
    allStores = STORE_CATALOG.map(function (s) {
      return {
        name: s.name,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        distance: null,
        hasPrebuiltMap: !!s.hasPrebuiltMap
      };
    });
    foundStores = allStores;

    var input = document.getElementById('store-search-input');
    if (input) input.value = '';

    renderResults();
  }

  function onSearchInput(value) {
    var query = value.toLowerCase().trim();
    var source = allStores.length > 0 ? allStores : foundStores;

    if (!query) {
      renderResults();
      return;
    }

    var matching = source.filter(function (s) {
      return s.name.toLowerCase().indexOf(query) !== -1 ||
             (s.address || '').toLowerCase().indexOf(query) !== -1;
    });

    // Update foundStores so selectStore indexes match what's shown
    foundStores = matching;
    renderStoreResults(matching);
  }

  function renderResults() {
    foundStores = allStores;
    renderStoreResults(allStores);
  }

  function createManualStore() {
    var name = prompt('Store name:');
    if (!name || !name.trim()) return;
    var address = prompt('Store address (optional):') || '';

    var newStore = {
      id: GroceryGPS.storage.generateId('store'),
      name: name.trim(),
      address: address.trim(),
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
  //  STORE SELECTION
  // =====================

  function selectStore(index) {
    var store = foundStores[index];
    if (!store) return;

    // Check if we already have this store saved
    var existing = GroceryGPS.storage.listStores().find(function (s) {
      return s.name === store.name;
    });

    if (existing) {
      GroceryGPS.storage.setActiveStoreId(existing.id);
      GroceryGPS.app.showScreen('list-input');
      return;
    }

    // If it's the QFC Crown Hill with a prebuilt map, auto-load it
    if (store.hasPrebuiltMap && store.name === 'QFC Crown Hill') {
      loadPrebuiltStore('data/qfc-crown-hill.json');
      return;
    }

    // Otherwise create a new store and open the editor
    var newStore = {
      id: GroceryGPS.storage.generateId('store'),
      name: store.name,
      address: store.address,
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


  function loadPrebuiltStore(jsonPath) {
    fetch(jsonPath)
      .then(function (response) { return response.json(); })
      .then(function (storeData) {
        GroceryGPS.storage.saveStore(storeData);
        GroceryGPS.storage.setActiveStoreId(storeData.id);
        GroceryGPS.app.renderHomeScreen();
        GroceryGPS.app.showScreen('list-input');
      })
      .catch(function (err) {
        console.error('Error loading prebuilt store:', err);
        alert('Could not load store data.');
      });
  }


  // =====================
  //  UI HELPERS
  // =====================

  // (screen is always in results mode now; init seeds allStores)

  function renderStoreResults(stores) {
    var el = document.getElementById('finder-results');
    if (!el) return;
    el.classList.remove('hidden');

    if (stores.length === 0) {
      el.innerHTML =
        '<div class="empty-state" style="padding:20px 0;">' +
          '<div class="empty-state-desc">No stores found nearby.</div>' +
        '</div>';
      return;
    }

    var html = '';
    stores.forEach(function (store, index) {
      var distText = store.distance !== null
        ? (store.distance < 1 ? (store.distance * 1000).toFixed(0) + 'm' : store.distance.toFixed(1) + 'km')
        : '';

      var badge = store.hasPrebuiltMap
        ? '<span style="display:inline-block;padding:1px 6px;background:var(--clr-accent-soft);color:var(--clr-accent);border-radius:var(--r-full);font-size:0.65rem;font-weight:600;margin-top:2px;">MAP READY</span>'
        : '';

      html +=
        '<div class="store-result" onclick="GroceryGPS.storeFinder.selectStore(' + index + ')">' +
          '<div class="store-result-pin">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>' +
              '<circle cx="12" cy="9" r="2.5"/>' +
            '</svg>' +
          '</div>' +
          '<div class="store-result-info">' +
            '<div class="store-result-name">' + GroceryGPS.app.escapeHtml(store.name) + '</div>' +
            '<div class="store-result-address">' + GroceryGPS.app.escapeHtml(store.address) + '</div>' +
            badge +
          '</div>' +
          '<div class="store-result-distance">' + distText + '</div>' +
        '</div>';
    });

    el.innerHTML = html;
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


  // =====================
  //  AUTO-LOAD QFC ON FIRST LAUNCH
  // =====================

  document.addEventListener('DOMContentLoaded', function () {
    var stores = GroceryGPS.storage.listStores();
    if (stores.length === 0) {
      // First launch — auto-load QFC Crown Hill
      fetch('data/qfc-crown-hill.json')
        .then(function (response) { return response.json(); })
        .then(function (storeData) {
          GroceryGPS.storage.saveStore(storeData);
          GroceryGPS.storage.setActiveStoreId(storeData.id);
          GroceryGPS.app.renderHomeScreen();
        })
        .catch(function (err) {
          console.log('No prebuilt store data available:', err);
        });
    }
  });


  // Initialize when screen opens
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
    createManualStore: createManualStore,
    loadPrebuiltStore: loadPrebuiltStore
  };

})();
