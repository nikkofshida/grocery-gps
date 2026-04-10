/* ============================================
   store-map.js — SVG bird's-eye store map
   Renders the store layout with:
   - Aisles as vertical bars in the center
   - Zones along the perimeter walls
   - Entrance/exit markers
   - Animated route path
   - Stop markers with numbers
   ============================================ */

var GroceryGPS = GroceryGPS || {};

GroceryGPS.storeMap = (function () {

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var MAP_W = 360;
  var MAP_H = 420;
  var PAD = 16;
  var STORE_X = PAD + 24;
  var STORE_Y = PAD + 24;
  var STORE_W = MAP_W - PAD * 2 - 48;
  var STORE_H = MAP_H - PAD * 2 - 48;

  /**
   * Render the store map SVG into the given container element.
   * @param {HTMLElement} container — element to render into
   * @param {Object} storeData — the store object from storage
   * @param {Object} routeResult — output from router.buildRoute()
   */
  function render(container, storeData, routeResult) {
    if (!container) return;
    container.innerHTML = '';

    var svg = createSVG();

    // Background
    drawBackground(svg);

    // Store outline
    drawStoreOutline(svg);

    // Perimeter zones
    drawZones(svg, storeData);

    // Center aisles
    drawAisles(svg, storeData);

    // Entrance & exit
    drawEntranceExit(svg, storeData);

    // Route path (if we have one)
    if (routeResult && routeResult.stops && routeResult.stops.length > 1) {
      drawRoutePath(svg, routeResult);
      drawStopMarkers(svg, routeResult);
    }

    container.appendChild(svg);
  }


  // ==========================================
  //  SVG CREATION
  // ==========================================

  function createSVG() {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + MAP_W + ' ' + MAP_H);
    svg.setAttribute('width', '100%');
    svg.style.maxWidth = MAP_W + 'px';
    svg.style.display = 'block';
    svg.style.borderRadius = 'var(--r-xl)';
    svg.style.overflow = 'hidden';

    // Defs for markers, gradients, filters
    var defs = document.createElementNS(SVG_NS, 'defs');

    // Glow filter for route
    var filter = document.createElementNS(SVG_NS, 'filter');
    filter.setAttribute('id', 'routeGlow');
    filter.setAttribute('x', '-20%');
    filter.setAttribute('y', '-20%');
    filter.setAttribute('width', '140%');
    filter.setAttribute('height', '140%');
    var blur = document.createElementNS(SVG_NS, 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '3');
    blur.setAttribute('result', 'glow');
    var merge = document.createElementNS(SVG_NS, 'feMerge');
    var mergeNode1 = document.createElementNS(SVG_NS, 'feMergeNode');
    mergeNode1.setAttribute('in', 'glow');
    var mergeNode2 = document.createElementNS(SVG_NS, 'feMergeNode');
    mergeNode2.setAttribute('in', 'SourceGraphic');
    merge.appendChild(mergeNode1);
    merge.appendChild(mergeNode2);
    filter.appendChild(blur);
    filter.appendChild(merge);
    defs.appendChild(filter);

    // Arrow marker for route direction
    var marker = document.createElementNS(SVG_NS, 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '8');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('refX', '8');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');
    var arrow = document.createElementNS(SVG_NS, 'polygon');
    arrow.setAttribute('points', '0 0, 8 3, 0 6');
    arrow.setAttribute('fill', '#16a34a');
    marker.appendChild(arrow);
    defs.appendChild(marker);

    svg.appendChild(defs);
    return svg;
  }


  // ==========================================
  //  BACKGROUND
  // ==========================================

  function drawBackground(svg) {
    var rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('width', MAP_W);
    rect.setAttribute('height', MAP_H);
    rect.setAttribute('fill', '#f8f7f4');
    rect.setAttribute('rx', '16');
    svg.appendChild(rect);

    // Grid pattern for cartographic feel
    for (var x = STORE_X; x <= STORE_X + STORE_W; x += 20) {
      var line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', x);
      line.setAttribute('y1', STORE_Y);
      line.setAttribute('x2', x);
      line.setAttribute('y2', STORE_Y + STORE_H);
      line.setAttribute('stroke', '#e8e5e0');
      line.setAttribute('stroke-width', '0.5');
      svg.appendChild(line);
    }
    for (var y = STORE_Y; y <= STORE_Y + STORE_H; y += 20) {
      var hline = document.createElementNS(SVG_NS, 'line');
      hline.setAttribute('x1', STORE_X);
      hline.setAttribute('y1', y);
      hline.setAttribute('x2', STORE_X + STORE_W);
      hline.setAttribute('y2', y);
      hline.setAttribute('stroke', '#e8e5e0');
      hline.setAttribute('stroke-width', '0.5');
      svg.appendChild(hline);
    }
  }


  // ==========================================
  //  STORE OUTLINE
  // ==========================================

  function drawStoreOutline(svg) {
    var rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', STORE_X);
    rect.setAttribute('y', STORE_Y);
    rect.setAttribute('width', STORE_W);
    rect.setAttribute('height', STORE_H);
    rect.setAttribute('fill', 'none');
    rect.setAttribute('stroke', '#d4d0cb');
    rect.setAttribute('stroke-width', '2');
    rect.setAttribute('rx', '6');
    svg.appendChild(rect);
  }


  // ==========================================
  //  ZONES (perimeter)
  // ==========================================

  function drawZones(svg, storeData) {
    var zones = storeData.zones || [];
    if (zones.length === 0) return;

    var colors = {
      'Produce': '#22c55e',
      'Deli': '#f59e0b',
      'Bakery': '#f97316',
      'Meat & Seafood': '#ef4444',
      'Dairy': '#3b82f6',
      'Frozen': '#8b5cf6'
    };

    // Auto-distribute zones evenly along each side so they never overlap.
    var bySide = {};
    zones.forEach(function (z) {
      if (!bySide[z.side]) bySide[z.side] = [];
      bySide[z.side].push(z);
    });
    Object.keys(bySide).forEach(function (side) {
      var group = bySide[side];
      var span = 1.0 / group.length;
      group.forEach(function (z, i) {
        z._renderPos = i * span;
        z._renderSpan = span;
      });
    });

    zones.forEach(function (zone) {
      var color = colors[zone.name] || '#94a3b8';
      var pos = getZoneRect({
        side: zone.side,
        position: zone._renderPos !== undefined ? zone._renderPos : zone.position,
        span: zone._renderSpan !== undefined ? zone._renderSpan : zone.span
      });

      // Zone background
      var rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', pos.x);
      rect.setAttribute('y', pos.y);
      rect.setAttribute('width', pos.w);
      rect.setAttribute('height', pos.h);
      rect.setAttribute('fill', color);
      rect.setAttribute('opacity', '0.15');
      rect.setAttribute('rx', '3');
      svg.appendChild(rect);

      // Zone border
      var border = document.createElementNS(SVG_NS, 'rect');
      border.setAttribute('x', pos.x);
      border.setAttribute('y', pos.y);
      border.setAttribute('width', pos.w);
      border.setAttribute('height', pos.h);
      border.setAttribute('fill', 'none');
      border.setAttribute('stroke', color);
      border.setAttribute('stroke-width', '1.5');
      border.setAttribute('rx', '3');
      border.setAttribute('opacity', '0.5');
      svg.appendChild(border);

      // Zone label
      var text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', pos.x + pos.w / 2);
      text.setAttribute('y', pos.y + pos.h / 2);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('fill', color);
      text.setAttribute('font-size', pos.w < 50 || pos.h < 30 ? '7' : '9');
      text.setAttribute('font-weight', '600');
      text.setAttribute('font-family', 'DM Sans, sans-serif');
      text.textContent = zone.name;

      // Rotate label for vertical zones
      if (zone.side === 'east' || zone.side === 'west') {
        var cx = pos.x + pos.w / 2;
        var cy = pos.y + pos.h / 2;
        text.setAttribute('transform', 'rotate(-90 ' + cx + ' ' + cy + ')');
      }

      svg.appendChild(text);
    });
  }

  function getZoneRect(zone) {
    var ZONE_DEPTH = 28;
    var pos = zone.position || 0;
    var span = zone.span || 0.5;

    switch (zone.side) {
      case 'north':
        return {
          x: STORE_X + pos * STORE_W,
          y: STORE_Y + 2,
          w: span * STORE_W,
          h: ZONE_DEPTH
        };
      case 'south':
        return {
          x: STORE_X + pos * STORE_W,
          y: STORE_Y + STORE_H - ZONE_DEPTH - 2,
          w: span * STORE_W,
          h: ZONE_DEPTH
        };
      case 'east':
        return {
          x: STORE_X + STORE_W - ZONE_DEPTH - 2,
          y: STORE_Y + pos * STORE_H,
          w: ZONE_DEPTH,
          h: span * STORE_H
        };
      case 'west':
        return {
          x: STORE_X + 2,
          y: STORE_Y + pos * STORE_H,
          w: ZONE_DEPTH,
          h: span * STORE_H
        };
      default:
        return { x: STORE_X, y: STORE_Y, w: 30, h: 30 };
    }
  }


  // ==========================================
  //  AISLES (center)
  // ==========================================

  function drawAisles(svg, storeData) {
    var aisles = storeData.aisles || [];
    if (aisles.length === 0) return;

    var aisleAreaX = STORE_X + 40;
    var aisleAreaW = STORE_W - 80;
    var aisleAreaY = STORE_Y + 50;
    var aisleAreaH = STORE_H - 90;
    var aisleWidth = 10;

    aisles.forEach(function (aisle) {
      var xRatio = aisles.length > 1
        ? aisle.gridCol / (aisles.length - 1)
        : 0.5;
      var cx = aisleAreaX + xRatio * aisleAreaW;

      // Aisle bar
      var rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', cx - aisleWidth / 2);
      rect.setAttribute('y', aisleAreaY);
      rect.setAttribute('width', aisleWidth);
      rect.setAttribute('height', aisleAreaH);
      rect.setAttribute('fill', '#d4d0cb');
      rect.setAttribute('rx', '3');
      rect.setAttribute('opacity', '0.6');
      svg.appendChild(rect);

      // Aisle number label
      var text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', cx);
      text.setAttribute('y', aisleAreaY + aisleAreaH + 14);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#78716c');
      text.setAttribute('font-size', '8');
      text.setAttribute('font-weight', '600');
      text.setAttribute('font-family', 'DM Sans, sans-serif');
      text.textContent = aisle.number;
      svg.appendChild(text);
    });
  }


  // ==========================================
  //  ENTRANCE / EXIT
  // ==========================================

  function drawEntranceExit(svg, storeData) {
    var entrance = storeData.entrance || { side: 'south', position: 0.3 };
    var exit = storeData.exit || { side: 'south', position: 0.7 };

    drawDoor(svg, entrance.side, entrance.position, 'IN', '#16a34a');
    drawDoor(svg, exit.side, exit.position, 'OUT', '#d97706');
  }

  function drawDoor(svg, side, ratio, label, color) {
    var pos = getDoorPosition(side, ratio);

    // Door marker
    var rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', pos.x - 14);
    rect.setAttribute('y', pos.y - 8);
    rect.setAttribute('width', 28);
    rect.setAttribute('height', 16);
    rect.setAttribute('fill', color);
    rect.setAttribute('rx', '4');
    svg.appendChild(rect);

    var text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', pos.x);
    text.setAttribute('y', pos.y + 1);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('fill', 'white');
    text.setAttribute('font-size', '8');
    text.setAttribute('font-weight', '700');
    text.setAttribute('font-family', 'DM Sans, sans-serif');
    text.textContent = label;
    svg.appendChild(text);
  }

  function getDoorPosition(side, ratio) {
    var r = ratio || 0.5;
    switch (side) {
      case 'north': return { x: STORE_X + r * STORE_W, y: STORE_Y - 12 };
      case 'south': return { x: STORE_X + r * STORE_W, y: STORE_Y + STORE_H + 12 };
      case 'east':  return { x: STORE_X + STORE_W + 12, y: STORE_Y + r * STORE_H };
      case 'west':  return { x: STORE_X - 12, y: STORE_Y + r * STORE_H };
      default:      return { x: STORE_X + r * STORE_W, y: STORE_Y + STORE_H + 12 };
    }
  }


  // ==========================================
  //  ROUTE PATH (animated)
  // ==========================================

  function drawRoutePath(svg, routeResult) {
    var stops = routeResult.stops;
    if (stops.length < 2) return;

    // Build the path. Use Manhattan (right-angle) routing along a south
    // walkway so the line follows realistic shopping paths instead of
    // cutting diagonally through aisles.
    var points = stops.map(function (stop) {
      return toSVGCoords(stop.position);
    });

    // The "main walkway" sits just below the aisle bars, inside the south wall.
    var walkY = STORE_Y + STORE_H * 0.95;

    var d = 'M ' + points[0].x + ' ' + points[0].y;

    for (var i = 1; i < points.length; i++) {
      var prev = points[i - 1];
      var next = points[i];
      var prevOnWalk = Math.abs(prev.y - walkY) <= 2;
      var nextOnWalk = Math.abs(next.y - walkY) <= 2;

      if (prevOnWalk && nextOnWalk) {
        // Both on walkway — simple horizontal line
        d += ' L ' + next.x + ' ' + next.y;
      } else if (prevOnWalk) {
        // On walkway → walk to next.x → rise up to next stop
        d += ' L ' + next.x + ' ' + walkY;
        d += ' L ' + next.x + ' ' + next.y;
      } else if (nextOnWalk) {
        // Drop to walkway → walk to next.x
        d += ' L ' + prev.x + ' ' + walkY;
        d += ' L ' + next.x + ' ' + next.y;
      } else {
        // Both off walkway — drop, traverse, rise (3 segments)
        d += ' L ' + prev.x + ' ' + walkY;
        d += ' L ' + next.x + ' ' + walkY;
        d += ' L ' + next.x + ' ' + next.y;
      }
    }

    // Glow layer
    var glowPath = document.createElementNS(SVG_NS, 'path');
    glowPath.setAttribute('d', d);
    glowPath.setAttribute('fill', 'none');
    glowPath.setAttribute('stroke', '#16a34a');
    glowPath.setAttribute('stroke-width', '6');
    glowPath.setAttribute('opacity', '0.2');
    glowPath.setAttribute('stroke-linecap', 'round');
    glowPath.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(glowPath);

    // Main path
    var path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#16a34a');
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-dasharray', '8 4');

    // Animate dash offset for "marching ants" effect
    var animate = document.createElementNS(SVG_NS, 'animate');
    animate.setAttribute('attributeName', 'stroke-dashoffset');
    animate.setAttribute('from', '0');
    animate.setAttribute('to', '-24');
    animate.setAttribute('dur', '1.5s');
    animate.setAttribute('repeatCount', 'indefinite');
    path.appendChild(animate);

    svg.appendChild(path);
  }


  // ==========================================
  //  STOP MARKERS (numbered circles)
  // ==========================================

  function drawStopMarkers(svg, routeResult) {
    var stops = routeResult.stops;

    stops.forEach(function (stop, index) {
      if (stop.type === 'entrance' || stop.type === 'exit') return;

      var pos = toSVGCoords(stop.position);
      var isZone = stop.type === 'zone';

      // Outer ring
      var ring = document.createElementNS(SVG_NS, 'circle');
      ring.setAttribute('cx', pos.x);
      ring.setAttribute('cy', pos.y);
      ring.setAttribute('r', '14');
      ring.setAttribute('fill', 'white');
      ring.setAttribute('stroke', '#16a34a');
      ring.setAttribute('stroke-width', '2');
      svg.appendChild(ring);

      // Inner circle
      var circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('cx', pos.x);
      circle.setAttribute('cy', pos.y);
      circle.setAttribute('r', '11');
      circle.setAttribute('fill', '#16a34a');
      svg.appendChild(circle);

      // Stop number
      var num = document.createElementNS(SVG_NS, 'text');
      num.setAttribute('x', pos.x);
      num.setAttribute('y', pos.y + 1);
      num.setAttribute('text-anchor', 'middle');
      num.setAttribute('dominant-baseline', 'central');
      num.setAttribute('fill', 'white');
      num.setAttribute('font-size', '10');
      num.setAttribute('font-weight', '700');
      num.setAttribute('font-family', 'DM Sans, sans-serif');
      num.textContent = stop.stopNumber;
      svg.appendChild(num);

      // Stop label (small text below)
      var label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', pos.x);
      label.setAttribute('y', pos.y - 18);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', '#44403c');
      label.setAttribute('font-size', '7');
      label.setAttribute('font-weight', '600');
      label.setAttribute('font-family', 'DM Sans, sans-serif');
      label.textContent = stop.label;
      svg.appendChild(label);
    });
  }


  // ==========================================
  //  COORDINATE MAPPING
  // ==========================================

  function toSVGCoords(position) {
    if (!position) return { x: STORE_X + STORE_W / 2, y: STORE_Y + STORE_H / 2 };
    return {
      x: STORE_X + position.x * STORE_W,
      y: STORE_Y + position.y * STORE_H
    };
  }


  // ==========================================
  //  PUBLIC API
  // ==========================================

  return {
    render: render
  };

})();
