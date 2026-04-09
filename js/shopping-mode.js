/* ============================================
   shopping-mode.js — In-store shopping experience
   The screen you use while walking through
   the store. Grouped by stop, tap to check off,
   auto-advance, skip stops, progress tracking.
   ============================================ */

var GroceryGPS = GroceryGPS || {};

GroceryGPS.shoppingMode = (function () {

  var route = null;        // The full route from routeView
  var stops = [];          // Shopping stops (no entrance/exit)
  var items = [];          // Reference to list items
  var currentStopIndex = 0;
  var storeData = null;

  // =====================
  //  INIT
  // =====================

  function init() {
    // Get the route from routeView
    route = GroceryGPS.routeView ? GroceryGPS.routeView.getRoute() : null;
    items = GroceryGPS.listInput ? GroceryGPS.listInput.getItems() : [];

    var storeId = GroceryGPS.storage.getActiveStoreId();
    storeData = storeId ? GroceryGPS.storage.loadStore(storeId) : null;

    if (!route || !route.stops || route.stops.length === 0) {
      showEmpty();
      return;
    }

    // Filter to only shopping stops (not entrance/exit)
    stops = route.stops.filter(function (s) {
      return s.type !== 'entrance' && s.type !== 'exit';
    });

    if (stops.length === 0) {
      showEmpty();
      return;
    }

    // Find first stop that still has unchecked items
    currentStopIndex = findFirstIncompleteStop();
    render();
  }

  function findFirstIncompleteStop() {
    for (var i = 0; i < stops.length; i++) {
      if (getUncheckedCount(stops[i]) > 0) return i;
    }
    return 0;
  }

  // =====================
  //  ITEM MANAGEMENT
  // =====================

  function findItemInList(itemName) {
    return items.findIndex(function (item) {
      return item.name === itemName;
    });
  }

  function toggleItem(stopIndex, itemName) {
    var listIndex = findItemInList(itemName);
    if (listIndex === -1) return;

    items[listIndex].checked = !items[listIndex].checked;

    // Save through listInput
    if (GroceryGPS.listInput && GroceryGPS.listInput.getItems) {
      // Items array is shared by reference, so the save propagates
      var storeId = GroceryGPS.storage.getActiveStoreId();
      if (storeId) {
        var lists = GroceryGPS.storage.listLists();
        var storeList = lists.find(function (l) { return l.storeId === storeId; });
        if (storeList) {
          storeList.items = items;
          GroceryGPS.storage.saveList(storeList);
        }
      }
    }

    render();

    // Check if all items at this stop are done
    var stop = stops[currentStopIndex];
    if (stop && getUncheckedCount(stop) === 0) {
      // Auto-advance after a brief delay
      setTimeout(function () {
        autoAdvance();
      }, 600);
    }
  }

  function getUncheckedCount(stop) {
    if (!stop || !stop.items) return 0;
    return stop.items.filter(function (si) {
      var listIdx = findItemInList(si.name);
      return listIdx !== -1 && !items[listIdx].checked;
    }).length;
  }

  function getTotalChecked() {
    var total = 0;
    stops.forEach(function (stop) {
      if (!stop.items) return;
      stop.items.forEach(function (si) {
        var idx = findItemInList(si.name);
        if (idx !== -1 && items[idx].checked) total++;
      });
    });
    return total;
  }

  function getTotalItems() {
    var total = 0;
    stops.forEach(function (stop) {
      if (stop.items) total += stop.items.length;
    });
    return total;
  }

  // =====================
  //  NAVIGATION
  // =====================

  function goToStop(index) {
    if (index >= 0 && index < stops.length) {
      currentStopIndex = index;
      render();
      // Scroll current stop into view
      var el = document.getElementById('shop-current-stop');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function nextStop() {
    if (currentStopIndex < stops.length - 1) {
      goToStop(currentStopIndex + 1);
    }
  }

  function prevStop() {
    if (currentStopIndex > 0) {
      goToStop(currentStopIndex - 1);
    }
  }

  function skipStop() {
    // Mark all items at current stop as checked (skipped)
    var stop = stops[currentStopIndex];
    if (stop && stop.items) {
      stop.items.forEach(function (si) {
        var idx = findItemInList(si.name);
        if (idx !== -1) items[idx].checked = true;
      });

      // Save
      var storeId = GroceryGPS.storage.getActiveStoreId();
      if (storeId) {
        var lists = GroceryGPS.storage.listLists();
        var storeList = lists.find(function (l) { return l.storeId === storeId; });
        if (storeList) {
          storeList.items = items;
          GroceryGPS.storage.saveList(storeList);
        }
      }
    }

    autoAdvance();
  }

  function autoAdvance() {
    // Find next incomplete stop
    for (var i = currentStopIndex + 1; i < stops.length; i++) {
      if (getUncheckedCount(stops[i]) > 0) {
        goToStop(i);
        return;
      }
    }
    // All done!
    render();
    if (getTotalChecked() >= getTotalItems()) {
      showComplete();
    }
  }

  // =====================
  //  RENDERING
  // =====================

  function render() {
    var container = document.getElementById('shopping-content');
    if (!container) return;

    var totalItems = getTotalItems();
    var checkedItems = getTotalChecked();
    var progressPct = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;
    var allDone = checkedItems >= totalItems;

    var html = '';

    // Progress header
    html +=
      '<div class="shop-progress">' +
        '<div class="shop-progress-text">' +
          '<span class="shop-progress-label">' +
            (allDone ? 'All done!' : 'Stop ' + (currentStopIndex + 1) + ' of ' + stops.length) +
          '</span>' +
          '<span class="shop-progress-count">' + checkedItems + '/' + totalItems + ' items</span>' +
        '</div>' +
        '<div class="progress-bar">' +
          '<div class="progress-fill" style="width:' + progressPct + '%"></div>' +
        '</div>' +
      '</div>';

    // Mini map
    if (storeData && route) {
      html +=
        '<div class="shop-minimap" id="shop-minimap" onclick="GroceryGPS.shoppingMode.toggleMapExpand()">' +
        '</div>';
    }

    // Stop pills (horizontal scroll)
    html += '<div class="shop-stop-pills">';
    stops.forEach(function (stop, index) {
      var unchecked = getUncheckedCount(stop);
      var isDone = unchecked === 0;
      var isCurrent = index === currentStopIndex;
      var isAisle = stop.type === 'aisle';

      var cls = 'shop-pill';
      if (isCurrent) cls += ' shop-pill--current';
      if (isDone) cls += ' shop-pill--done';

      var label = isAisle ? stop.aisleNumber : stop.label.substring(0, 3);

      html +=
        '<button class="' + cls + '" onclick="GroceryGPS.shoppingMode.goToStop(' + index + ')">' +
          (isDone
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><polyline points="20 6 9 17 4 12"/></svg>'
            : '<span>' + GroceryGPS.app.escapeHtml(String(label)) + '</span>') +
        '</button>';
    });
    html += '</div>';

    // Current stop card
    if (!allDone) {
      var stop = stops[currentStopIndex];
      if (stop) {
        html += renderStopCard(stop, currentStopIndex);
      }

      // Next stop preview
      if (currentStopIndex < stops.length - 1) {
        var nextStopData = stops[currentStopIndex + 1];
        var nextUnchecked = getUncheckedCount(nextStopData);
        var nextLabel = nextStopData.type === 'aisle'
          ? 'Aisle ' + nextStopData.aisleNumber
          : nextStopData.label;
        html +=
          '<div class="shop-next-preview" onclick="GroceryGPS.shoppingMode.nextStop()">' +
            '<span class="shop-next-label">Next: ' + GroceryGPS.app.escapeHtml(nextLabel) + '</span>' +
            '<span class="shop-next-count">' + nextUnchecked + ' item' + (nextUnchecked !== 1 ? 's' : '') + '</span>' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><polyline points="9 18 15 12 9 6"/></svg>' +
          '</div>';
      }

      // Skip stop button
      html +=
        '<button class="shop-skip-btn" onclick="GroceryGPS.shoppingMode.skipStop()">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px">' +
            '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>' +
          '</svg>' +
          'Skip This Stop' +
        '</button>';
    }

    container.innerHTML = html;

    // Render mini map after DOM is ready
    if (storeData && route) {
      setTimeout(function () {
        renderMiniMap();
      }, 0);
    }
  }

  function renderStopCard(stop, index) {
    var isAisle = stop.type === 'aisle';
    var label = isAisle ? 'Aisle ' + stop.aisleNumber : stop.label;
    var badgeContent = isAisle ? stop.aisleNumber : stop.label.substring(0, 2).toUpperCase();
    var badgeClass = isAisle ? 'shop-stop-badge--aisle' : 'shop-stop-badge--zone';

    var html =
      '<div class="shop-stop-card" id="shop-current-stop">' +
        '<div class="shop-stop-header">' +
          '<div class="shop-stop-badge ' + badgeClass + '">' + badgeContent + '</div>' +
          '<div class="shop-stop-info">' +
            '<div class="shop-stop-title">' + GroceryGPS.app.escapeHtml(label) + '</div>' +
            '<div class="shop-stop-subtitle">' + stop.items.length + ' item' + (stop.items.length !== 1 ? 's' : '') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="shop-item-list">';

    stop.items.forEach(function (si) {
      var listIdx = findItemInList(si.name);
      var isChecked = listIdx !== -1 && items[listIdx].checked;
      var checkedClass = isChecked ? ' shop-item--checked' : '';

      html +=
        '<div class="shop-item' + checkedClass + '" onclick="GroceryGPS.shoppingMode.toggleItem(' + index + ',\'' + escapeAttr(si.name) + '\')">' +
          '<div class="shop-item-check">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
              '<polyline points="20 6 9 17 4 12"/>' +
            '</svg>' +
          '</div>' +
          '<span class="shop-item-name">' + GroceryGPS.app.escapeHtml(si.name) + '</span>' +
        '</div>';
    });

    html += '</div></div>';
    return html;
  }

  function renderMiniMap() {
    var container = document.getElementById('shop-minimap');
    if (!container || !storeData || !route) return;

    // Create a modified route to highlight current stop
    var highlightRoute = Object.assign({}, route);
    highlightRoute.currentStopId = stops[currentStopIndex] ? stops[currentStopIndex].id : null;

    GroceryGPS.storeMap.render(container, storeData, highlightRoute);
  }

  function toggleMapExpand() {
    var el = document.getElementById('shop-minimap');
    if (el) el.classList.toggle('shop-minimap--expanded');
  }

  // =====================
  //  COMPLETION
  // =====================

  function showComplete() {
    var container = document.getElementById('shopping-content');
    if (!container) return;

    var totalItems = getTotalItems();

    container.innerHTML =
      '<div class="shop-complete">' +
        '<div class="shop-complete-icon">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>' +
            '<polyline points="22 4 12 14.01 9 11.01"/>' +
          '</svg>' +
        '</div>' +
        '<h2 class="shop-complete-title">All Done!</h2>' +
        '<p class="shop-complete-desc">' + totalItems + ' items grabbed across ' + stops.length + ' stops</p>' +
        '<button class="btn btn-primary mt-6" onclick="GroceryGPS.shoppingMode.finishShopping()">' +
          'Back to Home' +
        '</button>' +
      '</div>';
  }

  function finishShopping() {
    GroceryGPS.app.showScreen('home');
  }

  // =====================
  //  EMPTY STATE
  // =====================

  function showEmpty() {
    var container = document.getElementById('shopping-content');
    if (!container) return;

    container.innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-state-icon">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>' +
            '<path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>' +
          '</svg>' +
        '</div>' +
        '<div class="empty-state-title">No route loaded</div>' +
        '<div class="empty-state-desc">Go back and optimize your route first.</div>' +
        '<button class="btn btn-secondary mt-4" onclick="GroceryGPS.app.goBack()">Go Back</button>' +
      '</div>';
  }

  // =====================
  //  HELPERS
  // =====================

  function escapeAttr(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }

  // =====================
  //  LIFECYCLE
  // =====================

  document.addEventListener('screenchange', function (e) {
    if (e.detail.screen === 'shopping') {
      init();
    }
  });

  return {
    init: init,
    toggleItem: toggleItem,
    goToStop: goToStop,
    nextStop: nextStop,
    prevStop: prevStop,
    skipStop: skipStop,
    toggleMapExpand: toggleMapExpand,
    finishShopping: finishShopping
  };

})();
