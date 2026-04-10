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
    'pet food': 'Health', 'dog treats': 'Health',

    // --- SYNONYMS / EVERYDAY NAMES ---
    // These cover common items that aren't worded the way an aisle sign is.
    'bun': 'Bread', 'buns': 'Bread',
    'hamburger bun': 'Bread', 'hamburger buns': 'Bread',
    'hot dog bun': 'Bread', 'hot dog buns': 'Bread',
    'brioche bun': 'Bread', 'brioche buns': 'Bread',
    'slider bun': 'Bread', 'slider buns': 'Bread',
    'dinner roll': 'Bread', 'dinner rolls': 'Bread',
    'sub roll': 'Bread', 'sub rolls': 'Bread',
    'hoagie roll': 'Bread', 'hoagie': 'Bread',
    'rolls': 'Bread', 'roll': 'Bread',
    'noodle': 'Pasta', 'noodles': 'Pasta',
    'spaghetti noodles': 'Pasta', 'rice noodles': 'Pasta',
    'udon': 'International Foods', 'soba': 'International Foods',
    'rice paper': 'International Foods', 'wonton wrappers': 'International Foods',
    'gochujang': 'International Foods', 'gochugaru': 'International Foods',
    'chili crisp': 'International Foods', 'chili oil': 'International Foods',
    'fish sauce': 'International Foods', 'oyster sauce': 'International Foods',
    'hoisin': 'International Foods', 'hoisin sauce': 'International Foods',
    'rice vinegar': 'International Foods', 'mirin': 'International Foods',
    'sake': 'International Foods', 'miso': 'International Foods',
    'kimchi': 'International Foods', 'tahini': 'International Foods',
    'harissa': 'International Foods', 'curry powder': 'International Foods',
    'nori': 'International Foods', 'sesame oil': 'International Foods',
    'sushi rice': 'Rice', 'arborio rice': 'Rice',
    'tofu': 'International Foods', 'tempeh': 'International Foods',
    'edamame': 'Frozen Vegetables',
    'plant milk': 'Milk', 'lactaid': 'Milk',
    'cold cuts': 'Deli Meats', 'lunchmeat': 'Deli Meats',
    'avocado oil': 'Oils', 'sesame seeds': 'Spices',
    'protein powder': 'Vitamins',
    'paper towel': 'Paper Products', 'tp': 'Paper Products',
    'qtips': 'Personal Care', 'q-tips': 'Personal Care', 'cotton swabs': 'Personal Care'
  };

  // ===========================================
  //  CATEGORY KEYWORD BAGS
  //  When a word isn't in the dictionary, we
  //  fall back to matching the user's store's
  //  actual aisle/zone category names against
  //  these expanded keyword bags. Example:
  //  if a store has an aisle category "Bread",
  //  any of these words → that aisle.
  // ===========================================

  var CATEGORY_KEYWORDS = {
    'bread':       ['bun','buns','roll','rolls','bagel','bagels','baguette','sourdough','brioche','ciabatta','pita','naan','tortilla','tortillas','english muffin','sliced bread','hoagie','sub'],
    'bakery':      ['bun','buns','roll','rolls','bagel','baguette','croissant','danish','muffin','cake','cupcake','pastry','pastries','pie','donut','doughnut'],
    'pasta':       ['noodle','noodles','spaghetti','penne','rigatoni','linguine','fettuccine','macaroni','rotini','elbow','angel hair','lasagna','orzo'],
    'rice':        ['rice','jasmine','basmati','arborio','sushi rice','wild rice','brown rice'],
    'produce':     ['apple','banana','orange','grape','strawberry','lettuce','tomato','onion','potato','carrot','broccoli','spinach','kale','avocado','pepper','cucumber','herbs','cilantro','basil','garlic','ginger','lemon','lime'],
    'fruits':      ['apple','banana','orange','grape','berry','berries','melon','pear','peach','plum','mango','kiwi','pineapple','cherry','cherries'],
    'vegetables':  ['lettuce','tomato','onion','potato','carrot','broccoli','spinach','kale','pepper','cucumber','garlic','squash','zucchini','cabbage','celery','mushroom','mushrooms'],
    'dairy':       ['milk','cheese','yogurt','butter','cream','sour cream','cottage cheese','half and half','creamer','eggs','egg'],
    'meat':        ['chicken','beef','steak','pork','bacon','sausage','ground beef','ground turkey','turkey','lamb','ribs','brisket'],
    'seafood':     ['salmon','shrimp','tuna','cod','tilapia','crab','lobster','scallops','fish','halibut'],
    'deli':        ['salami','ham','turkey','prosciutto','pepperoni','cold cuts','lunch meat','sliced'],
    'cereal':      ['cereal','granola','oatmeal','oats','bran','muesli','cornflakes','cheerios'],
    'snacks':      ['chips','pretzels','popcorn','nuts','almonds','cashews','peanuts','jerky','trail mix','crackers','goldfish'],
    'candy':       ['candy','chocolate','gum','mints','gummy','licorice','snickers','m&m','kit kat'],
    'beverages':   ['water','soda','juice','tea','coffee','sparkling','seltzer','lemonade','energy drink','sports drink','gatorade','kombucha','beer','wine'],
    'frozen':      ['frozen','ice cream','popsicle','sorbet','frozen pizza','frozen meal','tv dinner'],
    'condiments':  ['ketchup','mustard','mayo','mayonnaise','hot sauce','bbq','relish','pickles','olives','dressing'],
    'oils':        ['oil','olive oil','canola','vegetable oil','coconut oil','avocado oil','sesame oil','cooking spray'],
    'spices':      ['salt','pepper','cinnamon','cumin','paprika','garlic powder','seasoning','italian seasoning','chili powder','oregano'],
    'baking':      ['flour','sugar','brown sugar','baking soda','baking powder','vanilla','yeast','chocolate chips','cocoa','cake mix','frosting','sprinkles','cornstarch'],
    'international': ['soy sauce','sriracha','salsa','tortilla chips','curry','coconut milk','miso','kimchi','gochujang','chili crisp','chili oil','tahini','hoisin','fish sauce','oyster sauce','rice vinegar','sesame','tofu','tempeh','wasabi','nori','udon','soba','wonton'],
    'paper':       ['paper towels','toilet paper','tissues','napkins','paper plates','tp'],
    'cleaning':    ['dish soap','bleach','windex','clorox','lysol','sponge','sponges','all purpose','cleaner','disinfectant'],
    'laundry':     ['detergent','dryer sheets','fabric softener','stain remover','bleach'],
    'health':      ['tylenol','advil','ibuprofen','aspirin','cough','cold medicine','bandaid','band-aid','first aid','vitamin','vitamins','probiotic'],
    'personal care': ['shampoo','conditioner','body wash','soap','deodorant','lotion','toothpaste','toothbrush','floss','razor','sunscreen','q-tips','cotton swabs'],
    'baby':        ['diaper','diapers','baby food','baby wipes','formula','baby']
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
      // Last resort: try keyword-bag matching directly against the store's
      // aisle/zone categories. This covers items like "buns" that aren't in
      // the dictionary but ARE in a keyword bag for "Bread".
      var kbResult = keywordBagResolve(itemName, storeData);
      if (kbResult) {
        return {
          name: itemName,
          category: kbResult.stopLabel,
          stopId: kbResult.stopId,
          stopLabel: kbResult.stopLabel,
          stopType: kbResult.stopType,
          confidence: 0.6,
          matched: true,
          source: 'keyword-bag'
        };
      }
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

    // If the dictionary matched a category but we couldn't resolve it to a
    // specific aisle/zone in this store, try the keyword-bag fallback.
    // Example: dictionary says "buns" → "Bread", but the store has no aisle
    // with category "Bread" — however it has an aisle labelled "Bakery"
    // whose keyword bag includes "buns".
    if (!location && storeData) {
      location = keywordBagResolve(itemName, storeData);
    }

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
   * Keyword-bag fallback: for each aisle/zone category name in the store,
   * look up its CATEGORY_KEYWORDS bag and check if the user's item appears.
   */
  function keywordBagResolve(itemName, storeData) {
    if (!itemName || !storeData) return null;
    var normalized = itemName.toLowerCase().trim();
    var words = normalized.split(/\s+/);

    // Build list of all stops with their categories
    var candidates = [];
    (storeData.aisles || []).forEach(function (aisle) {
      (aisle.categories || []).forEach(function (cat) {
        candidates.push({
          catName: cat,
          stopId: aisle.id,
          stopLabel: aisle.label || ('Aisle ' + aisle.number),
          stopType: 'aisle'
        });
      });
    });
    (storeData.zones || []).forEach(function (zone) {
      (zone.categories || []).forEach(function (cat) {
        candidates.push({
          catName: cat,
          stopId: zone.id,
          stopLabel: zone.name,
          stopType: 'zone'
        });
      });
    });

    // For each candidate, check if item matches its keyword bag
    for (var i = 0; i < candidates.length; i++) {
      var catLower = candidates[i].catName.toLowerCase().trim();
      var bag = CATEGORY_KEYWORDS[catLower];
      if (!bag) continue;

      // Check if the full item string or any of its words appear in the bag
      for (var j = 0; j < bag.length; j++) {
        if (normalized === bag[j] || normalized.indexOf(bag[j]) !== -1 || bag[j].indexOf(normalized) !== -1) {
          return {
            stopId: candidates[i].stopId,
            stopLabel: candidates[i].stopLabel,
            stopType: candidates[i].stopType
          };
        }
      }
      // Also check individual words (e.g. "brioche buns" → word "buns" in bread bag)
      for (var w = 0; w < words.length; w++) {
        if (words[w].length < 3) continue;
        if (bag.indexOf(words[w]) !== -1) {
          return {
            stopId: candidates[i].stopId,
            stopLabel: candidates[i].stopLabel,
            stopType: candidates[i].stopType
          };
        }
      }
    }

    return null;
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
