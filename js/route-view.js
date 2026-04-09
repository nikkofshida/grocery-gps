/* ============================================
   route-view.js — Route screen controller
   Ties together router.js + store-map.js + UI
   ============================================ */

var GroceryGPS = GroceryGPS || {};

GroceryGPS.routeView = (function () {

  var currentStrategy = 'natural';
  var currentRoute = null;

  // =====================
  //  INIT
  // =====================

  function init() {
    var storeId = GroceryGPS.storage.getActiveStoreId();
    var storeData = storeId ? GroceryGPS.storage.loadStore(storeId) : null;
    var items = GroceryGPS.listInput.getItems();

    if (!storeData || items.length === 0) {
      showEmpty();
      return;
    }

    // Build route
    currentRoute = GroceryGPS.router.buildRoute(items, storeData, currentStrategy);

    if (currentRoute.stops.length <= 2) {
      // Only entrance and exit — nothing to route
      showEmpty();
      return;
    }

    // Render the SVG map
    var mapEl = document.getElementById('route-map');
    GroceryGPS.storeMap.render(mapEl, storeData, currentRoute);

    // Update summary
    updateSummary(currentRoute, items);

    // Render stop list
    renderStopList(currentRoute);

    // Update strategy pills
    updateStrategyPills();
  }


  // =====================
  //  STRATEGY
  // =====================

  function setStrategy(strategy) {
    currentStrategy = strategy;
    init(); // Re-render with new strategy
  }

  function toggleStrategy() {
    currentStrategy = currentStrategy === 'natural' ? 'shortest' : 'natural';
    init();
  }

  function updateStrategyPills() {
    var natural = document.getElementById('pill-natural');
    var shortest = document.getElementById('pill-shortest');
    if (natural) natural.classList.toggle('active', currentStrategy === 'natural');
    if (shortest) shortest.classList.toggle('active', currentStrategy === 'shortest');
  }


  // =====================
  //  SUMMARY
  // =====================

  function updateSummary(route, items) {
    var stopCountEl = document.getElementById('route-stop-count');
    var itemCountEl = document.getElementById('route-item-count');
    var strategyEl = document.getElementById('route-strategy-label');

    var unchecked = items.filter(function (i) { return !i.checked; });

    if (stopCountEl) stopCountEl.textContent = route.totalStops;
    if (itemCountEl) itemCountEl.textContent = unchecked.length;
    if (strategyEl) strategyEl.textContent = currentStrategy === 'natural' ? 'Natural' : 'Shortest';
  }


  // =====================
  //  STOP LIST
  // =====================

  function renderStopList(route) {
    var container = document.getElementById('route-stop-list');
    if (!container) return;

    var stops = route.stops;
    var html = '';

    stops.forEach(function (stop, index) {
      var isStart = stop.type === 'entrance';
      var isEnd = stop.type === 'exit';
      var isLast = index === stops.length - 1;

      // Timeline connector
      var connector = !isLast
        ? '<div class="route-connector"></div>'
        : '';

      if (isStart) {
        html +=
          '<div class="route-stop route-stop--terminal">' +
            '<div class="route-stop-marker route-stop-marker--start">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                '<polygon points="5 3 19 12 5 21 5 3"/>' +
              '</svg>' +
            '</div>' +
            '<div class="route-stop-content">' +
              '<div class="route-stop-name">Enter Store</div>' +
            '</div>' +
            connector +
          '</div>';
        return;
      }

      if (isEnd) {
        html +=
          '<div class="route-stop route-stop--terminal">' +
            '<div class="route-stop-marker route-stop-marker--end">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>' +
              '</svg>' +
            '</div>' +
            '<div class="route-stop-content">' +
              '<div class="route-stop-name">Checkout & Exit</div>' +
            '</div>' +
          '</div>';
        return;
      }

      // Regular stop
      var isAisle = stop.type === 'aisle';
      var badgeContent = isAisle
        ? '<div class="route-stop-badge route-stop-badge--aisle">' + (stop.aisleNumber || '?') + '</div>'
        : '<div class="route-stop-badge route-stop-badge--zone">' + stop.label.substring(0, 2).toUpperCase() + '</div>';

      var itemsHtml = '';
      if (stop.items && stop.items.length > 0) {
        stop.items.forEach(function (item) {
          itemsHtml +=
            '<div class="route-stop-item">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;opacity:0.4;flex-shrink:0;">' +
                '<circle cx="12" cy="12" r="3"/>' +
              '</svg>' +
              '<span>' + GroceryGPS.app.escapeHtml(item.name) + '</span>' +
            '</div>';
        });
      }

      html +=
        '<div class="route-stop">' +
          '<div class="route-stop-marker">' +
            '<div class="route-stop-number">' + stop.stopNumber + '</div>' +
          '</div>' +
          '<div class="route-stop-content">' +
            '<div class="route-stop-header">' +
              badgeContent +
              '<div class="route-stop-name">' + GroceryGPS.app.escapeHtml(stop.label) + '</div>' +
              '<div class="route-stop-item-count">' + stop.items.length + ' item' + (stop.items.length !== 1 ? 's' : '') + '</div>' +
            '</div>' +
            '<div class="route-stop-items">' + itemsHtml + '</div>' +
          '</div>' +
          connector +
        '</div>';
    });

    container.innerHTML = html;
  }


  // =====================
  //  EMPTY STATE
  // =====================

  function showEmpty() {
    var mapEl = document.getElementById('route-map');
    if (mapEl) {
      mapEl.innerHTML =
        '<div class="empty-state" style="padding:32px 0;">' +
          '<div class="empty-state-icon" style="width:48px;height:48px;">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px;">' +
              '<polygon points="3 11 22 2 13 21 11 13 3 11"/>' +
            '</svg>' +
          '</div>' +
          '<div class="empty-state-title" style="font-size:0.95rem;">No route to show</div>' +
          '<div class="empty-state-desc" style="font-size:0.8rem;">Add items to your list first, then optimize your route.</div>' +
        '</div>';
    }

    var stopList = document.getElementById('route-stop-list');
    if (stopList) stopList.innerHTML = '';

    var stopCountEl = document.getElementById('route-stop-count');
    var itemCountEl = document.getElementById('route-item-count');
    if (stopCountEl) stopCountEl.textContent = '0';
    if (itemCountEl) itemCountEl.textContent = '0';
  }


  // =====================
  //  START SHOPPING
  // =====================

  function startShopping() {
    GroceryGPS.app.showScreen('shopping');
  }


  // =====================
  //  LIFECYCLE
  // =====================

  document.addEventListener('screenchange', function (e) {
    if (e.detail.screen === 'route') {
      init();
    }
  });


  return {
    init: init,
    setStrategy: setStrategy,
    toggleStrategy: toggleStrategy,
    startShopping: startShopping,
    getRoute: function () { return currentRoute; }
  };

})();
