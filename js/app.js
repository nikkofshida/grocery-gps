/* ============================================
   app.js — SPA router & screen switching
   ============================================ */

var GroceryGPS = GroceryGPS || {};

GroceryGPS.app = (function () {
  var screenHistory = [];
  var currentScreen = 'home';

  function showScreen(screenName, skipHistory) {
    var current = document.getElementById('screen-' + currentScreen);
    if (current) current.classList.remove('active');

    if (!skipHistory && currentScreen !== screenName) {
      screenHistory.push(currentScreen);
    }

    var next = document.getElementById('screen-' + screenName);
    if (next) {
      next.classList.add('active');
      currentScreen = screenName;
      window.scrollTo(0, 0);
    }

    document.dispatchEvent(new CustomEvent('screenchange', {
      detail: { screen: screenName }
    }));
  }

  function goBack() {
    if (screenHistory.length > 0) {
      showScreen(screenHistory.pop(), true);
    } else {
      showScreen('home', true);
    }
  }

  function getCurrentScreen() { return currentScreen; }

  function sortStoresByRecent(stores) {
    return stores.slice().sort(function (a, b) {
      var tA = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
      var tB = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
      return tB - tA;
    });
  }

  function renderHomeScreen() {
    var listEl = document.getElementById('home-store-list');
    var storesSection = document.getElementById('home-stores-section');
    if (!listEl) return;

    var stores = sortStoresByRecent(GroceryGPS.storage.listStores());

    if (stores.length === 0) {
      storesSection.classList.add('hidden');
      return;
    }

    storesSection.classList.remove('hidden');

    var html = '';
    stores.forEach(function (store) {
      var aisleCount = (store.aisles || []).length;
      var zoneCount = (store.zones || []).length;
      html +=
        '<div class="store-card">' +
          '<div class="store-card-main" onclick="GroceryGPS.app.selectStore(\'' + store.id + '\')">' +
            '<div class="store-card-icon">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>' +
                '<polyline points="9 22 9 12 15 12 15 22"/>' +
              '</svg>' +
            '</div>' +
            '<div class="store-card-info">' +
              '<div class="store-card-name">' + escapeHtml(store.name) + '</div>' +
              '<div class="store-card-meta">' + aisleCount + ' aisles · ' + zoneCount + ' zones</div>' +
            '</div>' +
          '</div>' +
          '<button class="store-card-edit" onclick="GroceryGPS.app.editStore(\'' + store.id + '\')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>' +
              '<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>' +
            '</svg>' +
            '<span>Edit Map</span>' +
          '</button>' +
        '</div>';
    });

    listEl.innerHTML = html;
  }

  function selectStore(storeId) {
    GroceryGPS.storage.setActiveStoreId(storeId);
    showScreen('list-input');
  }

  function editStore(storeId) {
    GroceryGPS.storage.setActiveStoreId(storeId);
    if (GroceryGPS.storeEditor && GroceryGPS.storeEditor.loadStoreForEditing) {
      GroceryGPS.storeEditor.loadStoreForEditing(storeId);
    }
    showScreen('store-editor');
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function init() {
    showScreen('home');
    renderHomeScreen();
    document.addEventListener('screenchange', function (e) {
      if (e.detail.screen === 'home') renderHomeScreen();
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    showScreen: showScreen,
    goBack: goBack,
    getCurrentScreen: getCurrentScreen,
    selectStore: selectStore,
    editStore: editStore,
    escapeHtml: escapeHtml,
    renderHomeScreen: renderHomeScreen
  };
})();
