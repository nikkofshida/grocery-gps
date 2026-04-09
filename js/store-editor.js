/* ============================================
   store-editor.js — Store map creation/editing
   Redesigned: visual diagram, minimal typing,
   camera-first aisle entry
   ============================================ */

var GroceryGPS = GroceryGPS || {};

GroceryGPS.storeEditor = (function () {
  var editingStoreId = null;
  var aisles = [];
  var zones = [];
  var entranceSide = null;
  var exitSide = null;
  var sideClickCount = 0;

  var DEFAULT_ZONES = [
    { name: 'Produce', side: 'east', categories: 'Fruits, Vegetables, Herbs, Salad' },
    { name: 'Deli', side: 'north', categories: 'Deli Meats, Prepared Foods, Rotisserie' },
    { name: 'Bakery', side: 'north', categories: 'Bread, Cakes, Donuts, Pastries' },
    { name: 'Meat & Seafood', side: 'west', categories: 'Beef, Chicken, Pork, Seafood' },
    { name: 'Dairy', side: 'west', categories: 'Milk, Cheese, Yogurt, Eggs, Butter' }
  ];

  function initNewStore() {
    editingStoreId = null;
    aisles = [];
    zones = DEFAULT_ZONES.map(function (z) {
      return { name: z.name, side: z.side, categories: z.categories };
    });
    entranceSide = null;
    exitSide = null;
    sideClickCount = 0;

    var nameInput = document.getElementById('store-name');
    var addressInput = document.getElementById('store-address');
    if (nameInput) nameInput.value = '';
    if (addressInput) addressInput.value = '';

    renderAisles();
    renderZones();
    renderLayoutDiagram();
    updateDeleteButton();
  }

  function loadStoreForEditing(storeId) {
    var store = GroceryGPS.storage.loadStore(storeId);
    if (!store) { initNewStore(); return; }

    editingStoreId = store.id;
    aisles = (store.aisles || []).map(function (a) {
      return { number: a.number, categories: (a.categories || []).join(', ') };
    });
    zones = (store.zones || []).map(function (z) {
      return { name: z.name, side: z.side, categories: (z.categories || []).join(', ') };
    });
    entranceSide = store.entrance ? store.entrance.side : null;
    exitSide = store.exit ? store.exit.side : null;
    sideClickCount = (entranceSide ? 1 : 0) + (exitSide ? 1 : 0);

    var nameInput = document.getElementById('store-name');
    var addressInput = document.getElementById('store-address');
    if (nameInput) nameInput.value = store.name || '';
    if (addressInput) addressInput.value = store.address || '';

    renderAisles();
    renderZones();
    renderLayoutDiagram();
    updateDeleteButton();
  }

  // --- Layout Diagram (visual entrance/exit selector) ---
  // Behavior: tap cycles a side through states: off → entrance → exit → both → off
  // Entrance and exit CAN be on the same side (common in real stores).
  function toggleSide(side) {
    var isEntrance = entranceSide === side;
    var isExit = exitSide === side;

    if (!isEntrance && !isExit) {
      // Off → Entrance
      if (!entranceSide) {
        entranceSide = side;
      } else if (!exitSide) {
        exitSide = side;
      } else {
        // Both already assigned elsewhere — move entrance here
        entranceSide = side;
      }
    } else if (isEntrance && !isExit) {
      // Entrance only → also Exit (both on same side)
      exitSide = side;
    } else if (isEntrance && isExit) {
      // Both → Exit only
      entranceSide = null;
    } else if (!isEntrance && isExit) {
      // Exit only → Off
      exitSide = null;
    }

    renderLayoutDiagram();
  }

  function renderLayoutDiagram() {
    var sides = ['north', 'east', 'south', 'west'];
    sides.forEach(function (side) {
      var btn = document.getElementById('side-' + side);
      if (!btn) return;
      btn.className = 'layout-side-btn layout-side-btn--' +
        (side === 'north' ? 'top' : side === 'south' ? 'bottom' : side);

      var isEntrance = side === entranceSide;
      var isExit = side === exitSide;

      if (isEntrance && isExit) {
        btn.classList.add('entrance');
        btn.classList.add('exit');
        btn.textContent = 'IN/OUT';
      } else if (isEntrance) {
        btn.classList.add('entrance');
        btn.textContent = 'IN';
      } else if (isExit) {
        btn.classList.add('exit');
        btn.textContent = 'OUT';
      } else {
        btn.textContent = side.charAt(0).toUpperCase();
      }
    });

    // Update hint text below diagram
    var hint = document.getElementById('layout-hint');
    if (hint) {
      if (!entranceSide && !exitSide) {
        hint.textContent = 'Tap a side to set entrance, tap again for exit';
      } else if (entranceSide && !exitSide) {
        hint.textContent = 'Now tap where you exit (can be same side)';
      } else if (entranceSide === exitSide) {
        hint.textContent = 'Entrance and exit are both on ' + entranceSide;
      } else {
        hint.textContent = 'Enter ' + entranceSide + ', exit ' + exitSide;
      }
    }
  }

  // --- Aisle rendering (compact rows with chips) ---
  function renderAisles() {
    var container = document.getElementById('aisle-list');
    if (!container) return;

    if (aisles.length === 0) {
      container.innerHTML = '<p class="text-sm text-muted text-center" style="padding:16px 0;">No aisles yet — scan or add manually</p>';
      return;
    }

    var html = '';
    aisles.forEach(function (aisle, index) {
      var cats = aisle.categories.split(',').map(function(c){return c.trim();}).filter(function(c){return c;});
      var chipsHtml = cats.map(function(c) {
        return '<span class="category-chip">' + GroceryGPS.app.escapeHtml(c) + '</span>';
      }).join('');
      if (!chipsHtml) chipsHtml = '<span class="text-xs text-muted">Tap camera to scan</span>';

      html +=
        '<div class="aisle-row">' +
          '<div class="aisle-badge">' + aisle.number + '</div>' +
          '<div class="aisle-categories">' + chipsHtml + '</div>' +
          '<button class="aisle-photo-btn" onclick="GroceryGPS.aisleScanner.scanForAisle(' + index + ')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>' +
              '<circle cx="12" cy="13" r="4"/>' +
            '</svg>' +
          '</button>' +
          '<button class="aisle-remove" onclick="GroceryGPS.storeEditor.removeAisle(' + index + ')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' +
            '</svg>' +
          '</button>' +
        '</div>';
    });
    container.innerHTML = html;
  }

  // --- Zone rendering ---
  function renderZones() {
    var container = document.getElementById('zone-list');
    if (!container) return;

    if (zones.length === 0) {
      container.innerHTML = '<p class="text-sm text-muted text-center" style="padding:16px 0;">No zones yet</p>';
      return;
    }

    var html = '';
    zones.forEach(function (zone, index) {
      var initials = zone.name ? zone.name.substring(0, 2).toUpperCase() : '??';
      html +=
        '<div class="zone-row">' +
          '<div class="zone-badge">' + initials + '</div>' +
          '<div class="zone-name">' + GroceryGPS.app.escapeHtml(zone.name || 'Unnamed') + '</div>' +
          '<div class="zone-side-badge">' + (zone.side || '?') + '</div>' +
          '<button class="aisle-remove" onclick="GroceryGPS.storeEditor.removeZone(' + index + ')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' +
            '</svg>' +
          '</button>' +
        '</div>';
    });
    container.innerHTML = html;
  }

  function addAisle() {
    var nextNum = aisles.length > 0
      ? Math.max.apply(null, aisles.map(function(a){return a.number;})) + 1 : 1;
    aisles.push({ number: nextNum, categories: '' });
    renderAisles();
  }

  function removeAisle(index) { aisles.splice(index, 1); renderAisles(); }

  function updateAisleCategories(index, categories) {
    if (aisles[index]) aisles[index].categories = categories;
    renderAisles();
  }

  function addZone() {
    zones.push({ name: '', side: 'north', categories: '' });
    renderZones();
  }

  function removeZone(index) { zones.splice(index, 1); renderZones(); }

  function saveStore() {
    var nameInput = document.getElementById('store-name');
    var addressInput = document.getElementById('store-address');
    var name = nameInput ? nameInput.value.trim() : '';
    if (!name) { alert('Please enter a store name'); return; }

    var storeData = {
      id: editingStoreId || GroceryGPS.storage.generateId('store'),
      name: name,
      address: addressInput ? addressInput.value.trim() : '',
      entrance: { side: entranceSide || 'south', position: 0.2 },
      exit: { side: exitSide || 'south', position: 0.8 },
      aisles: aisles.map(function (a, index) {
        var cats = a.categories.split(',').map(function(c){return c.trim();}).filter(function(c){return c;});
        return { id: 'aisle-' + a.number, number: a.number, label: 'Aisle ' + a.number,
          categories: cats, gridRow: 0, gridCol: index };
      }),
      zones: zones.map(function (z) {
        var cats = z.categories.split(',').map(function(c){return c.trim();}).filter(function(c){return c;});
        var zoneId = 'zone-' + (z.name || 'unnamed').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return { id: zoneId, name: z.name, side: z.side, position: 0, span: 0.5, categories: cats };
      }),
      layout: { aisleRows: 1, aisleCols: aisles.length, orientation: 'horizontal' }
    };

    // Space zones evenly per side
    var sideGroups = {};
    storeData.zones.forEach(function (z) {
      if (!sideGroups[z.side]) sideGroups[z.side] = [];
      sideGroups[z.side].push(z);
    });
    Object.keys(sideGroups).forEach(function (side) {
      var group = sideGroups[side];
      var span = 1.0 / group.length;
      group.forEach(function (z, i) { z.position = i * span; z.span = span; });
    });

    GroceryGPS.storage.saveStore(storeData);
    GroceryGPS.storage.setActiveStoreId(storeData.id);
    GroceryGPS.app.goBack();
  }

  function deleteCurrentStore() {
    if (!editingStoreId) return;
    if (confirm('Delete this store map?')) {
      GroceryGPS.storage.deleteStore(editingStoreId);
      editingStoreId = null;
      GroceryGPS.app.showScreen('home');
    }
  }

  function updateDeleteButton() {
    var btn = document.getElementById('delete-store-btn');
    if (btn) btn.style.display = editingStoreId ? '' : 'none';
  }

  function importStoreFromFile() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (event) {
        var store = GroceryGPS.storage.importStore(event.target.result);
        if (store) {
          alert('Store "' + store.name + '" imported!');
          GroceryGPS.app.renderHomeScreen();
        } else {
          alert('Could not import store.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function exportCurrentStore() {
    if (!editingStoreId) return;
    var json = GroceryGPS.storage.exportStore(editingStoreId);
    if (!json) return;
    var store = GroceryGPS.storage.loadStore(editingStoreId);
    var filename = (store.name || 'store').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.json';
    if (navigator.share) {
      var file = new File([json], filename, { type: 'application/json' });
      navigator.share({ title: store.name + ' — GroceryGPS', files: [file] })
        .catch(function () { downloadJSON(json, filename); });
    } else { downloadJSON(json, filename); }
  }

  function downloadJSON(json, filename) {
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  // Listen for screen changes
  document.addEventListener('screenchange', function (e) {
    if (e.detail.screen === 'store-editor' && !editingStoreId) initNewStore();
  });

  return {
    initNewStore: initNewStore,
    loadStoreForEditing: loadStoreForEditing,
    toggleSide: toggleSide,
    addAisle: addAisle,
    removeAisle: removeAisle,
    updateAisleCategories: updateAisleCategories,
    addZone: addZone,
    removeZone: removeZone,
    saveStore: saveStore,
    deleteCurrentStore: deleteCurrentStore,
    importStoreFromFile: importStoreFromFile,
    exportCurrentStore: exportCurrentStore,
    renderAisles: renderAisles,
    renderZones: renderZones,
    getAisles: function() { return aisles; },
    getZones: function() { return zones; }
  };
})();
