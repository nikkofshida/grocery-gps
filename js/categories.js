/* ============================================
   categories.js — Grocery item → category matcher
   Dictionary-based with fuzzy matching,
   user corrections, and store-aware resolution.
   ============================================ */

var GroceryGPS = GroceryGPS || {};

GroceryGPS.categories = (function () {

  // ===========================================
  //  CATEGORY DICTIONARY (~300 common items)
  //  Maps item keywords → category names that
  //  match the categories in store aisle data.
  // ===========================================

  var DICTIONARY = {
    // --- PRODUCE ---
    'apple': 'Fruits', 'apples': 'Fruits', 'banana': 'Fruits', 'bananas': 'Fruits',
    'orange': 'Fruits', 'oranges': 'Fruits', 'grapes': 'Fruits', 'strawberry': 'Fruits',
    'strawberries': 'Fruits', 'blueberry': 'Fruits', 'blueberries': 'Fruits',
    'raspberry': 'Fruits', 'raspberries': 'Fruits', 'lemon': 'Fruits', 'lemons': 'Fruits',
    'lime': 'Fruits', 'limes': 'Fruits', 'avocado': 'Fruits', 'avocados': 'Fruits',
    'peach': 'Fruits', 'peaches': 'Fruits', 'pear': 'Fruits', 'pears': 'Fruits',
    'mango': 'Fruits', 'mangos': 'Fruits', 'pineapple': 'Fruits', 'watermelon': 'Fruits',
    'cantaloupe': 'Fruits', 'cherries': 'Fruits', 'plum': 'Fruits', 'plums': 'Fruits',
    'kiwi': 'Fruits', 'grapefruit': 'Fruits', 'pomegranate': 'Fruits',
    'fruit': 'Fruits', 'berries': 'Fruits',

    'lettuce': 'Vegetables', 'tomato': 'Vegetables', 'tomatoes': 'Vegetables',
    'onion': 'Vegetables', 'onions': 'Vegetables', 'potato': 'Vegetables',
    'potatoes': 'Vegetables', 'carrot': 'Vegetables', 'carrots': 'Vegetables',
    'broccoli': 'Vegetables', 'spinach': 'Vegetables', 'kale': 'Vegetables',
    'cucumber': 'Vegetables', 'celery': 'Vegetables', 'bell pepper': 'Vegetables',
    'pepper': 'Vegetables', 'peppers': 'Vegetables', 'mushroom': 'Vegetables',
    'mushrooms': 'Vegetables', 'zucchini': 'Vegetables', 'corn': 'Vegetables',
    'green beans': 'Vegetables', 'asparagus': 'Vegetables', 'cauliflower': 'Vegetables',
    'sweet potato': 'Vegetables', 'sweet potatoes': 'Vegetables',
    'garlic': 'Vegetables', 'ginger': 'Vegetables', 'jalapeño': 'Vegetables',
    'jalapeno': 'Vegetables', 'cabbage': 'Vegetables', 'eggplant': 'Vegetables',
    'squash': 'Vegetables', 'beet': 'Vegetables', 'beets': 'Vegetables',
    'radish': 'Vegetables', 'artichoke': 'Vegetables',
    'vegetable': 'Vegetables', 'veggies': 'Vegetables', 'salad': 'Salad Mix',
    'salad mix': 'Salad Mix', 'spring mix': 'Salad Mix', 'arugula': 'Salad Mix',

    'basil': 'Herbs', 'cilantro': 'Herbs', 'parsley': 'Herbs', 'mint': 'Herbs',
    'rosemary': 'Herbs', 'thyme': 'Herbs', 'dill': 'Herbs', 'chives': 'Herbs',
    'oregano': 'Herbs', 'sage': 'Herbs', 'herbs': 'Herbs', 'fresh herbs': 'Herbs',

    // --- DAIRY ---
    'milk': 'Milk', 'whole milk': 'Milk', '2% milk': 'Milk', 'skim milk': 'Milk',
    'oat milk': 'Milk', 'almond milk': 'Milk', 'soy milk': 'Milk',
    'half and half': 'Cream', 'half & half': 'Cream', 'heavy cream': 'Cream',
    'whipping cream': 'Cream', 'cream': 'Cream', 'creamer': 'Cream',
    'cheese': 'Cheese', 'cheddar': 'Cheese', 'mozzarella': 'Cheese',
    'parmesan': 'Cheese', 'swiss': 'Cheese', 'provolone': 'Cheese',
    'cream cheese': 'Cheese', 'shredded cheese': 'Cheese', 'sliced cheese': 'Cheese',
    'string cheese': 'Cheese', 'brie': 'Cheese', 'gouda': 'Cheese', 'feta': 'Cheese',
    'cottage cheese': 'Cheese', 'ricotta': 'Cheese',
    'yogurt': 'Yogurt', 'greek yogurt': 'Yogurt',
    'eggs': 'Eggs', 'egg': 'Eggs', 'dozen eggs': 'Eggs',
    'butter': 'Butter', 'margarine': 'Butter',
    'sour cream': 'Sour Cream',

    // --- MEAT & SEAFOOD ---
    'chicken': 'Chicken', 'chicken breast': 'Chicken', 'chicken thigh': 'Chicken',
    'chicken thighs': 'Chicken', 'chicken wings': 'Chicken',
    'whole chicken': 'Chicken', 'rotisserie chicken': 'Rotisserie Chicken',
    'ground beef': 'Ground Meat', 'ground turkey': 'Ground Meat',
    'ground pork': 'Ground Meat', 'ground meat': 'Ground Meat',
    'beef': 'Beef', 'steak': 'Beef', 'ribeye': 'Beef', 'sirloin': 'Beef',
    'roast': 'Beef', 'brisket': 'Beef',
    'pork': 'Pork', 'pork chop': 'Pork', 'pork chops': 'Pork',
    'pork loin': 'Pork', 'pork tenderloin': 'Pork', 'ham': 'Pork',
    'bacon': 'Pork', 'sausage': 'Sausage', 'hot dogs': 'Sausage',
    'bratwurst': 'Sausage', 'kielbasa': 'Sausage', 'italian sausage': 'Sausage',
    'salmon': 'Seafood', 'shrimp': 'Seafood', 'tuna': 'Seafood',
    'fish': 'Fish', 'tilapia': 'Fish', 'cod': 'Fish', 'halibut': 'Fish',
    'crab': 'Seafood', 'lobster': 'Seafood', 'scallops': 'Seafood',
    'turkey': 'Chicken', 'lamb': 'Beef',

    // --- DELI ---
    'deli meat': 'Deli Meats', 'deli': 'Deli Meats', 'lunch meat': 'Deli Meats',
    'sliced turkey': 'Deli Meats', 'sliced ham': 'Deli Meats',
    'salami': 'Deli Meats', 'pepperoni': 'Deli Meats', 'prosciutto': 'Deli Meats',
    'prepared food': 'Prepared Foods', 'hot bar': 'Prepared Foods',
    'soup bar': 'Soup Bar', 'salad bar': 'Salad Bar',

    // --- BAKERY ---
    'fresh bread': 'Fresh Bread', 'bakery bread': 'Fresh Bread',
    'baguette': 'Fresh Bread', 'sourdough': 'Fresh Bread', 'french bread': 'Fresh Bread',
    'cake': 'Cakes', 'birthday cake': 'Cakes', 'cupcake': 'Cakes', 'cupcakes': 'Cakes',
    'donut': 'Donuts', 'donuts': 'Donuts', 'doughnut': 'Donuts',
    'muffin': 'Muffins', 'muffins': 'Muffins', 'croissant': 'Pastries',
    'pastry': 'Pastries', 'pastries': 'Pastries', 'danish': 'Pastries',
    'pie': 'Pies', 'pies': 'Pies',

    // --- BREAD AISLE ---
    'bread': 'Bread', 'sandwich bread': 'Bread', 'wheat bread': 'Bread',
    'white bread': 'Bread', 'rye bread': 'Bread', 'english muffin': 'Bread',
    'english muffins': 'Bread',
    'bagel': 'Bagels', 'bagels': 'Bagels',
    'tortilla': 'Tortillas', 'tortillas': 'Tortillas', 'wrap': 'Tortillas',
    'wraps': 'Tortillas', 'pita': 'Tortillas', 'naan': 'Tortillas',
    'peanut butter': 'Peanut Butter', 'almond butter': 'Peanut Butter',
    'jelly': 'Jelly', 'jam': 'Jelly', 'preserves': 'Jelly',
    'honey': 'Honey', 'maple syrup': 'Honey',
    'nutella': 'Peanut Butter',

    // --- CEREAL & BREAKFAST ---
    'cereal': 'Cereal', 'cheerios': 'Cereal', 'granola': 'Granola',
    'oatmeal': 'Oatmeal', 'oats': 'Oatmeal', 'instant oatmeal': 'Oatmeal',
    'breakfast bar': 'Breakfast Bars', 'granola bar': 'Breakfast Bars',
    'protein bar': 'Breakfast Bars', 'pop tarts': 'Pop-Tarts',
    'pop-tarts': 'Pop-Tarts', 'pancake mix': 'Cereal', 'waffle mix': 'Cereal',

    // --- CANNED GOODS ---
    'canned tomatoes': 'Canned Vegetables', 'diced tomatoes': 'Canned Vegetables',
    'tomato paste': 'Canned Vegetables', 'tomato sauce': 'Canned Vegetables',
    'canned corn': 'Canned Vegetables', 'canned beans': 'Beans',
    'black beans': 'Beans', 'kidney beans': 'Beans', 'chickpeas': 'Beans',
    'garbanzo': 'Beans', 'pinto beans': 'Beans', 'refried beans': 'Beans',
    'lentils': 'Beans', 'beans': 'Beans',
    'canned fruit': 'Canned Fruit', 'applesauce': 'Canned Fruit',
    'fruit cups': 'Canned Fruit',
    'soup': 'Soup', 'chicken soup': 'Soup', 'tomato soup': 'Soup',
    'ramen': 'Soup', 'cup noodles': 'Soup',
    'broth': 'Broth', 'chicken broth': 'Broth', 'beef broth': 'Broth',
    'vegetable broth': 'Broth', 'bone broth': 'Broth', 'stock': 'Broth',
    'canned tuna': 'Canned Fruit', 'canned chicken': 'Canned Fruit',

    // --- PASTA & RICE ---
    'pasta': 'Pasta', 'spaghetti': 'Pasta', 'penne': 'Pasta', 'macaroni': 'Pasta',
    'linguine': 'Pasta', 'fettuccine': 'Pasta', 'angel hair': 'Pasta',
    'elbow macaroni': 'Pasta', 'rotini': 'Pasta', 'lasagna noodles': 'Pasta',
    'egg noodles': 'Pasta', 'ramen noodles': 'Pasta', 'mac and cheese': 'Pasta',
    'mac & cheese': 'Pasta',
    'pasta sauce': 'Pasta Sauce', 'marinara': 'Pasta Sauce', 'alfredo': 'Pasta Sauce',
    'pesto': 'Pasta Sauce', 'tomato basil': 'Pasta Sauce',
    'rice': 'Rice', 'white rice': 'Rice', 'brown rice': 'Rice',
    'jasmine rice': 'Rice', 'basmati rice': 'Rice', 'instant rice': 'Rice',
    'quinoa': 'Grains', 'couscous': 'Grains', 'barley': 'Grains',
    'soy sauce': 'International Foods', 'teriyaki': 'International Foods',
    'sriracha': 'International Foods', 'curry paste': 'International Foods',
    'coconut milk': 'International Foods', 'salsa': 'International Foods',
    'taco seasoning': 'International Foods', 'taco shells': 'International Foods',
    'tortilla chips': 'International Foods',

    // --- SNACKS ---
    'chips': 'Chips', 'potato chips': 'Chips', 'doritos': 'Chips',
    'tortilla chips': 'Chips', 'pretzels': 'Chips', 'popcorn': 'Snacks',
    'trail mix': 'Snacks', 'nuts': 'Snacks', 'almonds': 'Snacks',
    'cashews': 'Snacks', 'peanuts': 'Snacks', 'mixed nuts': 'Snacks',
    'crackers': 'Crackers', 'goldfish': 'Crackers', 'cheez-its': 'Crackers',
    'ritz': 'Crackers', 'wheat thins': 'Crackers', 'triscuits': 'Crackers',
    'cookies': 'Cookies', 'oreos': 'Cookies', 'chocolate chip cookies': 'Cookies',
    'candy': 'Candy', 'chocolate': 'Candy', 'gummy bears': 'Candy',
    'gum': 'Candy', 'mints': 'Candy', 'm&ms': 'Candy', 'snickers': 'Candy',
    'beef jerky': 'Snacks', 'dried fruit': 'Snacks', 'fruit snacks': 'Snacks',
    'snack': 'Snacks', 'snacks': 'Snacks',

    // --- BEVERAGES ---
    'water': 'Water', 'bottled water': 'Water', 'sparkling water': 'Water',
    'la croix': 'Water', 'lacroix': 'Water', 'seltzer': 'Water',
    'soda': 'Soda', 'coke': 'Soda', 'pepsi': 'Soda', 'sprite': 'Soda',
    'diet coke': 'Soda', 'dr pepper': 'Soda', 'root beer': 'Soda',
    'ginger ale': 'Soda', 'mountain dew': 'Soda',
    'juice': 'Juice', 'orange juice': 'Juice', 'apple juice': 'Juice',
    'cranberry juice': 'Juice', 'grape juice': 'Juice', 'lemonade': 'Juice',
    'kombucha': 'Juice',
    'coffee': 'Coffee', 'ground coffee': 'Coffee', 'coffee beans': 'Coffee',
    'k-cups': 'Coffee', 'instant coffee': 'Coffee', 'cold brew': 'Coffee',
    'tea': 'Tea', 'green tea': 'Tea', 'black tea': 'Tea', 'herbal tea': 'Tea',
    'chai': 'Tea', 'iced tea': 'Tea',
    'energy drink': 'Beverages', 'gatorade': 'Beverages', 'sports drink': 'Beverages',
    'beer': 'Beverages', 'wine': 'Beverages',

    // --- CONDIMENTS & BAKING ---
    'ketchup': 'Condiments', 'mustard': 'Condiments', 'mayo': 'Condiments',
    'mayonnaise': 'Condiments', 'hot sauce': 'Condiments', 'bbq sauce': 'Condiments',
    'relish': 'Condiments', 'pickles': 'Condiments', 'olives': 'Condiments',
    'ranch': 'Salad Dressing', 'salad dressing': 'Salad Dressing',
    'italian dressing': 'Salad Dressing', 'vinaigrette': 'Salad Dressing',
    'olive oil': 'Oils', 'vegetable oil': 'Oils', 'canola oil': 'Oils',
    'coconut oil': 'Oils', 'cooking spray': 'Oils', 'oil': 'Oils',
    'vinegar': 'Vinegar', 'apple cider vinegar': 'Vinegar',
    'balsamic vinegar': 'Vinegar', 'white vinegar': 'Vinegar',
    'salt': 'Spices', 'pepper': 'Spices', 'black pepper': 'Spices',
    'cinnamon': 'Spices', 'cumin': 'Spices', 'paprika': 'Spices',
    'garlic powder': 'Spices', 'onion powder': 'Spices', 'chili powder': 'Spices',
    'italian seasoning': 'Spices', 'cayenne': 'Spices', 'turmeric': 'Spices',
    'spices': 'Spices', 'seasoning': 'Spices',
    'flour': 'Baking', 'sugar': 'Baking', 'brown sugar': 'Baking',
    'powdered sugar': 'Baking', 'baking soda': 'Baking', 'baking powder': 'Baking',
    'vanilla extract': 'Baking', 'vanilla': 'Baking', 'yeast': 'Baking',
    'chocolate chips': 'Baking', 'cocoa powder': 'Baking', 'cornstarch': 'Baking',
    'cake mix': 'Baking', 'brownie mix': 'Baking', 'frosting': 'Baking',
    'sprinkles': 'Baking',

    // --- FROZEN ---
    'frozen pizza': 'Frozen Pizza', 'frozen dinner': 'Frozen Meals',
    'frozen meal': 'Frozen Meals', 'frozen entree': 'Frozen Meals',
    'tv dinner': 'Frozen Meals', 'hot pocket': 'Frozen Meals',
    'hot pockets': 'Frozen Meals',
    'frozen vegetables': 'Frozen Vegetables', 'frozen broccoli': 'Frozen Vegetables',
    'frozen corn': 'Frozen Vegetables', 'frozen peas': 'Frozen Vegetables',
    'frozen fruit': 'Frozen Fruit', 'frozen berries': 'Frozen Fruit',
    'frozen strawberries': 'Frozen Fruit',
    'ice cream': 'Ice Cream', 'popsicles': 'Ice Cream Novelties',
    'frozen waffles': 'Frozen Breakfast', 'frozen breakfast': 'Frozen Breakfast',
    'frozen burrito': 'Frozen Meals', 'frozen burritos': 'Frozen Meals',

    // --- PAPER & CLEANING ---
    'paper towels': 'Paper Products', 'toilet paper': 'Paper Products',
    'tissues': 'Paper Products', 'napkins': 'Paper Products', 'paper plates': 'Paper Products',
    'dish soap': 'Cleaning Supplies', 'dishwasher detergent': 'Cleaning Supplies',
    'sponge': 'Cleaning Supplies', 'sponges': 'Cleaning Supplies',
    'windex': 'Cleaning Supplies', 'clorox': 'Cleaning Supplies',
    'lysol': 'Cleaning Supplies', 'bleach': 'Cleaning Supplies',
    'all purpose cleaner': 'Cleaning Supplies',
    'trash bags': 'Trash Bags', 'garbage bags': 'Trash Bags',
    'ziploc': 'Trash Bags', 'zip lock bags': 'Trash Bags',
    'plastic wrap': 'Trash Bags', 'aluminum foil': 'Trash Bags', 'foil': 'Trash Bags',
    'parchment paper': 'Trash Bags', 'cling wrap': 'Trash Bags',
    'laundry detergent': 'Laundry', 'dryer sheets': 'Laundry',
    'fabric softener': 'Laundry', 'stain remover': 'Laundry',

    // --- HEALTH & PERSONAL CARE ---
    'medicine': 'Medicine', 'tylenol': 'Medicine', 'advil': 'Medicine',
    'ibuprofen': 'Medicine', 'acetaminophen': 'Medicine', 'aspirin': 'Medicine',
    'cough medicine': 'Medicine', 'cold medicine': 'Medicine',
    'band-aid': 'Medicine', 'bandaids': 'Medicine', 'first aid': 'Medicine',
    'vitamins': 'Vitamins', 'vitamin d': 'Vitamins', 'multivitamin': 'Vitamins',
    'vitamin c': 'Vitamins', 'fish oil': 'Vitamins', 'probiotics': 'Vitamins',
    'shampoo': 'Personal Care', 'conditioner': 'Personal Care',
    'body wash': 'Personal Care', 'soap': 'Personal Care', 'hand soap': 'Personal Care',
    'deodorant': 'Personal Care', 'lotion': 'Personal Care',
    'toothpaste': 'Personal Care', 'toothbrush': 'Personal Care',
    'floss': 'Personal Care', 'mouthwash': 'Personal Care',
    'razor': 'Personal Care', 'shaving cream': 'Personal Care',
    'sunscreen': 'Personal Care', 'face wash': 'Personal Care',
    'diaper': 'Baby', 'diapers': 'Baby', 'baby food': 'Baby',
    'baby wipes': 'Baby', 'formula': 'Baby', 'baby': 'Baby',

    // --- PET ---
    'dog food': 'Health', 'cat food': 'Health', 'cat litter': 'Health',
    'pet food': 'Health', 'dog treats': 'Health'
  };


  // ===========================================
  //  MATCHING ENGINE
  // ===========================================

  /**
   * Match an item name to a category.
   * Priority: user corrections > exact match > partial match > fuzzy
   * Returns { category, confidence } or null
   */
  function matchCategory(itemName) {
    if (!itemName) return null;
    var normalized = itemName.toLowerCase().trim();

    // 1. Check user corrections first (highest priority)
    var corrections = GroceryGPS.storage.loadCorrections();
    if (corrections[normalized]) {
      return {
        category: corrections[normalized].category,
        confidence: 1.0,
        source: 'correction'
      };
    }

    // 2. Exact dictionary match
    if (DICTIONARY[normalized]) {
      return {
        category: DICTIONARY[normalized],
        confidence: 0.95,
        source: 'exact'
      };
    }

    // 3. Partial match — check if the item contains or is contained by a dict key
    var bestPartial = null;
    var bestLen = 0;
    var keys = Object.keys(DICTIONARY);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      // Item contains the dictionary key (e.g. "organic bananas" contains "bananas")
      if (normalized.indexOf(key) !== -1 && key.length > bestLen) {
        bestPartial = DICTIONARY[key];
        bestLen = key.length;
      }
      // Dictionary key contains the item (e.g. "ground beef" contains "beef")
      if (key.indexOf(normalized) !== -1 && normalized.length >= 3 && key.length > bestLen) {
        bestPartial = DICTIONARY[key];
        bestLen = key.length;
      }
    }

    if (bestPartial) {
      return {
        category: bestPartial,
        confidence: 0.7,
        source: 'partial'
      };
    }

    // 4. No match
    return null;
  }


  /**
   * Given a matched category and a store's data, find which
   * aisle or zone contains that category.
   * Returns { stopId, stopLabel, stopType } or null
   */
  function resolveLocation(category, storeData) {
    if (!category || !storeData) return null;

    var catLower = category.toLowerCase();

    // Check aisles first
    var aisles = storeData.aisles || [];
    for (var i = 0; i < aisles.length; i++) {
      var aisle = aisles[i];
      var cats = aisle.categories || [];
      for (var j = 0; j < cats.length; j++) {
        if (cats[j].toLowerCase() === catLower || cats[j].toLowerCase().indexOf(catLower) !== -1 || catLower.indexOf(cats[j].toLowerCase()) !== -1) {
          return {
            stopId: aisle.id,
            stopLabel: aisle.label || ('Aisle ' + aisle.number),
            stopType: 'aisle',
            aisleNumber: aisle.number
          };
        }
      }
    }

    // Check zones
    var zones = storeData.zones || [];
    for (var k = 0; k < zones.length; k++) {
      var zone = zones[k];
      var zoneCats = zone.categories || [];
      for (var l = 0; l < zoneCats.length; l++) {
        if (zoneCats[l].toLowerCase() === catLower || zoneCats[l].toLowerCase().indexOf(catLower) !== -1 || catLower.indexOf(zoneCats[l].toLowerCase()) !== -1) {
          return {
            stopId: zone.id,
            stopLabel: zone.name,
            stopType: 'zone',
            side: zone.side
          };
        }
      }
    }

    return null;
  }


  /**
   * Full pipeline: item name → { category, stopId, stopLabel, confidence }
   * Combines matchCategory + resolveLocation.
   */
  function matchItem(itemName, storeData) {
    var match = matchCategory(itemName);
    if (!match) {
      return {
        name: itemName,
        category: null,
        stopId: null,
        stopLabel: null,
        confidence: 0,
        matched: false
      };
    }

    var location = resolveLocation(match.category, storeData);

    return {
      name: itemName,
      category: match.category,
      stopId: location ? location.stopId : null,
      stopLabel: location ? location.stopLabel : null,
      stopType: location ? location.stopType : null,
      confidence: match.confidence,
      matched: !!location,
      source: match.source
    };
  }


  /**
   * Get all available stops (aisles + zones) for a store.
   * Used by the aisle picker UI.
   */
  function getStoreStops(storeData) {
    if (!storeData) return [];
    var stops = [];

    (storeData.aisles || []).forEach(function (aisle) {
      stops.push({
        id: aisle.id,
        label: aisle.label || ('Aisle ' + aisle.number),
        type: 'aisle',
        number: aisle.number,
        categories: aisle.categories || []
      });
    });

    (storeData.zones || []).forEach(function (zone) {
      stops.push({
        id: zone.id,
        label: zone.name,
        type: 'zone',
        side: zone.side,
        categories: zone.categories || []
      });
    });

    return stops;
  }

  // Public API
  return {
    matchCategory: matchCategory,
    resolveLocation: resolveLocation,
    matchItem: matchItem,
    getStoreStops: getStoreStops,
    DICTIONARY: DICTIONARY
  };

})();
