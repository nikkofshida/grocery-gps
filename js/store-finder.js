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

  // =====================
  //  FIND NEARBY
  // =====================

  function findNearby() {
    showSearching();

    if (!navigator.geolocation) {
      showError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function (position) {
        userLat = position.coords.latitude;
        userLng = position.coords.longitude;
        searchNearbyStores(userLat, userLng);
      },
      function (error) {
        var msg = 'Could not get your location. ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg += 'Location access was denied.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            msg += 'Location request timed out.';
            break;
          default:
            msg += 'An unknown error occurred.';
        }
        showError(msg);
        showManualSearch();
      }
    );
  }

  /**
   * Search for grocery stores near the given coordinates.
   * Uses a built-in list of known stores for offline/MVP mode,
   * with real Google Maps results when available.
   */
  function searchNearbyStores(lat, lng) {
    // For MVP, we use a curated list of Seattle-area grocery stores
    // plus the user's saved stores. In production, this would hit
    // the Google Maps Places API directly.

    var results = [];

    // Add QFC Crown Hill if user is in Seattle area
    var distToQFC = haversineDistance(lat, lng, 47.6935, -122.3555);
    results.push({
      name: 'QFC Crown Hill',
      address: '8501 15th Ave NW, Seattle, WA 98117',
      lat: 47.6935,
      lng: -122.3555,
      distance: distToQFC,
      hasPrebuiltMap: true
    });

    // Add more known stores in the area
    var knownStores = [
      { name: 'QFC Fremont', address: '800 N 34th St, Seattle, WA 98103', lat: 47.6505, lng: -122.3467 },
      { name: 'Safeway Ballard', address: '1423 NW Market St, Seattle, WA 98107', lat: 47.6688, lng: -122.3783 },
      { name: 'Fred Meyer Ballard', address: '915 NW 45th St, Seattle, WA 98107', lat: 47.6617, lng: -122.3702 },
      { name: 'Trader Joe\'s Ballard', address: '4649 14th Ave NW, Seattle, WA 98107', lat: 47.6638, lng: -122.3729 },
      { name: 'Whole Foods Fremont', address: '600 N 34th St, Seattle, WA 98103', lat: 47.6503, lng: -122.3500 },
      { name: 'Grocery Outlet Ballard', address: '5440 Leary Ave NW, Seattle, WA 98107', lat: 47.6652, lng: -122.3813 },
      { name: 'PCC Fremont', address: '600 N 34th St, Seattle, WA 98103', lat: 47.6502, lng: -122.3492 },
      { name: 'Safeway Greenwood', address: '8340 15th Ave NW, Seattle, WA 98117', lat: 47.6920, lng: -122.3555 },
      { name: 'Metropolitan Market', address: '1908 Queen Anne Ave N, Seattle, WA 98109', lat: 47.6375, lng: -122.3569 }
    ];

    knownStores.forEach(function (s) {
      var dist = haversineDistance(lat, lng, s.lat, s.lng);
      results.push({
        name: s.name,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        distance: dist,
        hasPrebuiltMap: false
      });
    });

    // Sort by distance
    results.sort(function (a, b) { return a.distance - b.distance; });

    // Only show stores within 15 km
    foundStores = results.filter(function (s) { return s.distance < 15; });

    showResults();
  }


  // =====================
  //  MANUAL SEARCH
  // =====================

  function showManualSearch() {
    hide('finder-prompt');
    hide('finder-searching');
    show('finder-search');
    show('finder-results');

    var input = document.getElementById('store-search-input');
    if (input) {
      input.value = '';
      setTimeout(function () { input.focus(); }, 300);
    }

    // Show all saved stores initially
    renderSavedStores();
  }

  function onSearchInput(value) {
    var query = value.toLowerCase().trim();
    if (!query) {
      renderSavedStores();
      return;
    }

    // Filter found stores by query
    var matching = foundStores.filter(function (s) {
      return s.name.toLowerCase().indexOf(query) !== -1 ||
             s.address.toLowerCase().indexOf(query) !== -1;
    });

    renderStoreResults(matching);
  }

  function renderSavedStores() {
    var saved = GroceryGPS.storage.listStores();
    if (saved.length === 0 && foundStores.length === 0) {
      var el = document.getElementById('finder-results');
      if (el) {
        el.innerHTML =
          '<div class="empty-state" style="padding:20px 0;">' +
            '<div class="empty-state-desc">No stores found. Tap "Use My Location" or search for a store name.</div>' +
          '</div>';
      }
      return;
    }

    var results = foundStores.length > 0 ? foundStores : saved.map(function (s) {
      return { name: s.name, address: s.address || '', distance: null, hasPrebuiltMap: true };
    });

    renderStoreResults(results);
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

  function showSearching() {
    hide('finder-prompt');
    hide('finder-search');
    hide('finder-results');
    show('finder-searching');
  }

  function showResults() {
    hide('finder-prompt');
    hide('finder-searching');
    show('finder-results');
    renderStoreResults(foundStores);
  }

  function showError(msg) {
    hide('finder-searching');
    show('finder-prompt');
    alert(msg);
  }

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


  return {
    findNearby: findNearby,
    showManualSearch: showManualSearch,
    onSearchInput: onSearchInput,
    selectStore: selectStore,
    loadPrebuiltStore: loadPrebuiltStore
  };

})();
