// Fast keyword-based emoji matcher for task titles.
// Each entry maps a set of lowercase keywords to an emoji.
// getTaskEmoji() scans the lowercased title for any keyword substring match.

interface EmojiEntry {
  keywords: string[];
  emoji: string;
}

const EMOJI_MAP: EmojiEntry[] = [

  // ── Food & Cooking ────────────────────────────────────────────────────────
  { keywords: ['pizza', 'pepperoni'], emoji: '🍕' },
  { keywords: ['burger', 'hamburger', 'cheeseburger', 'patty', 'bun'], emoji: '🍔' },
  { keywords: ['taco', 'burrito', 'quesadilla', 'fajita', 'enchilada', 'nacho', 'guacamole', 'salsa', 'tex-mex', 'mexican food'], emoji: '🌮' },
  { keywords: ['sushi', 'sashimi', 'maki', 'nigiri', 'tempura', 'ramen', 'udon', 'soba', 'dumplings', 'dim sum', 'wonton', 'gyoza', 'japanese food', 'chinese food', 'asian food'], emoji: '🍣' },
  { keywords: ['salad', 'greens', 'lettuce', 'spinach', 'arugula', 'kale', 'coleslaw', 'vegetables', 'veggie', 'veggies', 'vegan', 'vegetarian'], emoji: '🥗' },
  { keywords: ['cook', 'cooking', 'bake', 'baking', 'roast', 'roasting', 'grill', 'grilling', 'fry', 'frying', 'sauté', 'saute', 'simmer', 'braise', 'recipe', 'meal prep', 'meal plan', 'meal', 'dinner', 'lunch', 'breakfast', 'brunch', 'supper', 'food prep', 'prep food', 'make food', 'homemade', 'leftovers'], emoji: '🍳' },
  { keywords: ['pasta', 'spaghetti', 'lasagna', 'lasagne', 'linguine', 'fettuccine', 'penne', 'rigatoni', 'macaroni', 'noodle', 'noodles'], emoji: '🍜' },
  { keywords: ['sandwich', 'sub', 'wrap', 'panini', 'bagel', 'baguette', 'toast', 'hoagie'], emoji: '🥪' },
  { keywords: ['soup', 'stew', 'chili', 'broth', 'chowder', 'bisque', 'ramen'], emoji: '🍲' },
  { keywords: ['steak', 'beef', 'pork', 'chicken', 'turkey', 'lamb', 'meat', 'bbq', 'barbecue', 'ribs', 'wings', 'bacon', 'sausage', 'ham', 'seafood', 'fish', 'salmon', 'shrimp', 'lobster', 'crab'], emoji: '🍖' },
  { keywords: ['coffee', 'espresso', 'latte', 'cappuccino', 'americano', 'macchiato', 'flat white', 'cold brew', 'french press', 'cafe', 'café', 'starbucks', 'barista'], emoji: '☕' },
  { keywords: ['tea', 'herbal', 'green tea', 'black tea', 'chai', 'matcha', 'oolong', 'chamomile', 'peppermint tea'], emoji: '🍵' },
  { keywords: ['smoothie', 'juice', 'lemonade', 'kombucha', 'sparkling water', 'soda', 'soft drink', 'drink', 'beverage', 'hydrate', 'water bottle', 'protein shake'], emoji: '🥤' },
  { keywords: ['wine', 'beer', 'cocktail', 'spirits', 'whiskey', 'whisky', 'vodka', 'gin', 'rum', 'tequila', 'bourbon', 'champagne', 'prosecco', 'alcohol', 'brewery', 'winery', 'bar '], emoji: '🍷' },
  { keywords: ['cake', 'dessert', 'cookie', 'cookies', 'cupcake', 'pastry', 'donut', 'doughnut', 'brownie', 'pie', 'pudding', 'ice cream', 'gelato', 'sorbet', 'chocolate', 'candy', 'sweets', 'treat', 'biscuit'], emoji: '🍰' },
  { keywords: ['fruit', 'apple', 'banana', 'orange', 'mango', 'pineapple', 'strawberry', 'blueberry', 'raspberry', 'watermelon', 'peach', 'plum', 'cherry', 'berry', 'berries', 'grapes', 'melon', 'pear', 'kiwi'], emoji: '🍎' },
  { keywords: ['egg', 'eggs', 'omelette', 'omelet', 'scrambled', 'poached', 'fried egg', 'boiled egg', 'frittata'], emoji: '🥚' },
  { keywords: ['bread', 'sourdough', 'loaf', 'bun', 'roll', 'muffin', 'croissant', 'focaccia', 'pita'], emoji: '🍞' },
  { keywords: ['rice', 'quinoa', 'grain', 'oats', 'oatmeal', 'porridge', 'cereal', 'granola'], emoji: '🍚' },

  // ── Grocery & Shopping ────────────────────────────────────────────────────
  { keywords: ['grocery', 'groceries', 'supermarket', 'food shop', 'food shopping', 'food store', 'farmers market', 'market', 'provisions', 'costco', 'walmart', 'trader joe', 'whole foods', 'aldi', 'lidl', 'safeway', 'kroger', 'publix'], emoji: '🛒' },
  { keywords: ['shop', 'shopping', 'buy', 'purchase', 'order online', 'pick up', 'pickup', 'browse', 'retail', 'amazon', 'ebay', 'etsy', 'best buy', 'target store', 'mall', 'outlet'], emoji: '🛍️' },
  { keywords: ['return item', 'refund', 'exchange item', 'ship back', 'return package', 'return order'], emoji: '↩️' },
  { keywords: ['package', 'delivery', 'deliver', 'parcel', 'shipment', 'tracking', 'fedex', 'ups', 'usps', 'dhl', 'courier', 'mailbox', 'post office'], emoji: '📦' },
  { keywords: ['clothes', 'clothing', 'outfit', 'wardrobe', 'jeans', 'shirt', 'shoes', 'sneakers', 'boots', 'jacket', 'coat', 'dress', 'suit', 'uniform', 'laundry list'], emoji: '👗' },

  // ── Fitness & Exercise ────────────────────────────────────────────────────
  { keywords: ['gym', 'lift', 'lifting', 'weights', 'weight training', 'strength training', 'bench press', 'squat', 'deadlift', 'pull-up', 'pullup', 'push-up', 'pushup', 'dumbbell', 'barbell', 'kettlebell', 'resistance'], emoji: '🏋️' },
  { keywords: ['run', 'running', 'jog', 'jogging', 'sprint', 'sprinting', '5k', '10k', 'half marathon', 'marathon', 'parkrun', 'treadmill', 'race', 'running shoes'], emoji: '🏃' },
  { keywords: ['cycling', 'bike', 'biking', 'bicycle', 'spin class', 'spinning', 'peloton', 'road bike', 'mountain bike', 'bmx'], emoji: '🚴' },
  { keywords: ['yoga', 'meditation', 'meditate', 'mindfulness', 'breathwork', 'breathe', 'breathing exercise', 'stretch', 'stretching', 'flexibility', 'pilates', 'barre', 'tai chi', 'qigong'], emoji: '🧘' },
  { keywords: ['swim', 'swimming', 'pool', 'laps', 'aqua', 'freestyle', 'breaststroke', 'backstroke', 'snorkel', 'scuba', 'diving'], emoji: '🏊' },
  { keywords: ['hike', 'hiking', 'trail', 'climb', 'climbing', 'rock climbing', 'bouldering', 'mountaineer', 'trekking', 'backpacking trail', 'summit'], emoji: '🥾' },
  { keywords: ['boxing', 'martial art', 'kickboxing', 'fight', 'sparring', 'mma', 'karate', 'judo', 'jiu jitsu', 'muay thai', 'wrestling', 'taekwondo'], emoji: '🥊' },
  { keywords: ['workout', 'exercise', 'training session', 'fitness', 'cardio', 'hiit', 'crossfit', 'orange theory', 'f45', 'bootcamp', 'circuit', 'active recovery', 'cooldown', 'warm up', 'warmup'], emoji: '🤸' },
  { keywords: ['walk', 'walking', 'steps', 'stroll', 'daily walk', 'evening walk', 'morning walk', 'power walk', 'pedometer'], emoji: '🚶' },
  { keywords: ['soccer', 'football', 'basketball', 'tennis', 'volleyball', 'baseball', 'softball', 'cricket', 'rugby', 'hockey', 'lacrosse', 'badminton', 'squash', 'racket', 'court', 'field', 'pitch', 'match', 'game day', 'sport', 'sports', 'league', 'tournament'], emoji: '⚽' },
  { keywords: ['golf', 'driving range', 'putt', 'putting', 'tee time', 'caddy', 'fairway', 'green'], emoji: '⛳' },
  { keywords: ['surf', 'surfing', 'skateboard', 'snowboard', 'ski', 'skiing', 'paddleboard', 'wakeboard', 'kayak', 'canoe', 'rowing'], emoji: '🏄' },
  { keywords: ['protein', 'whey', 'creatine', 'pre-workout', 'pre workout', 'post workout', 'recovery shake', 'bcaa', 'amino'], emoji: '💪' },

  // ── Health & Medical ──────────────────────────────────────────────────────
  { keywords: ['doctor', 'physician', 'gp', 'general practitioner', 'primary care', 'checkup', 'check-up', 'annual physical', 'physical exam', 'clinic', 'hospital', 'urgent care', 'er ', 'emergency room', 'outpatient'], emoji: '🏥' },
  { keywords: ['dentist', 'dental', 'teeth cleaning', 'tooth', 'cavity', 'filling', 'braces', 'orthodontist', 'root canal', 'crown', 'floss', 'mouthwash'], emoji: '🦷' },
  { keywords: ['medicine', 'medication', 'pill', 'pills', 'prescription', 'pharmacy', 'drug', 'vitamin', 'supplement', 'antibiotic', 'ibuprofen', 'aspirin', 'tylenol', 'advil', 'dose', 'dosage', 'refill prescription', 'cvs', 'walgreens', 'boots'], emoji: '💊' },
  { keywords: ['therapy', 'therapist', 'counseling', 'counselling', 'psychologist', 'psychiatrist', 'mental health', 'cbt', 'cognitive', 'grief', 'trauma', 'ptsd', 'anxiety treatment', 'depression treatment', 'wellbeing session', 'coaching session'], emoji: '🧠' },
  { keywords: ['appointment', 'specialist', 'referral', 'follow-up appointment', 'dermatologist', 'cardiologist', 'neurologist', 'ophthalmologist', 'optometrist', 'eye exam', 'hearing test', 'audiologist', 'physio', 'physiotherapy', 'chiropractor', 'osteopath'], emoji: '🩺' },
  { keywords: ['blood test', 'blood work', 'lab test', 'bloodwork', 'lab results', 'biopsy', 'scan', 'mri', 'ct scan', 'ultrasound', 'x-ray', 'xray', 'ecg', 'ekg', 'cholesterol', 'glucose', 'hemoglobin'], emoji: '🩸' },
  { keywords: ['vaccine', 'vaccination', 'booster', 'flu shot', 'immunisation', 'immunization', 'jab', 'shot appointment'], emoji: '💉' },
  { keywords: ['sleep', 'nap', 'rest day', 'bed', 'insomnia', 'sleep schedule', 'bedtime', 'wake up', 'alarm', 'tired', 'fatigue', 'recovery', 'wind down'], emoji: '😴' },
  { keywords: ['bath', 'shower', 'hygiene', 'grooming', 'haircut', 'hair appointment', 'barber', 'salon', 'nail', 'nails', 'manicure', 'pedicure', 'wax', 'facial', 'spa', 'massage', 'skincare', 'moisturize', 'moisturise', 'sunscreen'], emoji: '🛁' },

  // ── Work & Productivity ───────────────────────────────────────────────────
  { keywords: ['meeting', 'standup', 'stand-up', 'scrum', 'conference', 'zoom call', 'zoom meeting', 'teams call', 'teams meeting', 'google meet', 'webinar', 'video call', 'sync', 'one-on-one', '1:1', 'all hands', 'town hall', 'board meeting', 'client call', 'client meeting'], emoji: '🤝' },
  { keywords: ['email', 'inbox', 'inbox zero', 'reply', 'draft email', 'send email', 'newsletter', 'subscribe', 'unsubscribe', 'mailing list', 'outlook', 'gmail', 'inbox management'], emoji: '📧' },
  { keywords: ['report', 'analysis', 'analytics', 'dashboard', 'data', 'spreadsheet', 'excel', 'google sheets', 'tableau', 'looker', 'chart', 'graph', 'metric', 'kpi', 'statistics', 'stats'], emoji: '📊' },
  { keywords: ['presentation', 'slides', 'powerpoint', 'keynote', 'google slides', 'deck', 'pitch deck', 'slide deck', 'present', 'demo', 'show'], emoji: '📋' },
  { keywords: ['deadline', 'due date', 'submit', 'submission', 'deliver', 'delivery', 'hand in', 'hand-in', 'turn in', 'by eod', 'by end of day', 'by cob', 'by friday'], emoji: '⏰' },
  { keywords: ['project', 'sprint', 'milestone', 'launch', 'go-live', 'release', 'deploy', 'deployment', 'rollout', 'ship it', 'shipping'], emoji: '🚀' },
  { keywords: ['interview', 'candidate', 'hire', 'hiring', 'onboard', 'onboarding', 'recruit', 'recruitment', 'headhunt', 'job posting', 'resume', 'cv', 'cover letter', 'references', 'offer letter'], emoji: '💼' },
  { keywords: ['review', 'feedback', 'approve', 'approval', 'sign off', 'sign-off', 'peer review', 'code review', 'pull request', 'pr review', 'qa review', 'quality check', 'proofread'], emoji: '✅' },
  { keywords: ['brainstorm', 'ideate', 'strategy', 'strategic', 'planning session', 'workshop', 'offsite', 'hackathon', 'design sprint', 'whiteboard', 'retrospective', 'retro', 'post mortem', 'post-mortem'], emoji: '💡' },
  { keywords: ['contract', 'proposal', 'statement of work', 'sow', 'rfp', 'rfq', 'quote', 'estimate', 'scope', 'agreement', 'nda', 'terms', 'legal'], emoji: '📝' },
  { keywords: ['task', 'to-do', 'todo', 'action item', 'checklist', 'backlog', 'ticket', 'jira', 'trello', 'asana', 'notion', 'monday'], emoji: '☑️' },

  // ── Finance & Money ───────────────────────────────────────────────────────
  { keywords: ['pay bill', 'payment', 'invoice', 'bill ', 'bills', 'utility bill', 'utilities', 'rent', 'mortgage', 'subscription', 'auto-pay', 'autopay', 'direct debit', 'standing order', 'credit card bill'], emoji: '💳' },
  { keywords: ['budget', 'budgeting', 'personal finance', 'financial plan', 'expense', 'expenses', 'spending', 'net worth', 'savings goal', 'monthly budget', 'track spending', 'ynab', 'mint '], emoji: '💰' },
  { keywords: ['bank', 'banking', 'transfer', 'wire transfer', 'bank transfer', 'deposit', 'withdraw', 'withdrawal', 'atm', 'savings account', 'checking account', 'current account', 'open account', 'close account', 'chase ', 'wells fargo', 'bank of america', 'barclays', 'hsbc', 'lloyds'], emoji: '🏦' },
  { keywords: ['invest', 'investing', 'investment', 'stock', 'stocks', 'etf', 'index fund', 'mutual fund', 'portfolio', 'dividend', 'crypto', 'bitcoin', 'ethereum', 'nft', 'brokerage', 'fidelity', 'vanguard', 'schwab', 'robinhood', 'wealthfront', 'betterment'], emoji: '📈' },
  { keywords: ['tax', 'taxes', 'irs', 'hmrc', 'tax return', 'tax filing', 'tax refund', 'accountant', 'deduction', 'write-off', 'w2', 'w-2', '1099', 'turbotax', 'h&r block', 'self assessment', 'vat'], emoji: '🧾' },
  { keywords: ['insurance', 'policy', 'premium', 'claim', 'coverage', 'deductible', 'co-pay', 'copay', 'health insurance', 'life insurance', 'car insurance', 'home insurance', 'renters insurance', 'geico', 'progressive', 'aetna', 'blue cross', 'cigna'], emoji: '🛡️' },
  { keywords: ['loan', 'mortgage application', 'refinance', 'student loan', 'personal loan', 'pay off debt', 'debt', 'credit score', 'credit report', 'equifax', 'experian', 'transunion'], emoji: '🏛️' },

  // ── Home & Chores ─────────────────────────────────────────────────────────
  { keywords: ['clean', 'cleaning', 'tidy', 'tidying', 'declutter', 'clutter', 'deep clean', 'spring clean', 'organiz', 'sort through', 'clear out', 'wipe down', 'disinfect', 'sanitize', 'sanitise'], emoji: '🧹' },
  { keywords: ['laundry', 'wash clothes', 'dry cleaning', 'ironing', 'iron clothes', 'fold clothes', 'folding', 'dryer', 'washer', 'washing machine'], emoji: '🧺' },
  { keywords: ['vacuum', 'hoover', 'mop', 'mop floor', 'scrub', 'scrubbing', 'dust', 'dusting', 'sweep', 'sweeping', 'swiffer', 'steam clean'], emoji: '🫧' },
  { keywords: ['fix', 'repair', 'maintenance', 'service appliance', 'plumber', 'plumbing', 'electrician', 'electrical', 'handyman', 'replace filter', 'change filter', 'hvac', 'furnace', 'boiler', 'ac unit', 'air conditioner', 'leak', 'pipe', 'faucet', 'toilet', 'drain'], emoji: '🔧' },
  { keywords: ['garden', 'gardening', 'plant', 'plants', 'water plants', 'mow lawn', 'mowing', 'lawn', 'weed', 'weeding', 'trim hedge', 'prune', 'pruning', 'compost', 'seeds', 'seedlings', 'potting', 'flower bed', 'vegetable garden', 'herb garden', 'landscaping'], emoji: '🌿' },
  { keywords: ['move house', 'moving house', 'moving day', 'pack boxes', 'packing boxes', 'unpack', 'unpacking', 'storage unit', 'storage room', 'declutter for move', 'movers', 'moving truck', 'self storage'], emoji: '🏠' },
  { keywords: ['decor', 'decoration', 'furniture', 'interior design', 'renovate', 'renovation', 'paint wall', 'paint room', 'wallpaper', 'flooring', 'carpet', 'tile', 'curtains', 'blinds', 'shelving', 'ikea', 'assemble furniture'], emoji: '🛋️' },
  { keywords: ['trash', 'garbage', 'take out trash', 'rubbish', 'bin', 'bins', 'recycle', 'recycling', 'food waste', 'composting', 'junk removal', 'dump run'], emoji: '🗑️' },
  { keywords: ['dishes', 'dishwasher', 'wash dishes', 'sink', 'kitchen clean', 'wipe counter', 'countertop', 'clean oven', 'clean fridge', 'clean microwave', 'clean stove'], emoji: '🍽️' },
  { keywords: ['grocery list', 'shopping list', 'restock', 'pantry', 'stock up', 'run out of', 'we need', 'out of milk', 'out of bread'], emoji: '📋' },
  { keywords: ['pest control', 'exterminator', 'mouse trap', 'ant', 'cockroach', 'bug spray', 'rodent'], emoji: '🐛' },

  // ── Learning & Education ──────────────────────────────────────────────────
  { keywords: ['study', 'studying', 'homework', 'assignment', 'exam', 'test prep', 'quiz', 'midterm', 'final exam', 'revision', 'revise', 'cramming', 'flashcards', 'practice test', 'mock exam'], emoji: '📖' },
  { keywords: ['read', 'reading', 'book', 'novel', 'nonfiction', 'chapter', 'ebook', 'audiobook', 'kindle', 'library', 'goodreads', 'bookclub', 'book club'], emoji: '📚' },
  { keywords: ['course', 'class', 'lesson', 'lecture', 'tutorial', 'online course', 'udemy', 'coursera', 'edx', 'skillshare', 'masterclass', 'linkedin learning', 'pluralsight', 'seminar', 'workshop', 'certification', 'certificate', 'degree', 'college', 'university'], emoji: '🎓' },
  { keywords: ['note', 'notes', 'notebook', 'journal', 'diary', 'write down', 'jot down', 'memo', 'log', 'record', 'annotate'], emoji: '📝' },
  { keywords: ['research', 'article', 'paper', 'thesis', 'dissertation', 'literature review', 'abstract', 'bibliography', 'citation', 'peer reviewed', 'academic', 'study findings', 'findings'], emoji: '🔍' },
  { keywords: ['language learning', 'vocabulary', 'duolingo', 'babbel', 'rosetta stone', 'grammar', 'practice language', 'flashcard', 'speaking practice', 'spanish', 'french', 'german', 'mandarin', 'japanese', 'portuguese', 'italian', 'korean', 'arabic', 'russian'], emoji: '🗣️' },
  { keywords: ['code', 'coding', 'programming', 'develop', 'developer', 'software development', 'debug', 'debugging', 'algorithm', 'leetcode', 'hackerrank', 'github', 'git commit', 'pull request', 'refactor', 'api', 'database', 'sql', 'python', 'javascript', 'typescript', 'swift', 'kotlin', 'java', 'rust', 'golang'], emoji: '💻' },
  { keywords: ['math', 'maths', 'mathematics', 'algebra', 'calculus', 'statistics', 'probability', 'geometry', 'accounting math', 'calculation'], emoji: '🔢' },

  // ── Social & Relationships ────────────────────────────────────────────────
  { keywords: ['birthday', 'bday', 'birthday party', 'happy birthday', 'birth day', 'sweet 16', 'quinceañera', 'bar mitzvah', 'bat mitzvah'], emoji: '🎂' },
  { keywords: ['anniversary', 'celebration', 'celebrate', 'party planning', 'party', 'graduation party', 'retirement party', 'welcome party', 'farewell party', 'house warming', 'housewarming'], emoji: '🎉' },
  { keywords: ['gift', 'present', 'gift ideas', 'gift wrap', 'wrapping', 'greeting card', 'thank you card', 'thank you note', 'send card', 'get gift', 'buy gift'], emoji: '🎁' },
  { keywords: ['friend', 'friends', 'catch up', 'hang out', 'hangout', 'brunch with', 'coffee with', 'drinks with', 'dinner with', 'lunch with', 'meet up', 'meetup', 'social event', 'get together', 'game night'], emoji: '👥' },
  { keywords: ['date night', 'romantic dinner', 'partner', 'couple', 'romance', 'valentine', "valentine's day", 'relationship'], emoji: '❤️' },
  { keywords: ['wedding', 'engagement', 'proposal', 'bachelor', 'bachelorette', 'bridal shower', 'bridal party', 'maid of honor', 'best man', 'vows', 'venue', 'catering', 'rsvp wedding', 'honeymoon'], emoji: '💒' },
  { keywords: ['family', 'parent', 'mom', 'dad', 'sibling', 'brother', 'sister', 'grandparent', 'grandma', 'grandpa', 'relative', 'family reunion', 'visit family', 'family dinner', 'family trip', 'child care', 'childcare', 'babysitter', 'daycare', 'school run', 'pick up kids'], emoji: '👨‍👩‍👧' },
  { keywords: ['networking', 'network event', 'linkedin', 'business card', 'conference networking', 'industry event', 'professional event', 'alumni', 'chamber of commerce'], emoji: '🤝' },
  { keywords: ['volunteer', 'volunteering', 'donate', 'donation', 'charity', 'nonprofit', 'community service', 'food bank', 'shelter', 'fundraiser', 'fundraising', 'giveback', 'pay it forward'], emoji: '💛' },

  // ── Travel & Transport ────────────────────────────────────────────────────
  { keywords: ['flight', 'fly', 'flying', 'airport', 'airline', 'boarding pass', 'check in flight', 'gate', 'departure', 'arrival', 'layover', 'passport', 'visa', 'travel document', 'customs', 'immigration'], emoji: '✈️' },
  { keywords: ['hotel', 'airbnb', 'vrbo', 'hostel', 'accommodation', 'book hotel', 'hotel check in', 'hotel checkout', 'resort', 'motel', 'bed and breakfast', 'b&b', 'lodging', 'reservation'], emoji: '🏨' },
  { keywords: ['car', 'drive', 'driving', 'vehicle', 'oil change', 'tire rotation', 'tire change', 'tyre', 'car registration', 'dmv', 'mot', 'car insurance', 'car service', 'car wash', 'gas', 'petrol', 'fuel', 'roadtrip', 'road trip', 'rental car', 'car rental'], emoji: '🚗' },
  { keywords: ['train', 'rail', 'amtrak', 'eurostar', 'subway', 'metro', 'underground', 'bus', 'transit', 'commute', 'transit card', 'oyster card', 'monthly pass', 'season ticket', 'uber', 'lyft', 'rideshare', 'taxi'], emoji: '🚆' },
  { keywords: ['trip', 'travel', 'vacation', 'holiday', 'itinerary', 'sightseeing', 'tour', 'excursion', 'day trip', 'weekend trip', 'getaway', 'explore', 'adventure', 'backpack', 'backpacking', 'cruise', 'road trip planning'], emoji: '🗺️' },
  { keywords: ['pack', 'packing', 'suitcase', 'luggage', 'baggage', 'travel bag', 'carry-on', 'check bag', 'toiletries bag', 'travel checklist'], emoji: '🎒' },
  { keywords: ['bike to', 'cycle to', 'bicycle commute', 'e-bike', 'scooter', 'skateboard commute', 'walk to work', 'public transport'], emoji: '🚲' },

  // ── Creativity & Hobbies ──────────────────────────────────────────────────
  { keywords: ['draw', 'drawing', 'sketch', 'sketching', 'illustration', 'illustrate', 'painting', 'watercolor', 'watercolour', 'oil paint', 'acrylic', 'canvas', 'art project', 'digital art', 'procreate', 'adobe illustrator', 'figma design', 'ui design', 'ux design', 'graphic design', 'logo design'], emoji: '🎨' },
  { keywords: ['music', 'song', 'songs', 'guitar', 'piano', 'keyboard', 'drums', 'violin', 'bass', 'ukulele', 'saxophone', 'practice instrument', 'compose', 'composing', 'playlist', 'concert', 'gig', 'rehearsal', 'band practice', 'recording', 'studio', 'mixing', 'mastering', 'spotify', 'apple music'], emoji: '🎵' },
  { keywords: ['photo', 'photograph', 'photography', 'camera', 'edit photo', 'lightroom', 'photoshop', 'shoot', 'portrait', 'landscape photo', 'street photography', 'wedding photography', 'headshots', 'photo album', 'print photos'], emoji: '📸' },
  { keywords: ['video', 'film', 'filmmaking', 'movie', 'documentary', 'edit video', 'premiere pro', 'final cut', 'davinci resolve', 'youtube', 'streaming', 'twitch', 'podcast', 'record podcast', 'episode', 'vlog', 'reel', 'tiktok'], emoji: '🎬' },
  { keywords: ['write', 'writing', 'draft', 'blog post', 'essay', 'script', 'story', 'short story', 'creative writing', 'journaling', 'morning pages', 'substack', 'medium article', 'copywriting'], emoji: '✍️' },
  { keywords: ['craft', 'sewing', 'knitting', 'crochet', 'crocheting', 'embroidery', 'needlework', 'quilting', 'woodwork', 'woodworking', 'carpentry', 'diy project', 'maker', 'scrapbook', 'origami', 'calligraphy', 'candle making', 'soap making', 'jewelry making', 'pottery', 'ceramics'], emoji: '✂️' },
  { keywords: ['game', 'gaming', 'video game', 'chess', 'puzzle', 'jigsaw', 'board game', 'card game', 'poker', 'dungeons', 'tabletop', 'roleplay', 'rpg', 'playstation', 'xbox', 'nintendo', 'steam', 'warcraft', 'minecraft', 'fortnite'], emoji: '🎮' },
  { keywords: ['read comic', 'manga', 'graphic novel', 'anime', 'cosplay', 'convention', 'con '], emoji: '📖' },
  { keywords: ['cook new recipe', 'try recipe', 'bake something', 'experimental cook', 'food experiment'], emoji: '👨‍🍳' },

  // ── Kids & Pets ───────────────────────────────────────────────────────────
  { keywords: ['baby', 'infant', 'toddler', 'diaper', 'nappy', 'formula', 'nursery', 'newborn', 'feeding', 'burp', 'swaddle', 'baby shower', 'baby proofing', 'babyproof', 'stroller', 'pram', 'pushchair'], emoji: '👶' },
  { keywords: ['kids activities', 'school pickup', 'school drop off', 'after school', 'playdate', 'play date', 'extracurricular', 'homework help', 'tutor', 'tutoring', 'child', 'children'], emoji: '🧒' },
  { keywords: ['dog', 'puppy', 'vet appointment', 'pet', 'walk dog', 'feed dog', 'groom dog', 'dog food', 'dog grooming', 'dog training', 'doggy daycare', 'kennel', 'flea treatment', 'heartworm', 'vaccinate dog'], emoji: '🐶' },
  { keywords: ['cat', 'kitten', 'litter box', 'litter', 'feed cat', 'cat food', 'vet cat', 'scratch post', 'cat grooming', 'vaccinate cat', 'neuter'], emoji: '🐱' },
  { keywords: ['fish tank', 'aquarium', 'fish food', 'tank clean', 'rabbit', 'hamster', 'guinea pig', 'bird', 'parrot', 'horse', 'stable', 'pet food', 'pet supplies'], emoji: '🐠' },

  // ── Tech & Devices ────────────────────────────────────────────────────────
  { keywords: ['phone', 'mobile phone', 'cell phone', 'iphone', 'android phone', 'smartphone', 'phone plan', 'phone bill', 'screen protector', 'phone case', 'phone repair', 'carrier', 'sim card'], emoji: '📱' },
  { keywords: ['laptop', 'computer repair', 'pc', 'desktop', 'mac ', 'macbook', 'imac', 'reboot', 'restart computer', 'blue screen', 'slow computer', 'computer setup', 'printer', 'scanner', 'monitor', 'keyboard', 'mouse', 'trackpad'], emoji: '💻' },
  { keywords: ['backup', 'backup data', 'cloud backup', 'time machine', 'external drive', 'hard drive', 'ssd', 'usb drive', 'data recovery', 'google drive', 'icloud', 'dropbox', 'onedrive'], emoji: '💾' },
  { keywords: ['update', 'upgrade', 'install app', 'software update', 'app update', 'system update', 'patch', 'firmware', 'driver update', 'os update', 'windows update', 'macos update', 'ios update', 'android update'], emoji: '🔄' },
  { keywords: ['charge', 'charger', 'battery', 'battery life', 'power bank', 'cable', 'charging cable', 'wireless charger', 'magsafe', 'power supply', 'surge protector'], emoji: '🔋' },
  { keywords: ['password', 'password manager', 'security', 'two-factor', '2fa', 'authenticator', 'login', 'account security', 'credentials', 'bitwarden', '1password', 'lastpass', 'keychain', 'vpn'], emoji: '🔐' },
  { keywords: ['wifi', 'wi-fi', 'router', 'internet', 'broadband', 'fibre', 'fiber', 'network', 'ethernet', 'modem', 'isp', 'internet provider', 'internet outage', 'internet setup'], emoji: '📡' },
  { keywords: ['smart home', 'alexa', 'google home', 'smart speaker', 'smart tv', 'streaming device', 'roku', 'apple tv', 'chromecast', 'nest', 'ring doorbell', 'security camera', 'smart lock', 'smart bulb'], emoji: '🏠' },
  { keywords: ['headphones', 'airpods', 'earbuds', 'earphones', 'speaker', 'soundbar', 'bluetooth', 'audio'], emoji: '🎧' },

  // ── Admin & Bureaucracy ───────────────────────────────────────────────────
  { keywords: ['schedule', 'scheduling', 'calendar', 'agenda', 'time block', 'time blocking', 'timetable', 'booking', 'plan week', 'plan month', 'weekly plan', 'monthly plan'], emoji: '📅' },
  { keywords: ['document', 'paperwork', 'form', 'fill out form', 'application form', 'permit', 'license', 'licence', 'notarize', 'notary', 'apostille', 'legal document', 'deed', 'certificate', 'birth certificate', 'social security', 'passport renewal', 'id renewal', 'driver license renewal'], emoji: '📄' },
  { keywords: ['file', 'folder', 'archive', 'organize files', 'file management', 'scan document', 'shred', 'shredding'], emoji: '🗂️' },
  { keywords: ['call ', 'phone call', 'ring ', 'contact ', 'reach out', 'follow up', 'follow-up', 'check in with', 'touch base', 'ping'], emoji: '📞' },
  { keywords: ['remind', 'reminder', 'set alarm', 'set reminder', 'notify', 'notification', 'alert', 'dont forget', "don't forget"], emoji: '🔔' },
  { keywords: ['goal', 'goals', 'objective', 'okr', 'kpi', 'target', 'achieve', 'milestone', 'vision board', 'resolution', 'new year resolution'], emoji: '🎯' },
  { keywords: ['habit', 'habit tracker', 'routine', 'daily routine', 'morning routine', 'evening routine', 'weekly routine', 'streak', 'check-in', 'daily practice'], emoji: '🔁' },
  { keywords: ['moving to', 'new apartment', 'new house', 'new home', 'new city', 'relocation', 'relocate'], emoji: '🏠' },
  { keywords: ['cancel subscription', 'cancel membership', 'unsubscribe', 'downgrade plan', 'upgrade plan', 'manage subscription'], emoji: '🗑️' },
  { keywords: ['post', 'mail', 'send letter', 'send parcel', 'post office', 'stamp', 'envelope', 'mailbox', 'po box'], emoji: '✉️' },
  { keywords: ['print', 'printing', 'printer', 'photocopy', 'copy', 'fax', 'laminate'], emoji: '🖨️' },
  { keywords: ['sign', 'signing', 'signature', 'e-sign', 'docusign', 'hellosign'], emoji: '✍️' },

  // ── Mental Health & Wellbeing ─────────────────────────────────────────────
  { keywords: ['gratitude', 'gratitude journal', 'grateful', 'affirmation', 'affirmations', 'positive thinking', 'self love', 'self-love', 'self care', 'self-care', 'mindset'], emoji: '🌟' },
  { keywords: ['stress', 'anxiety', 'overwhelm', 'burn out', 'burnout', 'mental break', 'take a break', 'unplug', 'digital detox', 'decompress'], emoji: '🌬️' },
  { keywords: ['celebrate win', 'reward myself', 'treat myself', 'celebrate progress', 'small win'], emoji: '🏆' },

  // ── Outdoors & Nature ─────────────────────────────────────────────────────
  { keywords: ['park', 'nature walk', 'nature', 'outside', 'outdoor', 'outdoors', 'fresh air', 'sunshine', 'sunlight', 'morning light'], emoji: '🌳' },
  { keywords: ['camp', 'camping', 'campfire', 'tent', 'wilderness', 'national park', 'forest', 'woods', 'lake', 'river', 'beach', 'coast', 'seaside', 'ocean', 'mountains', 'hills', 'countryside'], emoji: '🏕️' },
  { keywords: ['sunrise', 'sunset', 'stargazing', 'moon', 'stars', 'astrophotography', 'telescope', 'eclipse'], emoji: '🌅' },
  { keywords: ['weather', 'rain', 'snow', 'storm', 'wind', 'fog', 'humidity', 'temperature', 'forecast', 'umbrella', 'waterproof', 'winter gear'], emoji: '🌦️' },
  { keywords: ['bird watch', 'birdwatching', 'binoculars', 'wildlife', 'nature reserve', 'safari', 'zoo', 'aquarium visit'], emoji: '🦅' },

  // ── Spiritual & Mindful ───────────────────────────────────────────────────
  { keywords: ['pray', 'prayer', 'church', 'mosque', 'temple', 'synagogue', 'worship', 'faith', 'devotion', 'bible', 'quran', 'torah', 'scripture', 'spiritual', 'spirituality'], emoji: '🙏' },
  { keywords: ['fast', 'fasting', 'intermittent fast', 'ramadan', 'lent', 'yom kippur', 'spiritual fast'], emoji: '🌙' },

];

/** Default emoji when no keyword matches. */
const DEFAULT_EMOJI = '📅';

/**
 * Returns an emoji that best represents the task title.
 * Uses simple substring keyword matching — O(n) over the map, no external deps.
 */
export function getTaskEmoji(title: string): string {
  if (!title) return DEFAULT_EMOJI;

  const lower = title.toLowerCase();

  for (const entry of EMOJI_MAP) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) {
        return entry.emoji;
      }
    }
  }

  return DEFAULT_EMOJI;
}
