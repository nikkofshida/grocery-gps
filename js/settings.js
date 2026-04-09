/* ============================================
   settings.js — App settings & API key storage
   Keys are stored in localStorage only —
   they never leave your device except when
   making direct API calls.
   ============================================ */

var GroceryGPS = GroceryGPS || {};

GroceryGPS.settings = (function () {

  var KEYS = {
    OPENAI_KEY: 'grocerygps_openai_key'
  };

  function getOpenAIKey() {
    return localStorage.getItem(KEYS.OPENAI_KEY) || '';
  }

  function setOpenAIKey(key) {
    if (key && key.trim()) {
      localStorage.setItem(KEYS.OPENAI_KEY, key.trim());
    } else {
      localStorage.removeItem(KEYS.OPENAI_KEY);
    }
  }

  function hasOpenAIKey() {
    var key = getOpenAIKey();
    return key && key.startsWith('sk-');
  }

  // Render the settings screen content
  function renderSettings() {
    var keyInput = document.getElementById('settings-api-key');
    var statusEl = document.getElementById('settings-key-status');
    if (!keyInput) return;

    var currentKey = getOpenAIKey();
    if (currentKey) {
      // Show masked key
      keyInput.value = currentKey.substring(0, 7) + '...' + currentKey.substring(currentKey.length - 4);
      keyInput.dataset.masked = 'true';
    }

    updateKeyStatus();
  }

  function updateKeyStatus() {
    var statusEl = document.getElementById('settings-key-status');
    if (!statusEl) return;

    if (hasOpenAIKey()) {
      statusEl.innerHTML =
        '<span style="color:var(--clr-accent);font-weight:500;">Connected</span> — ' +
        'AI aisle scanning is enabled';
    } else {
      statusEl.innerHTML =
        '<span style="color:var(--clr-warning);font-weight:500;">Not set</span> — ' +
        'Add your key to enable AI features';
    }
  }

  function onKeyInputFocus(input) {
    // Clear the masked display so they can paste
    if (input.dataset.masked === 'true') {
      input.value = '';
      input.dataset.masked = 'false';
    }
  }

  function saveKey() {
    var input = document.getElementById('settings-api-key');
    if (!input) return;

    var value = input.value.trim();

    // Don't save the masked display
    if (input.dataset.masked === 'true') return;

    if (!value) {
      setOpenAIKey('');
      updateKeyStatus();
      alert('API key removed.');
      return;
    }

    if (!value.startsWith('sk-')) {
      alert('That doesn\'t look like an OpenAI key. It should start with "sk-".');
      return;
    }

    setOpenAIKey(value);
    updateKeyStatus();

    // Re-mask the display
    input.value = value.substring(0, 7) + '...' + value.substring(value.length - 4);
    input.dataset.masked = 'true';

    alert('API key saved! AI aisle scanning is now enabled.');
  }

  function removeKey() {
    if (!confirm('Remove your API key?')) return;
    setOpenAIKey('');
    var input = document.getElementById('settings-api-key');
    if (input) {
      input.value = '';
      input.dataset.masked = 'false';
    }
    updateKeyStatus();
  }

  // Listen for screen changes
  document.addEventListener('screenchange', function (e) {
    if (e.detail.screen === 'settings') {
      renderSettings();
    }
  });

  return {
    getOpenAIKey: getOpenAIKey,
    setOpenAIKey: setOpenAIKey,
    hasOpenAIKey: hasOpenAIKey,
    renderSettings: renderSettings,
    onKeyInputFocus: onKeyInputFocus,
    saveKey: saveKey,
    removeKey: removeKey
  };

})();
