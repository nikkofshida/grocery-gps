/* ============================================
   storage.js — localStorage wrapper
   Saves and loads store maps, grocery lists,
   and user corrections.
   ============================================ */

// Create the global namespace for the app
var GroceryGPS = GroceryGPS || {};

GroceryGPS.storage = (function () {

  // Keys used in localStorage
  var KEYS = {
    STORES: 'grocerygps_stores',       // Array of store objects
    LISTS: 'grocerygps_lists',         // Array of grocery list objects
    CORRECTIONS: 'grocerygps_corrections', // User's manual aisle corrections
    ACTIVE_STORE: 'grocerygps_active_store' // ID of the currently selected store
  };

  // --- Helper: read JSON from localStorage ---
  function readJSON(key) {
    try {
      var data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error reading from localStorage:', key, e);
      return null;
    }
  }

  // --- Helper: write JSON to localStorage ---
  function writeJSON(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Error writing to localStorage:', key, e);
      return false;
    }
  }

  // =====================
  //  STORE MAP functions
  // =====================

  // Get all saved stores
  function listStores() {
    return readJSON(KEYS.STORES) || [];
  }

  // Get a specific store by ID
  function loadStore(storeId) {
    var stores = listStores();
    return stores.find(function (s) { return s.id === storeId; }) || null;
  }

  // Save a store (creates or updates)
  function saveStore(storeData) {
    var stores = listStores();
    var existingIndex = stores.findIndex(function (s) { return s.id === storeData.id; });

    storeData.updatedAt = new Date().toISOString();

    if (existingIndex >= 0) {
      // Update existing store
      stores[existingIndex] = storeData;
    } else {
      // Add new store
      stores.push(storeData);
    }

    return writeJSON(KEYS.STORES, stores);
  }

  // Delete a store by ID
  function deleteStore(storeId) {
    var stores = listStores();
    var filtered = stores.filter(function (s) { return s.id !== storeId; });
    return writeJSON(KEYS.STORES, filtered);
  }

  // Get/set the active (currently selected) store
  function getActiveStoreId() {
    return localStorage.getItem(KEYS.ACTIVE_STORE) || null;
  }

  function setActiveStoreId(storeId) {
    localStorage.setItem(KEYS.ACTIVE_STORE, storeId);
  }

  // Export a store as a JSON string (for sharing)
  function exportStore(storeId) {
    var store = loadStore(storeId);
    if (!store) return null;
    return JSON.stringify(store, null, 2);
  }

  // Import a store from a JSON string
  function importStore(jsonString) {
    try {
      var store = JSON.parse(jsonString);
      if (!store.id || !store.name) {
        throw new Error('Invalid store data: missing id or name');
      }
      saveStore(store);
      return store;
    } catch (e) {
      console.error('Error importing store:', e);
      return null;
    }
  }

  // ========================
  //  GROCERY LIST functions
  // ========================

  // Get all saved lists
  function listLists() {
    return readJSON(KEYS.LISTS) || [];
  }

  // Get a specific list by ID
  function loadList(listId) {
    var lists = listLists();
    return lists.find(function (l) { return l.id === listId; }) || null;
  }

  // Save a list (creates or updates)
  function saveList(listData) {
    var lists = listLists();
    var existingIndex = lists.findIndex(function (l) { return l.id === listData.id; });

    listData.updatedAt = new Date().toISOString();

    if (existingIndex >= 0) {
      lists[existingIndex] = listData;
    } else {
      lists.push(listData);
    }

    return writeJSON(KEYS.LISTS, lists);
  }

  // Delete a list by ID
  function deleteList(listId) {
    var lists = listLists();
    var filtered = lists.filter(function (l) { return l.id !== listId; });
    return writeJSON(KEYS.LISTS, filtered);
  }

  // ==========================
  //  USER CORRECTIONS functions
  // ==========================

  // Get all corrections (item name → { category, stopId, count })
  function loadCorrections() {
    return readJSON(KEYS.CORRECTIONS) || {};
  }

  // Save a correction for an item
  function saveCorrection(itemName, category, stopId) {
    var corrections = loadCorrections();
    var key = itemName.toLowerCase().trim();

    if (corrections[key]) {
      corrections[key].category = category;
      corrections[key].stopId = stopId;
      corrections[key].count = (corrections[key].count || 0) + 1;
    } else {
      corrections[key] = {
        category: category,
        stopId: stopId,
        count: 1
      };
    }

    return writeJSON(KEYS.CORRECTIONS, corrections);
  }

  // ==========================
  //  UTILITY functions
  // ==========================

  // Generate a simple unique ID
  function generateId(prefix) {
    return (prefix || 'id') + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
  }

  // Return the public API
  return {
    listStores: listStores,
    loadStore: loadStore,
    saveStore: saveStore,
    deleteStore: deleteStore,
    getActiveStoreId: getActiveStoreId,
    setActiveStoreId: setActiveStoreId,
    exportStore: exportStore,
    importStore: importStore,
    listLists: listLists,
    loadList: loadList,
    saveList: saveList,
    deleteList: deleteList,
    loadCorrections: loadCorrections,
    saveCorrection: saveCorrection,
    generateId: generateId,
    set: function (key, value) {
      try { localStorage.setItem('ggps_' + key, JSON.stringify(value)); } catch (e) {}
    },
    get: function (key) {
      try { return JSON.parse(localStorage.getItem('ggps_' + key)); } catch (e) { return null; }
    }
  };

})();
