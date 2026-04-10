/* ============================================
   router.js — Route optimization engine
   Two strategies:
     1. Shortest Distance (nearest-neighbor)
     2. Natural Flow (perimeter-first, then aisles)
   ============================================ */

var GroceryGPS = GroceryGPS || {};

GroceryGPS.router = (function () {

  /**
   * Build an optimized route from a list of items + store data.
   * Returns { stops: [...], strategy, totalStops }
   *
   * Each stop: {
   *   id, label, type, side, aisleNumber,
   *   items: [{ name, category }],
   *   position: { x, y } // normalized 0–1 for map drawing
   * }
   */
  function buildRoute(items, storeData, strategy) {
    if (!storeData || !items || items.length === 0) return { stops: [], strategy: strategy, totalStops: 0 };

    strategy = strategy || 'natural';

    // 1. Group items by stopId
    var stopMap = {};
    items.forEach(function (item) {
      if (!item.stopId || item.checked) return;
      if (!stopMap[item.stopId]) {
        stopMap[item.stopId] = {
          id: item.stopId,
          label: item.stopLabel || item.stopId,
          type: item.stopType || 'aisle',
          items: []
        };
      }
      stopMap[item.stopId].items.push({
        name: item.name,
        category: item.category
      });
    });

    var stops = Object.keys(stopMap).map(function (key) { return stopMap[key]; });
    if (stops.length === 0) return { stops: [], strategy: strategy, totalStops: 0 };

    // 2. Enrich stops with position data from store
    stops.forEach(function (stop) {
      enrichStopPosition(stop, storeData);
    });

    // 3. Add entrance and exit as virtual stops
    var entrance = {
      id: '__entrance__',
      label: 'Entrance',
      type: 'entrance',
      items: [],
      position: getSidePosition(storeData.entrance ? storeData.entrance.side : 'south',
                                storeData.entrance ? storeData.entrance.position : 0.3,
                                storeData)
    };

    var exit = {
      id: '__exit__',
      label: 'Exit',
      type: 'exit',
      items: [],
      position: getSidePosition(storeData.exit ? storeData.exit.side : 'south',
                                storeData.exit ? storeData.exit.position : 0.7,
                                storeData)
    };

    // 4. Optimize order
    var orderedStops;
    if (strategy === 'shortest') {
      orderedStops = nearestNeighborRoute(entrance, exit, stops);
    } else {
      orderedStops = naturalFlowRoute(entrance, exit, stops, storeData);
    }

    // 5. Number the stops (entrance = 0, first real stop = 1, etc.)
    orderedStops.forEach(function (stop, index) {
      stop.stopNumber = index;
    });

    return {
      stops: orderedStops,
      strategy: strategy,
      totalStops: orderedStops.filter(function (s) { return s.type !== 'entrance' && s.type !== 'exit'; }).length
    };
  }


  // =============================================
  //  STRATEGY 1: NEAREST NEIGHBOR (shortest path)
  // =============================================

  function nearestNeighborRoute(entrance, exit, stops) {
    var route = [entrance];
    var remaining = stops.slice();

    var current = entrance;
    while (remaining.length > 0) {
      var nearestIdx = 0;
      var nearestDist = Infinity;

      for (var i = 0; i < remaining.length; i++) {
        var d = distance(current.position, remaining[i].position);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }

      current = remaining.splice(nearestIdx, 1)[0];
      route.push(current);
    }

    route.push(exit);
    return route;
  }


  // =============================================
  //  STRATEGY 2: NATURAL FLOW
  //  Perimeter zones first (following the wall),
  //  then aisles in numerical order.
  //  Mimics how most people naturally shop.
  // =============================================

  function naturalFlowRoute(entrance, exit, stops, storeData) {
    // Separate zones and aisles
    var zones = stops.filter(function (s) { return s.type === 'zone'; });
    var aisles = stops.filter(function (s) { return s.type === 'aisle'; });

    // Sort zones by perimeter walking order (clockwise from entrance)
    var entranceSide = storeData.entrance ? storeData.entrance.side : 'south';
    var sideOrder = getPerimeterOrder(entranceSide);
    zones.sort(function (a, b) {
      var sideA = getStopSide(a, storeData);
      var sideB = getStopSide(b, storeData);
      var orderA = sideOrder.indexOf(sideA);
      var orderB = sideOrder.indexOf(sideB);
      if (orderA !== orderB) return orderA - orderB;
      // Same side — sort by position along that side
      return (a.position.x + a.position.y) - (b.position.x + b.position.y);
    });

    // Sort aisles by number
    aisles.sort(function (a, b) {
      var numA = getAisleNumber(a, storeData);
      var numB = getAisleNumber(b, storeData);
      return numA - numB;
    });

    // Build route: entrance → zones around perimeter → aisles in order → exit
    var route = [entrance];

    // Add perimeter zones first
    zones.forEach(function (z) { route.push(z); });

    // Then center aisles
    aisles.forEach(function (a) { route.push(a); });

    route.push(exit);
    return route;
  }


  // =============================================
  //  POSITION HELPERS
  //  Maps store elements to a normalized 0–1 grid
  //  for distance calculations and SVG rendering.
  //
  //  Layout concept (top-down view):
  //    North zones across the top
  //    Aisles as vertical columns in the center
  //    East zones on the right
  //    West zones on the left
  //    South = entrance/exit at bottom
  // =============================================

  function enrichStopPosition(stop, storeData) {
    if (stop.type === 'aisle') {
      var aisle = findAisle(stop.id, storeData);
      if (aisle) {
        stop.aisleNumber = aisle.number;
        var totalAisles = (storeData.aisles || []).length;
        // Aisles spread horizontally in the center area (0.15—0.85, y=0.35—0.65)
        var xRatio = totalAisles > 1
          ? 0.15 + (aisle.gridCol / (totalAisles - 1)) * 0.7
          : 0.5;
        // Place the stop at the bottom of the aisle bar (visually touching
        // it). The route renderer will drop down to the walkway (y=0.95)
        // between stops, creating right-angle paths that treat aisles as
        // barriers — just like streets on Google Maps.
        stop.position = { x: xRatio, y: 0.85 };
      } else {
        stop.position = { x: 0.5, y: 0.5 };
      }
    } else if (stop.type === 'zone') {
      var zone = findZone(stop.id, storeData);
      if (zone) {
        stop.side = zone.side;
        stop.position = getSidePosition(zone.side, zone.position + zone.span / 2, storeData);
      } else {
        stop.position = { x: 0.5, y: 0.5 };
      }
    } else {
      stop.position = stop.position || { x: 0.5, y: 0.5 };
    }
  }

  function getSidePosition(side, ratio, storeData) {
    // ratio = 0–1 along that wall
    var r = ratio || 0.5;
    switch (side) {
      case 'north': return { x: 0.15 + r * 0.7, y: 0.08 };
      case 'south': return { x: 0.15 + r * 0.7, y: 0.95 };
      case 'east':  return { x: 0.92, y: 0.15 + r * 0.7 };
      case 'west':  return { x: 0.08, y: 0.15 + r * 0.7 };
      default:      return { x: 0.5, y: 0.92 };
    }
  }

  function getPerimeterOrder(startSide) {
    var all = ['south', 'east', 'north', 'west'];
    var idx = all.indexOf(startSide);
    if (idx === -1) idx = 0;
    var order = [];
    for (var i = 0; i < 4; i++) {
      order.push(all[(idx + i) % 4]);
    }
    return order;
  }

  function getStopSide(stop, storeData) {
    if (stop.side) return stop.side;
    var zone = findZone(stop.id, storeData);
    return zone ? zone.side : 'south';
  }

  function getAisleNumber(stop, storeData) {
    if (stop.aisleNumber) return stop.aisleNumber;
    var aisle = findAisle(stop.id, storeData);
    return aisle ? aisle.number : 999;
  }

  function findAisle(id, storeData) {
    return (storeData.aisles || []).find(function (a) { return a.id === id; });
  }

  function findZone(id, storeData) {
    return (storeData.zones || []).find(function (z) { return z.id === id; });
  }

  function distance(a, b) {
    if (!a || !b) return Infinity;
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }


  // =============================================
  //  PUBLIC API
  // =============================================

  return {
    buildRoute: buildRoute,
    distance: distance
  };

})();
