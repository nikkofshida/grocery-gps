/* ============================================
   list-input.js — Multi-modal grocery list input
   Supports: type, voice, photo, paste
   ============================================ */

var GroceryGPS = GroceryGPS || {};

GroceryGPS.listInput = (function () {

  var currentItems = [];
  var currentListId = null;
  var activeMethod = 'type';
  var isRecording = false;
  var recognition = null;
  var pendingAisleItemIndex = null;

  // =====================
  //  INIT / LIFECYCLE
  // =====================

  function init() {
    loadCurrentList();
    renderList();
    updateActionBar();
  }

  function loadCurrentList() {
    var storeId = GroceryGPS.storage.getActiveStoreId();
    if (!storeId) return;

    var lists = GroceryGPS.storage.listLists();
    // Find most recent list for this store
    var storeList = lists.find(function (l) { return l.storeId === storeId; });
    if (storeList) {
      currentListId = storeList.id;
      currentItems = storeList.items || [];
    } else {
      currentListId = GroceryGPS.storage.generateId('list');
      currentItems = [];
    }
  }

  function saveCurrentList() {
    var storeId = GroceryGPS.storage.getActiveStoreId();
    if (!storeId) return;
    GroceryGPS.storage.saveList({
      id: currentListId,
      storeId: storeId,
      items: currentItems,
      createdAt: new Date().toISOString()
    });
  }

  // =====================
  //  INPUT METHODS
  // =====================

  function setMethod(method) {
    activeMethod = method;

    // Toggle active state on buttons
    ['type', 'voice', 'photo'].forEach(function (m) {
      var btn = document.getElementById('method-' + m);
      if (btn) btn.classList.toggle('active', m === method);

      var area = document.getElementById('input-area-' + m);
      if (area) {
        if (m === method) area.classList.remove('hidden');
        else area.classList.add('hidden');
      }
    });

    // Stop voice recording if switching away
    if (method !== 'voice' && isRecording) {
      stopVoice();
    }
  }

  // =====================
  //  TYPE INPUT
  // =====================

  function addItem() {
    var input = document.getElementById('item-input');
    if (!input) return;
    var value = input.value.trim();
    if (!value) return;

    addItemByName(value);
    input.value = '';
    input.focus();
  }

  function addItemByName(name) {
    if (!name || !name.trim()) return;
    name = name.trim();

    // Don't add duplicates
    var existing = currentItems.find(function (item) {
      return item.name.toLowerCase() === name.toLowerCase();
    });
    if (existing) return;

    // Match against category engine
    var storeId = GroceryGPS.storage.getActiveStoreId();
    var storeData = storeId ? GroceryGPS.storage.loadStore(storeId) : null;
    var match = GroceryGPS.categories.matchItem(name, storeData);

    var item = {
      id: GroceryGPS.storage.generateId('item'),
      name: name,
      category: match.category,
      stopId: match.stopId,
      stopLabel: match.stopLabel,
      stopType: match.stopType,
      confidence: match.confidence,
      matched: match.matched,
      checked: false
    };

    currentItems.push(item);
    saveCurrentList();
    renderList();
    updateActionBar();
  }

  function removeItem(index) {
    currentItems.splice(index, 1);
    saveCurrentList();
    renderList();
    updateActionBar();
  }

  function toggleItemCheck(index) {
    if (currentItems[index]) {
      currentItems[index].checked = !currentItems[index].checked;
      saveCurrentList();
      renderList();
    }
  }

  function clearList() {
    if (currentItems.length === 0) return;
    if (!confirm('Clear all items?')) return;
    currentItems = [];
    saveCurrentList();
    renderList();
    updateActionBar();
  }

  // =====================
  //  PASTE INPUT
  // =====================

  function showPasteSheet() {
    var overlay = document.getElementById('paste-overlay');
    var sheet = document.getElementById('paste-sheet');
    if (overlay) overlay.classList.add('active');
    if (sheet) sheet.classList.add('active');

    var textarea = document.getElementById('paste-textarea');
    if (textarea) {
      textarea.value = '';
      setTimeout(function () { textarea.focus(); }, 350);
    }
  }

  function hidePasteSheet() {
    var overlay = document.getElementById('paste-overlay');
    var sheet = document.getElementById('paste-sheet');
    if (overlay) overlay.classList.remove('active');
    if (sheet) sheet.classList.remove('active');
  }

  function addPastedItems() {
    var textarea = document.getElementById('paste-textarea');
    if (!textarea) return;

    var text = textarea.value;
    var lines = text.split('\n')
      .map(function (line) { return line.trim(); })
      .filter(function (line) { return line.length > 0; });

    lines.forEach(function (line) {
      // Handle "- item" or "• item" or "* item" prefixes
      var cleaned = line.replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
      if (cleaned) addItemByName(cleaned);
    });

    hidePasteSheet();
  }

  // =====================
  //  VOICE INPUT
  // =====================

  function toggleVoice() {
    if (isRecording) {
      stopVoice();
    } else {
      startVoice();
    }
  }

  function startVoice() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Try using Safari on iPhone.');
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = function (event) {
      var transcript = '';
      for (var i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }

      if (transcript) {
        // Split on commas, "and", periods
        var items = transcript
          .split(/,|\.|\band\b/i)
          .map(function (s) { return s.trim(); })
          .filter(function (s) { return s.length > 1; });

        items.forEach(function (item) {
          addItemByName(item);
        });
      }
    };

    recognition.onerror = function (event) {
      console.error('Speech recognition error:', event.error);
      stopVoice();
      if (event.error === 'not-allowed') {
        alert('Microphone access was denied. Check your browser settings.');
      }
    };

    recognition.onend = function () {
      // Auto-restart if still in recording mode
      if (isRecording) {
        try { recognition.start(); } catch (e) { stopVoice(); }
      }
    };

    try {
      recognition.start();
      isRecording = true;
      updateVoiceUI();
    } catch (e) {
      alert('Could not start voice recognition.');
    }
  }

  function stopVoice() {
    isRecording = false;
    if (recognition) {
      try { recognition.stop(); } catch (e) {}
      recognition = null;
    }
    updateVoiceUI();
  }

  function updateVoiceUI() {
    var btn = document.getElementById('voice-record-btn');
    var hint = document.getElementById('voice-hint');
    if (btn) btn.classList.toggle('recording', isRecording);
    if (hint) hint.textContent = isRecording
      ? 'Listening... say your items'
      : 'Tap to start — say your items';
  }

  // =====================
  //  PHOTO INPUT (stub)
  // =====================

  function captureListPhoto() {
    var input = document.getElementById('list-photo-input');
    if (input) input.click();
  }

  function handleListPhoto(input) {
    if (!input.files || !input.files[0]) return;

    // Check for API key
    if (!GroceryGPS.settings || !GroceryGPS.settings.hasOpenAIKey()) {
      alert('Add your OpenAI API key in Settings to enable AI list reading.');
      input.value = '';
      return;
    }

    var file = input.files[0];
    var reader = new FileReader();
    reader.onload = function (e) {
      analyzeListPhoto(e.target.result);
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  function analyzeListPhoto(imageDataUrl) {
    // Show loading state on the photo button area
    var hint = document.querySelector('#input-area-photo .voice-hint');
    var originalHint = hint ? hint.textContent : '';
    if (hint) hint.textContent = 'Reading your list...';

    var apiKey = GroceryGPS.settings.getOpenAIKey();

    var requestBody = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You extract grocery items from a photo of a shopping list. The list may be handwritten, typed, from a notes app, or from an iOS Reminders screenshot. Respond ONLY with valid JSON in this exact format: {"items": ["item 1", "item 2", ...]}. Extract each grocery item as a short, clean name (e.g., "milk" not "- 1 gallon whole milk"). Remove quantities, checkboxes, bullets, and formatting. If you cannot read the list, respond with: {"items": [], "error": "Could not read the list."}.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract all grocery items from this list. Return JSON only.' },
            { type: 'image_url', image_url: { url: imageDataUrl, detail: 'high' } }
          ]
        }
      ],
      max_tokens: 600,
      temperature: 0
    };

    fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify(requestBody)
    })
    .then(function (response) {
      if (!response.ok) {
        return response.json().then(function (err) {
          throw new Error(err.error ? err.error.message : 'API request failed (' + response.status + ')');
        });
      }
      return response.json();
    })
    .then(function (data) {
      if (hint) hint.textContent = originalHint;

      var content = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : '';

      // Strip markdown code blocks if present
      var jsonStr = content;
      var jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();

      var parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        alert('AI couldn\'t parse the list. Try a clearer photo or use Paste.');
        return;
      }

      if (parsed.error || !parsed.items || parsed.items.length === 0) {
        alert(parsed.error || 'No items found in the photo. Try a clearer shot.');
        return;
      }

      // Add each item
      var added = 0;
      parsed.items.forEach(function (name) {
        var before = currentItems.length;
        addItemByName(name);
        if (currentItems.length > before) added++;
      });

      alert('Added ' + added + ' item' + (added !== 1 ? 's' : '') + ' from your photo!');
    })
    .catch(function (err) {
      if (hint) hint.textContent = originalHint;
      console.error('List photo error:', err);
      var msg = err.message || '';
      if (msg.indexOf('api_key') !== -1 || msg.indexOf('Incorrect API key') !== -1) {
        alert('Your OpenAI API key appears to be invalid. Check it in Settings.');
      } else if (msg.indexOf('quota') !== -1 || msg.indexOf('billing') !== -1) {
        alert('Your OpenAI account has no remaining credits.');
      } else {
        alert('Photo scan failed: ' + msg);
      }
    });
  }

  // =====================
  //  AISLE PICKER
  // =====================

  function showAislePicker(itemIndex) {
    pendingAisleItemIndex = itemIndex;
    var item = currentItems[itemIndex];
    if (!item) return;

    var overlay = document.getElementById('aisle-picker-overlay');
    var sheet = document.getElementById('aisle-picker-sheet');
    var nameEl = document.getElementById('aisle-picker-item-name');
    var optionsEl = document.getElementById('aisle-picker-options');

    if (nameEl) nameEl.textContent = 'Where do you find "' + item.name + '"?';

    // Get all stops for the active store
    var storeId = GroceryGPS.storage.getActiveStoreId();
    var storeData = storeId ? GroceryGPS.storage.loadStore(storeId) : null;
    var stops = GroceryGPS.categories.getStoreStops(storeData);

    var html = '';
    stops.forEach(function (stop) {
      var icon = stop.type === 'aisle'
        ? '<div class="aisle-badge" style="width:32px;height:32px;font-size:0.75rem;">' + stop.number + '</div>'
        : '<div class="zone-badge" style="width:32px;height:32px;font-size:0.6rem;">' + stop.label.substring(0, 2).toUpperCase() + '</div>';

      html +=
        '<div class="store-result" onclick="GroceryGPS.listInput.assignAisle(\'' + stop.id + '\',\'' +
          GroceryGPS.app.escapeHtml(stop.label) + '\',\'' + stop.type + '\')" style="margin-bottom:8px;">' +
          icon +
          '<div class="store-result-info">' +
            '<div class="store-result-name">' + GroceryGPS.app.escapeHtml(stop.label) + '</div>' +
            '<div class="store-result-address">' +
              (stop.categories.length > 0 ? stop.categories.slice(0, 4).join(', ') : '') +
            '</div>' +
          '</div>' +
        '</div>';
    });

    // Add "Don't know" option
    html +=
      '<div class="store-result" onclick="GroceryGPS.listInput.assignAisle(null,\'Unknown\',null)" style="margin-bottom:8px;">' +
        '<div class="zone-badge" style="width:32px;height:32px;font-size:0.6rem;background:var(--clr-text-muted);">?</div>' +
        '<div class="store-result-info">' +
          '<div class="store-result-name" style="color:var(--clr-text-muted);">Don\'t know — skip for now</div>' +
        '</div>' +
      '</div>';

    if (optionsEl) optionsEl.innerHTML = html;
    if (overlay) overlay.classList.add('active');
    if (sheet) sheet.classList.add('active');
  }

  function hideAislePicker() {
    var overlay = document.getElementById('aisle-picker-overlay');
    var sheet = document.getElementById('aisle-picker-sheet');
    if (overlay) overlay.classList.remove('active');
    if (sheet) sheet.classList.remove('active');
    pendingAisleItemIndex = null;
  }

  function assignAisle(stopId, stopLabel, stopType) {
    if (pendingAisleItemIndex === null) return;
    var item = currentItems[pendingAisleItemIndex];
    if (!item) return;

    item.stopId = stopId;
    item.stopLabel = stopLabel;
    item.stopType = stopType;
    item.matched = !!stopId;
    item.confidence = stopId ? 1.0 : 0;

    // Save user correction for learning
    if (stopId && item.category) {
      GroceryGPS.storage.saveCorrection(item.name, item.category, stopId);
    }

    saveCurrentList();
    renderList();
    hideAislePicker();
  }

  // =====================
  //  LIST RENDERING
  // =====================

  function renderList() {
    var container = document.getElementById('grocery-list');
    var countEl = document.getElementById('list-count');
    var clearBtn = document.getElementById('list-clear-btn');

    if (countEl) {
      countEl.textContent = currentItems.length + ' item' + (currentItems.length !== 1 ? 's' : '');
    }
    if (clearBtn) {
      clearBtn.style.display = currentItems.length > 0 ? '' : 'none';
    }

    if (!container) return;

    if (currentItems.length === 0) {
      container.innerHTML =
        '<div class="empty-state" style="padding:24px 0;">' +
          '<div class="empty-state-icon" style="width:56px;height:56px;">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px;">' +
              '<path d="M9 5H2v7l6.29 6.29a1 1 0 001.42 0l5.58-5.58a1 1 0 000-1.42L9 5z"/><path d="M6 9.01V9"/>' +
            '</svg>' +
          '</div>' +
          '<div class="empty-state-title" style="font-size:0.95rem;">No items yet</div>' +
          '<div class="empty-state-desc" style="font-size:0.8rem;">Type, speak, or paste your grocery list above</div>' +
        '</div>';
      return;
    }

    // Sort: unmatched first (need attention), then by aisle, checked last
    var sorted = currentItems.slice().sort(function (a, b) {
      if (a.checked !== b.checked) return a.checked ? 1 : -1;
      if (a.matched !== b.matched) return a.matched ? 1 : -1;
      return 0;
    });

    var html = '';
    sorted.forEach(function (item) {
      // Find original index for actions
      var origIndex = currentItems.indexOf(item);
      var checkedClass = item.checked ? ' checked' : '';

      var locationLabel = '';
      if (item.matched && item.stopLabel) {
        locationLabel = '<span class="list-item-location">' + GroceryGPS.app.escapeHtml(item.stopLabel) + '</span>';
      } else if (!item.matched) {
        locationLabel = '<span class="list-item-location list-item-location--unmatched" onclick="event.stopPropagation();GroceryGPS.listInput.showAislePicker(' + origIndex + ')">Tap to assign aisle →</span>';
      }

      html +=
        '<div class="list-item' + checkedClass + '" onclick="GroceryGPS.listInput.toggleItemCheck(' + origIndex + ')">' +
          '<div class="list-item-check">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
              '<polyline points="20 6 9 17 4 12"/>' +
            '</svg>' +
          '</div>' +
          '<div class="list-item-content">' +
            '<div class="list-item-name">' + GroceryGPS.app.escapeHtml(item.name) + '</div>' +
            locationLabel +
          '</div>' +
          '<button class="list-item-delete" onclick="event.stopPropagation();GroceryGPS.listInput.removeItem(' + origIndex + ')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' +
            '</svg>' +
          '</button>' +
        '</div>';
    });

    container.innerHTML = html;
  }

  function updateActionBar() {
    var bar = document.getElementById('list-action-bar');
    var routeBtn = document.getElementById('list-route-btn');
    var hasItems = currentItems.length > 0;

    if (bar) {
      if (hasItems) bar.classList.remove('hidden');
      else bar.classList.add('hidden');
    }
    if (routeBtn) {
      routeBtn.style.display = hasItems ? '' : 'none';
    }
  }

  // =====================
  //  SCREEN CHANGE HOOK
  // =====================

  document.addEventListener('screenchange', function (e) {
    if (e.detail.screen === 'list-input') {
      init();
    }
    // Stop voice when leaving
    if (e.detail.screen !== 'list-input' && isRecording) {
      stopVoice();
    }
  });

  return {
    init: init,
    setMethod: setMethod,
    addItem: addItem,
    addItemByName: addItemByName,
    removeItem: removeItem,
    toggleItemCheck: toggleItemCheck,
    clearList: clearList,
    showPasteSheet: showPasteSheet,
    hidePasteSheet: hidePasteSheet,
    addPastedItems: addPastedItems,
    toggleVoice: toggleVoice,
    captureListPhoto: captureListPhoto,
    handleListPhoto: handleListPhoto,
    showAislePicker: showAislePicker,
    hideAislePicker: hideAislePicker,
    assignAisle: assignAisle,
    getItems: function () { return currentItems; }
  };

})();
