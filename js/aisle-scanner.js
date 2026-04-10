/* ============================================
   aisle-scanner.js — Camera-based aisle scanner
   Uses OpenAI Vision (GPT-4o) to read aisle
   signs from photos. Falls back to manual entry
   if no API key is set.
   ============================================ */

var GroceryGPS = GroceryGPS || {};

GroceryGPS.aisleScanner = (function () {

  var stream = null;
  var targetAisleIndex = null;  // If scanning for a specific aisle in the editor
  var scannedCategories = [];
  var currentAisleNumber = null;
  var facingMode = 'environment';
  var isProcessing = false;

  // =====================
  //  CAMERA MANAGEMENT
  // =====================

  function openCamera() {
    var viewport = document.getElementById('camera-viewport');
    var placeholder = document.getElementById('camera-placeholder');
    var video = document.getElementById('camera-stream');
    var scanFrame = document.getElementById('scan-frame');
    var scanHint = document.getElementById('scan-hint');

    if (!video) return;

    var constraints = {
      video: {
        facingMode: facingMode,
        width: { ideal: 1280 },
        height: { ideal: 960 }
      }
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then(function (mediaStream) {
        stream = mediaStream;
        video.srcObject = stream;
        video.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
        if (scanFrame) scanFrame.style.display = 'block';
        if (scanHint) scanHint.style.display = 'block';
      })
      .catch(function (err) {
        console.error('Camera error:', err);
        if (err.name === 'NotAllowedError') {
          alert('Camera access was denied. Check your browser settings.');
        } else if (err.name === 'NotFoundError') {
          alert('No camera found on this device.');
        } else {
          // On desktop, show a friendly fallback
          if (placeholder) {
            placeholder.innerHTML =
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>' +
                '<circle cx="12" cy="13" r="4"/>' +
              '</svg>' +
              '<span>Camera not available</span>' +
              '<span style="font-size:0.75rem;opacity:0.6;">Use the gallery button to pick a photo</span>';
          }
        }
      });
  }

  function closeCamera() {
    if (stream) {
      stream.getTracks().forEach(function (track) { track.stop(); });
      stream = null;
    }

    var video = document.getElementById('camera-stream');
    var placeholder = document.getElementById('camera-placeholder');
    var scanFrame = document.getElementById('scan-frame');
    var scanHint = document.getElementById('scan-hint');

    if (video) { video.style.display = 'none'; video.srcObject = null; }
    if (placeholder) placeholder.style.display = '';
    if (scanFrame) scanFrame.style.display = 'none';
    if (scanHint) scanHint.style.display = 'none';
  }

  function switchCamera() {
    facingMode = facingMode === 'environment' ? 'user' : 'environment';
    if (stream) {
      closeCamera();
      setTimeout(openCamera, 200);
    }
  }


  // =====================
  //  CAPTURE & PROCESS
  // =====================

  function capture() {
    if (isProcessing) return;

    var video = document.getElementById('camera-stream');
    var canvas = document.getElementById('camera-canvas');

    if (!video || !canvas || !stream) {
      openCamera();
      return;
    }

    // Flash effect
    var viewport = document.getElementById('camera-viewport');
    if (viewport) {
      viewport.style.opacity = '0.5';
      setTimeout(function () { viewport.style.opacity = '1'; }, 150);
    }

    // Capture frame to canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    // Get the image as base64
    var imageData = canvas.toDataURL('image/jpeg', 0.8);

    // Check if we have an API key for AI scanning
    if (GroceryGPS.settings && GroceryGPS.settings.hasOpenAIKey()) {
      analyzeWithAI(imageData);
    } else {
      showManualCategoryEntry();
    }
  }

  function captureFromGallery(file) {
    if (isProcessing) return;

    var reader = new FileReader();
    reader.onload = function (e) {
      var imageData = e.target.result;

      if (GroceryGPS.settings && GroceryGPS.settings.hasOpenAIKey()) {
        analyzeWithAI(imageData);
      } else {
        showManualCategoryEntry();
      }
    };
    reader.readAsDataURL(file);
  }


  // =====================
  //  AI ANALYSIS
  // =====================

  function analyzeWithAI(imageDataUrl) {
    isProcessing = true;
    showProcessingState();

    var apiKey = GroceryGPS.settings.getOpenAIKey();

    // Build the request
    var requestBody = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a grocery store aisle sign reader. You analyze photos of aisle signs in grocery stores and extract the aisle number and product categories listed on the sign. Respond ONLY with valid JSON in this exact format: {"aisle_number": <number or null>, "categories": ["Category 1", "Category 2", ...]}. If you cannot determine the aisle number, set it to null. List each category exactly as shown on the sign. If the image is not an aisle sign, respond with: {"aisle_number": null, "categories": [], "error": "This does not appear to be a grocery store aisle sign."}'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'What aisle number and product categories are shown on this grocery store aisle sign? Return JSON only.'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 300,
      temperature: 0
    };

    // Make the API call
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
      isProcessing = false;

      // Parse the AI response
      var content = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : '';

      // Try to extract JSON from the response (handle markdown code blocks)
      var jsonStr = content;
      var jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      var parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        console.error('Failed to parse AI response:', content);
        hideProcessingState();
        showManualCategoryEntry('AI couldn\'t read the sign clearly. Enter categories manually:');
        return;
      }

      // Check for errors
      if (parsed.error) {
        hideProcessingState();
        showManualCategoryEntry(parsed.error + ' Enter categories manually:');
        return;
      }

      // Use AI results
      if (parsed.aisle_number !== null && parsed.aisle_number !== undefined) {
        currentAisleNumber = parsed.aisle_number;
      } else {
        // Fall back to auto-increment
        currentAisleNumber = getNextAisleNumber();
      }

      scannedCategories = parsed.categories || [];

      hideProcessingState();

      if (scannedCategories.length > 0) {
        showResult();
      } else {
        showManualCategoryEntry('No categories detected. Enter them manually:');
      }
    })
    .catch(function (err) {
      isProcessing = false;
      hideProcessingState();
      console.error('AI scan error:', err);

      // Check for common errors
      var msg = err.message || '';
      if (msg.indexOf('api_key') !== -1 || msg.indexOf('Incorrect API key') !== -1) {
        alert('Your OpenAI API key appears to be invalid. Check it in Settings.');
      } else if (msg.indexOf('quota') !== -1 || msg.indexOf('billing') !== -1) {
        alert('Your OpenAI account has no remaining credits. Check your billing at platform.openai.com.');
      } else {
        showManualCategoryEntry('AI scan failed: ' + msg + '. Enter categories manually:');
      }
    });
  }


  // =====================
  //  PROCESSING UI
  // =====================

  function showProcessingState() {
    var scanHint = document.getElementById('scan-hint');
    if (scanHint) {
      scanHint.innerHTML =
        '<div style="display:flex;align-items:center;gap:8px;">' +
          '<div class="scan-spinner"></div>' +
          '<span>Reading aisle sign...</span>' +
        '</div>';
      scanHint.style.display = 'block';
    }

    // Disable capture button
    var captureBtn = document.querySelector('.camera-shutter');
    if (captureBtn) captureBtn.style.opacity = '0.4';
  }

  function hideProcessingState() {
    var scanHint = document.getElementById('scan-hint');
    if (scanHint) {
      scanHint.innerHTML = 'Point at aisle sign and tap capture';
      scanHint.style.display = stream ? 'block' : 'none';
    }

    var captureBtn = document.querySelector('.camera-shutter');
    if (captureBtn) captureBtn.style.opacity = '1';
  }


  // =====================
  //  MANUAL FALLBACK
  // =====================

  function getNextAisleNumber() {
    if (targetAisleIndex !== null) {
      var editorAisles = GroceryGPS.storeEditor.getAisles();
      return editorAisles[targetAisleIndex] ? editorAisles[targetAisleIndex].number : (targetAisleIndex + 1);
    }

    // Auto-increment: find the last aisle number
    var storeId = GroceryGPS.storage.getActiveStoreId();
    var store = storeId ? GroceryGPS.storage.loadStore(storeId) : null;
    var existingAisles = store ? (store.aisles || []) : [];
    return existingAisles.length > 0
      ? Math.max.apply(null, existingAisles.map(function(a){return a.number;})) + 1
      : 1;
  }

  function showManualCategoryEntry(promptMsg) {
    if (!currentAisleNumber) {
      currentAisleNumber = getNextAisleNumber();
    }

    var msg = promptMsg || ('Aisle ' + currentAisleNumber + '\n\nWhat categories are on this aisle sign?\n(Comma-separated, e.g., "Pasta, Sauces, Rice")');

    var input = prompt(msg);

    if (input && input.trim()) {
      scannedCategories = input.split(',').map(function (c) { return c.trim(); }).filter(function (c) { return c; });

      // If no aisle number was set yet, ask
      if (!currentAisleNumber) {
        var numInput = prompt('What aisle number is this?');
        if (numInput && !isNaN(parseInt(numInput))) {
          currentAisleNumber = parseInt(numInput);
        } else {
          currentAisleNumber = getNextAisleNumber();
        }
      }

      showResult();
    }
  }


  // =====================
  //  RESULTS
  // =====================

  function showResult() {
    var resultEl = document.getElementById('scanner-result');
    var badgeEl = document.getElementById('scanned-aisle-num');
    var titleEl = document.getElementById('scanned-aisle-title');
    var catsEl = document.getElementById('scanned-categories');

    if (badgeEl) badgeEl.textContent = currentAisleNumber;
    if (titleEl) titleEl.textContent = 'Aisle ' + currentAisleNumber;

    if (catsEl) {
      var html = '';
      scannedCategories.forEach(function (cat, index) {
        html +=
          '<span class="category-chip" onclick="GroceryGPS.aisleScanner.removeCategory(' + index + ')">' +
            GroceryGPS.app.escapeHtml(cat) +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;opacity:0.5;">' +
              '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' +
            '</svg>' +
          '</span>';
      });
      catsEl.innerHTML = html;
    }

    if (resultEl) resultEl.classList.remove('hidden');
  }

  function removeCategory(index) {
    scannedCategories.splice(index, 1);
    showResult();
  }


  // =====================
  //  SAVE ACTIONS
  // =====================

  function saveAndNext() {
    saveCurrentScan();
    // Reset for next aisle
    scannedCategories = [];
    currentAisleNumber = null;
    targetAisleIndex = null;
    var resultEl = document.getElementById('scanner-result');
    if (resultEl) resultEl.classList.add('hidden');

    // Go back to camera
    if (!stream) {
      openCamera();
    }
  }

  function saveAndDone() {
    saveCurrentScan();
    close();
  }

  function saveCurrentScan() {
    if (scannedCategories.length === 0) return;

    if (targetAisleIndex !== null) {
      // Saving to a specific aisle in the editor
      GroceryGPS.storeEditor.updateAisleCategories(
        targetAisleIndex,
        scannedCategories.join(', ')
      );
    } else {
      // Add as a new aisle to the active store
      var storeId = GroceryGPS.storage.getActiveStoreId();
      var store = storeId ? GroceryGPS.storage.loadStore(storeId) : null;

      if (store) {
        store.aisles = store.aisles || [];

        // If an aisle with this number already exists, update it instead of duplicating.
        var existing = store.aisles.find(function (a) {
          return a.number === currentAisleNumber;
        });

        if (existing) {
          existing.categories = scannedCategories;
          existing.label = 'Aisle ' + currentAisleNumber;
        } else {
          store.aisles.push({
            id: 'aisle-' + currentAisleNumber,
            number: currentAisleNumber,
            label: 'Aisle ' + currentAisleNumber,
            categories: scannedCategories,
            gridRow: 0,
            gridCol: store.aisles.length
          });
        }

        store.layout = store.layout || {};
        store.layout.aisleCols = store.aisles.length;

        GroceryGPS.storage.saveStore(store);
      }
    }
  }


  // =====================
  //  GALLERY
  // =====================

  function openGallery() {
    var input = document.getElementById('gallery-input');
    if (input) input.click();
  }

  function handleGalleryPhoto(input) {
    if (!input.files || !input.files[0]) return;

    captureFromGallery(input.files[0]);
    input.value = '';
  }


  // =====================
  //  EXTERNAL ENTRY POINTS
  // =====================

  /**
   * Called from store editor to scan a specific aisle
   */
  function scanForAisle(aisleIndex) {
    targetAisleIndex = aisleIndex;
    GroceryGPS.app.showScreen('aisle-scanner');
  }

  /**
   * Close scanner and go back
   */
  function close() {
    closeCamera();
    targetAisleIndex = null;
    scannedCategories = [];
    isProcessing = false;

    var resultEl = document.getElementById('scanner-result');
    if (resultEl) resultEl.classList.add('hidden');

    GroceryGPS.app.goBack();
  }


  // =====================
  //  LIFECYCLE
  // =====================

  document.addEventListener('screenchange', function (e) {
    if (e.detail.screen === 'aisle-scanner') {
      // Auto-open camera when entering scanner screen
      setTimeout(openCamera, 300);
    } else {
      // Close camera when leaving scanner screen
      closeCamera();
    }
  });


  return {
    openCamera: openCamera,
    close: close,
    switchCamera: switchCamera,
    capture: capture,
    openGallery: openGallery,
    handleGalleryPhoto: handleGalleryPhoto,
    scanForAisle: scanForAisle,
    saveAndNext: saveAndNext,
    saveAndDone: saveAndDone,
    removeCategory: removeCategory
  };

})();
