export interface Quote {
  text: string;
  author: string;
}

export const MOTIVATIONAL_QUOTES: Quote[] = [
  // Marcus Aurelius
  { text: "You have power over your mind, not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "The happiness of your life depends upon the quality of your thoughts.", author: "Marcus Aurelius" },
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
  { text: "Accept the things to which fate binds you, and love the people with whom fate brings you together.", author: "Marcus Aurelius" },
  { text: "Do not indulge in dreams of what you do not have, but count the blessings you actually possess.", author: "Marcus Aurelius" },
  { text: "Loss is nothing else but change, and change is nature's delight.", author: "Marcus Aurelius" },
  { text: "Very little is needed to make a happy life; it is all within yourself, in your way of thinking.", author: "Marcus Aurelius" },

  // Seneca
  { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca" },
  { text: "Life is long if you know how to use it.", author: "Seneca" },
  { text: "It is not that I'm brave; it is that I value other things more than fear.", author: "Seneca" },
  { text: "He suffers more than necessary who suffers before it is necessary.", author: "Seneca" },
  { text: "Begin at once to live, and count each day as a separate life.", author: "Seneca" },
  { text: "Associate with people who are likely to improve you.", author: "Seneca" },
  { text: "Difficulties strengthen the mind, as labor does the body.", author: "Seneca" },
  { text: "Every new beginning comes from some other beginning's end.", author: "Seneca" },

  // Epictetus
  { text: "It's not what happens to you, but how you react to it that matters.", author: "Epictetus" },
  { text: "First say to yourself what you would be; then do what you have to do.", author: "Epictetus" },
  { text: "No man is free who is not master of himself.", author: "Epictetus" },
  { text: "Make the best use of what is in your power, and take the rest as it happens.", author: "Epictetus" },
  { text: "Seek not the good in external things; seek it in yourself.", author: "Epictetus" },
  { text: "He is a wise man who does not grieve for the things which he has not, but rejoices for those which he has.", author: "Epictetus" },

  // Aristotle / Plato / Socrates
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "The whole is more than the sum of its parts.", author: "Aristotle" },
  { text: "Knowing yourself is the beginning of all wisdom.", author: "Aristotle" },
  { text: "The secret of change is to focus all of your energy not on fighting the old, but on building the new.", author: "Socrates" },
  { text: "An unexamined life is not worth living.", author: "Socrates" },
  { text: "The measure of a man is what he does with power.", author: "Plato" },

  // Winston Churchill
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "If you're going through hell, keep going.", author: "Winston Churchill" },
  { text: "We make a living by what we get, but we make a life by what we give.", author: "Winston Churchill" },
  { text: "Attitude is a little thing that makes a big difference.", author: "Winston Churchill" },

  // Theodore Roosevelt
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Nothing in the world is worth having or worth doing unless it means effort, pain, difficulty.", author: "Theodore Roosevelt" },

  // Abraham Lincoln
  { text: "Give me six hours to chop down a tree and I will spend the first four sharpening the axe.", author: "Abraham Lincoln" },
  { text: "In the end, it's not the years in your life that count. It's the life in your years.", author: "Abraham Lincoln" },

  // Nelson Mandela
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela" },
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },

  // Martin Luther King Jr.
  { text: "If you can't fly, then run. If you can't run, then walk. If you can't walk, then crawl. But whatever you do, keep moving.", author: "Martin Luther King Jr." },
  { text: "Darkness cannot drive out darkness; only light can do that. Hate cannot drive out hate; only love can do that.", author: "Martin Luther King Jr." },
  { text: "The time is always right to do what is right.", author: "Martin Luther King Jr." },

  // Mahatma Gandhi
  { text: "Be the change you wish to see in the world.", author: "Mahatma Gandhi" },
  { text: "Strength does not come from physical capacity. It comes from an indomitable will.", author: "Mahatma Gandhi" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },

  // Eleanor Roosevelt
  { text: "You gain strength, courage, and confidence by every experience in which you really stop to look fear in the face.", author: "Eleanor Roosevelt" },
  { text: "Do one thing every day that scares you.", author: "Eleanor Roosevelt" },
  { text: "The purpose of life is to live it, to taste experience to the utmost, to reach out eagerly without fear for newer and richer experience.", author: "Eleanor Roosevelt" },

  // Albert Einstein
  { text: "Imagination is more important than knowledge.", author: "Albert Einstein" },
  { text: "Life is like riding a bicycle. To keep your balance, you must keep moving.", author: "Albert Einstein" },
  { text: "A person who never made a mistake never tried anything new.", author: "Albert Einstein" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },

  // Steve Jobs
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },

  // Maya Angelou
  { text: "You will face many defeats in life, but never let yourself be defeated.", author: "Maya Angelou" },
  { text: "Nothing will work unless you do.", author: "Maya Angelou" },
  { text: "We may encounter many defeats but we must not be defeated.", author: "Maya Angelou" },

  // Ralph Waldo Emerson
  { text: "Do not go where the path may lead, go instead where there is no path and leave a trail.", author: "Ralph Waldo Emerson" },
  { text: "What lies behind you and what lies in front of you pales in comparison to what lies inside of you.", author: "Ralph Waldo Emerson" },
  { text: "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.", author: "Ralph Waldo Emerson" },

  // Henry David Thoreau
  { text: "Go confidently in the direction of your dreams. Live the life you have imagined.", author: "Henry David Thoreau" },
  { text: "It's not what you look at that matters, it's what you see.", author: "Henry David Thoreau" },

  // Ernest Hemingway
  { text: "There is nothing noble in being superior to your fellow man; true nobility is being superior to your former self.", author: "Ernest Hemingway" },
  { text: "The world breaks everyone, and afterward, many are stronger at the broken places.", author: "Ernest Hemingway" },

  // Rumi
  { text: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.", author: "Rumi" },
  { text: "Raise your words, not your voice. It is rain that grows flowers, not thunder.", author: "Rumi" },
  { text: "Start wherever you are and start small.", author: "Rumi" },

  // Friedrich Nietzsche
  { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },
  { text: "That which does not kill us makes us stronger.", author: "Friedrich Nietzsche" },
  { text: "You must have chaos within you to give birth to a dancing star.", author: "Friedrich Nietzsche" },

  // Muhammad Ali
  { text: "Don't count the days. Make the days count.", author: "Muhammad Ali" },
  { text: "I am the greatest. I said that even before I knew I was.", author: "Muhammad Ali" },
  { text: "Float like a butterfly, sting like a bee. The hands can't hit what the eyes can't see.", author: "Muhammad Ali" },

  // Michael Jordan
  { text: "I've missed more than 9,000 shots in my career. I've failed over and over and over again in my life. And that is why I succeed.", author: "Michael Jordan" },
  { text: "Obstacles don't have to stop you. If you run into a wall, don't turn around and give up. Figure out how to climb it, go through it, or work around it.", author: "Michael Jordan" },

  // John Wooden
  { text: "Don't let what you cannot do interfere with what you can do.", author: "John Wooden" },
  { text: "Things work out best for those who make the best of the way things work out.", author: "John Wooden" },
  { text: "Success is never final, failure is never fatal. It's courage that counts.", author: "John Wooden" },

  // Warren Buffett
  { text: "Someone is sitting in the shade today because someone planted a tree a long time ago.", author: "Warren Buffett" },
  { text: "The most important investment you can make is in yourself.", author: "Warren Buffett" },

  // Dale Carnegie
  { text: "Most of the important things in the world have been accomplished by people who kept on trying when there seemed to be no hope at all.", author: "Dale Carnegie" },
  { text: "Inaction breeds doubt and fear. Action breeds confidence and courage.", author: "Dale Carnegie" },

  // Bruce Lee
  { text: "Do not pray for an easy life, pray for the strength to endure a difficult one.", author: "Bruce Lee" },
  { text: "If you spend too much time thinking about a thing, you'll never get it done.", author: "Bruce Lee" },
  { text: "Knowing is not enough, we must apply. Willing is not enough, we must do.", author: "Bruce Lee" },

  // C.S. Lewis
  { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
  { text: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis" },

  // Viktor Frankl
  { text: "When we are no longer able to change a situation, we are challenged to change ourselves.", author: "Viktor Frankl" },
  { text: "Between stimulus and response there is a space. In that space is our power to choose our response.", author: "Viktor Frankl" },

  // Confucius
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "The man who moves a mountain begins by carrying away small stones.", author: "Confucius" },
  { text: "Our greatest glory is not in never falling, but in rising every time we fall.", author: "Confucius" },

  // Miscellaneous classics
  { text: "Act as if what you do makes a difference. It does.", author: "William James" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
  { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "Keep your face always toward the sunshine, and shadows will fall behind you.", author: "Walt Whitman" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "I attribute my success to this: I never gave or took any excuse.", author: "Florence Nightingale" },
];
