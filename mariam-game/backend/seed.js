const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Country = require("./models/Country");
const Category = require("./models/Category");
const Quiz = require("./models/Quiz");

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  // Clear existing data
  await Country.deleteMany({});
  await Category.deleteMany({});
  await Quiz.deleteMany({});
  console.log("Cleared existing data");

  // ════════════════════════════════════════
  // COUNTRIES
  // ════════════════════════════════════════
  await Country.insertMany([
    { name: "Egypt", continent: "Africa" },
    { name: "Germany", continent: "Europe" },
    { name: "China", continent: "Asia" },
  ]);
  console.log("Countries seeded");

  // ════════════════════════════════════════
  // CATEGORIES — EGYPT
  // ════════════════════════════════════════
  await Category.insertMany([
    // ── Egypt Food (no funFacts) ──────────
    {
      countryName: "Egypt",
      type: "food",
      name: "Feteer meshaltet",
      description:
        "A flaky, layered pastry that can be sweet (with honey and nuts) or savory (with cheese or meat). Often called the Egyptian pancake.",
      imageUrl: "",
      funFacts: [],
    },
    {
      countryName: "Egypt",
      type: "food",
      name: "Koshari",
      description:
        "Egypt's beloved national dish — a hearty mix of rice, lentils, macaroni, and crispy onions topped with spiced tomato sauce.",
      imageUrl: "",
      funFacts: [],
    },
    {
      countryName: "Egypt",
      type: "food",
      name: "Om Ali",
      description:
        "A warm, creamy bread pudding made with puff pastry, milk, nuts, and raisins. Often called Egypt's national dessert.",
      imageUrl: "",
      funFacts: [],
    },

    // ── Egypt Landmarks ───────────────────
    {
      countryName: "Egypt",
      type: "landmark",
      name: "The Cairo Tower",
      description:
        "A freestanding concrete tower in Cairo, the tallest structure in Egypt and North Africa.",
      imageUrl: "",
      funFacts: [
        "The Cairo Tower is 187 meters tall and was finished in 1961, making it one of the tallest structures in Egypt.",
        "Its unique pattern is inspired by the lotus flower, an important symbol in ancient Egyptian culture.",
        "From the top observation deck, you can sometimes see the Pyramids of Giza on a clear day.",
        "The tower was built to represent Egypt's independence and progress after the 1952 revolution.",
        "It stands on Gezira Island, right in the middle of the Nile River in Cairo.",
      ],
    },
    {
      countryName: "Egypt",
      type: "landmark",
      name: "The Pyramids of Giza",
      description:
        "The last surviving wonders of the ancient world, these monumental tombs and the iconic Sphinx have fascinated visitors for millennia.",
      imageUrl: "",
      funFacts: [
        "The Great Pyramid of Giza was built around 2560 BC for Pharaoh Khufu and was the tallest man-made structure in the world for over 3,800 years.",
        "The Sphinx, with the body of a lion and the head of a pharaoh, is believed to represent Pharaoh Khafre and was carved from a single block of limestone.",
        "The pyramids were originally covered in smooth white limestone casing stones that reflected the sun's light, making them shine brilliantly.",
        "The Great Pyramid consists of approximately 2.3 million stone blocks, some weighing up to 80 tonnes.",
        "The exact methods used to construct the pyramids remain a mystery, with theories ranging from ramps to levers to alien intervention.",
      ],
    },
    {
      countryName: "Egypt",
      type: "landmark",
      name: "Abu Simbel Temples",
      description:
        "Two massive rock temples in southern Egypt built by Pharaoh Ramesses II, famous for their colossal statues and solar alignment.",
      imageUrl: "",
      funFacts: [
        "The temples were carved out of a mountainside in the 13th century BC during the reign of Ramesses II.",
        "The Great Temple features four colossal statues of Ramesses II, each about 20 metres tall.",
        "The smaller temple is dedicated to Ramesses II's wife, Queen Nefertari, and features six statues.",
        "The temples were relocated in the 1960s to save them from flooding caused by the Aswan High Dam.",
        "The relocation project involved cutting the temples into large blocks and moving them piece by piece to a new location 65 metres higher and 200 metres back from the river.",
      ],
    },

    // ── Egypt Festivals ───────────────────
    {
      countryName: "Egypt",
      type: "festival",
      name: "Sham El-Nessim",
      description:
        "An ancient spring festival celebrated by all Egyptians regardless of religion, dating back over 4,500 years to the time of the Pharaohs.",
      imageUrl: "",
      funFacts: [
        "Sham El-Nessim is one of the oldest festivals in the world, with origins in ancient Egypt around 2700 BC.",
        'The name means "smelling the breeze" in Arabic.',
        "Families traditionally eat salted fish, spring onions, lettuce, and coloured eggs on this day.",
        "It is always celebrated on the Monday following Coptic Easter.",
        "Coloured eggs during Sham El-Nessim predate Easter egg traditions in Europe by thousands of years.",
      ],
    },
    {
      countryName: "Egypt",
      type: "festival",
      name: "Abu Simbel Sun Festival",
      description:
        "A twice-yearly event where the sun's rays illuminate the inner sanctuary of Pharaoh Ramesses II's temple — an ancient solar alignment marvel.",
      imageUrl: "",
      funFacts: [
        "The phenomenon occurs exactly on February 22nd (Ramesses II's coronation) and October 22nd (his birthday) every year.",
        "The sun travels 65 metres through a narrow corridor to light up three of the four statues inside the temple.",
        "The fourth statue, the god of the underworld Ptah, is never illuminated — possibly intentionally.",
        "The temple was built around 1264 BC and was relocated in the 1960s to save it from the rising Nile waters behind the Aswan High Dam.",
        "Engineers carefully moved the entire temple block by block to maintain the exact solar alignment after relocation.",
      ],
    },
    {
      countryName: "Egypt",
      type: "festival",
      name: "Eid Al-Fitr",
      description:
        "A major Islamic holiday marking the end of Ramadan, celebrated by Muslims around the world.",
      imageUrl: "",
      funFacts: [
        "Eid Al-Fitr means 'Festival of Breaking the Fast' in Arabic.",
        "The date of Eid Al-Fitr is determined by the sighting of the new moon, so it changes each year.",
        "It is a day of feasting, giving gifts, and charity to those in need.",
        "In Egypt, it is traditional to eat a sweet pastry called Kahk during Eid Al-Fitr.",
        "Eid Al-Fitr is one of the two major Islamic holidays, the other being Eid Al-Adha.",
      ],
    },

    // ════════════════════════════════════════
    // CATEGORIES — GERMANY
    // ════════════════════════════════════════

    // ── Germany Food (no funFacts) ────────
    {
      countryName: "Germany",
      type: "food",
      name: "Pretzels",
      description:
        "Soft, chewy, golden-brown baked bread twisted into a distinctive knot shape and sprinkled with coarse salt. A German bakery staple.",
      imageUrl: "",
      funFacts: [],
    },
    {
      countryName: "Germany",
      type: "food",
      name: "Bratwurst",
      description:
        "A classic German sausage made from pork, beef, or veal and typically grilled or pan-fried. Served at festivals and street markets across the country.",
      imageUrl: "",
      funFacts: [],
    },
    {
      countryName: "Germany",
      type: "food",
      name: "Black Forest Cake",
      description:
        "A rich chocolate sponge cake layered with whipped cream and cherries, topped with chocolate shavings. Named after the Black Forest region of Germany.",
      imageUrl: "",
      funFacts: [],
    },

    // ── Germany Landmarks ─────────────────
    {
      countryName: "Germany",
      type: "landmark",
      name: "Brandenburg Gate",
      description:
        "An 18th-century neoclassical monument in the heart of Berlin, once a symbol of division and now a symbol of unity.",
      imageUrl: "",
      funFacts: [
        "The Brandenburg Gate was built between 1788 and 1791, commissioned by King Frederick William II of Prussia.",
        "It is the only surviving gate of the original 18 gates that once surrounded Berlin.",
        "The gate was heavily damaged in World War II and sat in the no-man's land between East and West Berlin during the Cold War.",
        "After the Berlin Wall fell in 1989, the Brandenburg Gate became the symbol of German reunification.",
        "The Quadriga on top — a chariot pulled by four horses — was taken to Paris by Napoleon in 1806 and returned to Berlin in 1814.",
      ],
    },
    {
      countryName: "Germany",
      type: "landmark",
      name: "Neuschwanstein Castle",
      description:
        "A fairy-tale 19th-century palace perched on a rugged hill in the Bavarian Alps, the inspiration behind Disney's Sleeping Beauty Castle.",
      imageUrl: "",
      funFacts: [
        "Neuschwanstein Castle was commissioned by King Ludwig II of Bavaria in 1869 and was never actually finished.",
        "King Ludwig II only lived in the castle for 172 days before his mysterious death in 1886.",
        "The castle was inspired by the operas of composer Richard Wagner, whom Ludwig deeply admired.",
        "Walt Disney visited Neuschwanstein in the 1950s and used it as the model for Sleeping Beauty Castle at Disneyland.",
        "Over 1.3 million people visit Neuschwanstein each year, making it one of the most visited castles in Europe.",
      ],
    },
    {
      countryName: "Germany",
      type: "landmark",
      name: "Cologne Cathedral",
      description:
        "A Gothic masterpiece and UNESCO World Heritage Site that took over 600 years to complete, dominating the Cologne skyline.",
      imageUrl: "",
      funFacts: [
        "Construction of Cologne Cathedral began in 1248 but was not completed until 1880 — a span of 632 years.",
        "It was the world's tallest building from 1880 to 1884, standing at 157 metres.",
        "The cathedral houses the Shrine of the Three Kings, which is said to contain the remains of the Biblical Magi.",
        "During World War II, Cologne was heavily bombed but the cathedral remained standing despite 14 direct hits.",
        "It is Germany's most visited landmark, attracting approximately 20,000 visitors every single day.",
      ],
    },

    // ── Germany Festivals ─────────────────
    {
      countryName: "Germany",
      type: "festival",
      name: "Oktoberfest",
      description:
        "The world's largest folk festival held annually in Munich, celebrating Bavarian culture with beer, food, music, and traditional costumes.",
      imageUrl: "",
      funFacts: [
        "Oktoberfest began on October 12, 1810, as a celebration of the marriage of Crown Prince Ludwig of Bavaria to Princess Therese.",
        "Despite its name, most of Oktoberfest takes place in September — it ends on the first Sunday of October.",
        "About 6 to 7 million people from around the world attend Oktoberfest each year.",
        "Over 7 million litres of beer are consumed at Oktoberfest every year.",
        "The traditional female costume worn at Oktoberfest is called a Dirndl, and the male costume is called Lederhosen.",
      ],
    },
    {
      countryName: "Germany",
      type: "festival",
      name: "Christmas Markets",
      description:
        "Magical outdoor winter markets held in town squares across Germany every December, filled with handcrafted gifts, mulled wine, and festive lights.",
      imageUrl: "",
      funFacts: [
        "Germany's Christmas market tradition dates back to the Late Middle Ages — the Dresden Striezelmarkt, founded in 1434, is one of the oldest.",
        "There are over 2,500 Christmas markets held across Germany every December.",
        "The traditional warm drink served at Christmas markets is Glühwein — spiced mulled wine.",
        "Nuremberg's Christkindlesmarkt is one of the most famous in the world, attracting up to 2 million visitors.",
        'The German word for Christmas is "Weihnachten" meaning "holy nights".',
      ],
    },
    {
      countryName: "Germany",
      type: "festival",
      name: "Berlin International Film Festival (Berlinale)",
      description:
        "One of the world's most prestigious film festivals and the largest publicly attended film festival on the planet, held every February in Berlin.",
      imageUrl: "",
      funFacts: [
        'The Berlinale was founded in 1951 and is one of the "Big Three" international film festivals alongside Cannes and Venice.',
        "The top prize at the Berlinale is the Golden Bear — the Silver Bear is the second highest award.",
        "The Berlinale sells over 300,000 tickets to the general public each year, making it the world's largest public film festival.",
        "The festival screens over 400 films from around the world each year.",
        'The name "Berlinale" is a portmanteau of "Berlin" and "Biennale" (though it is held annually, not every two years).',
      ],
    },
    // ════════════════════════════════════════
    // CATEGORIES — CHINA
    // ════════════════════════════════════════
    // ── China Food (no funFacts) ──────────
    {
      countryName: "China",
      type: "food",
      name: "Dumplings (Jiaozi)",
      description:
        "Traditional Chinese dumplings filled with meat and vegetables, typically served in soup or pan-fried.",
      imageUrl: "",
      funFacts: [],
    },
    {
      countryName: "China",
      type: "food",
      name: "Fried Rice (Chǎofàn)",
      description:
        "A popular Chinese dish made from cooked rice stir-fried with vegetables, meat, or eggs.",
      imageUrl: "",
      funFacts: [],
    },
    {
      countryName: "China",
      type: "food",
      name: "Sweet and Sour Chicken",
      description:
        "A popular Chinese dish known for its balance of sweet and sour flavors, typically made with chicken, bell peppers, and pineapple.",
      imageUrl: "",
      funFacts: [],
    },

    // ── China Landmarks ───────────────────
    {
      countryName: "China",
      type: "landmark",
      name: " The Temple of Heaven",
      description:
        "A complex of religious buildings in Beijing where emperors of the Ming and Qing dynasties performed annual ceremonies to pray for good harvests.",
      imageUrl: "",
      funFacts: [
        "Everything is designed in circles (heaven) and squares (earth).",
        "The main hall was built without a single nail.",
        "If you stand in the “Echo Wall,” your voice can bounce all around the courtyard.",
        "The temple was built in 1420 during the Ming Dynasty.",
        "The emperor visited once a year wearing special blue clothes to match the temple.",
      ],
    },
    {
      countryName: "China",
      type: "landmark",
      name: "The Forbidden City",
      description:
        "The imperial palace during the Ming and Qing dynasties, now a museum and UNESCO World Heritage Site.",
      imageUrl: "",
      funFacts: [],
    },
    {
      countryName: "China",
      type: "landmark",
      name: "Oriental Pearl Tower",
      description:
        "A freestanding concrete tower in Shanghai, the tallest structure in China and one of the most recognizable landmarks in the city.",
      imageUrl: "",
      funFacts: [],
    },

    // ── China Festivals ───────────────────
    {
      countryName: "China",
      type: "festival",
      name: "Chinese New Year (Spring Festival)",
      description:
        "Chinese New Year is the biggest celebration of the year! Families clean their homes, hang red decorations, eat special meals, and watch dragon dances towelcome a fresh start and lots of good luck.",
      imageUrl: "",
      funFacts: [
        "The Chinese New Year Dragon symbolizes power, good fortune, wisdom, and leadership.",
        "Chinese New Year lanterns mark the end of the festivities on the first full moon, symbolizing reunion, hope, and light over darkness.",
        "Buying gold is a sign of good luck or fortune. It is thought that around 70% of Chinese people interested in lifestyle and fashion believe that gold will bring the bearer good luck.",
        "The amount given in red envelopes never includes the number 4. That means no 4, 40, or 400 amounts  as the pronunciation of four in Chinese sounds like the word for death.",
        "The tail represents the entire mystical creature's ability to bring prosperity and control elements like rain, with the dance's tail end signifying the enduring flow of luck that follows the head's leadership.",
        "Chinese New Year incense is used to honour deities and ancestors, with smoke carrying wishes to the spirit world for good fortune, health, and prosperity.",
        "Rice pudding, especially Ba Bao Fan (Eight Treasures Rice), symbolizes sweetness, and good fortune, using the lucky number eight (sounds like “fa” for richness) and sweet ingredients like dates and candied fruits to wish for a sweet, and successful year.",
        "Oranges, especially mandarins, symbolize wealth, good fortune, and abundance for Chinese New Year because their name sounds like “gold” and “luck” in Chinese.",
        "Chinese New Year dumplings (Jiaozi), their shape resembles ancient gold ingots. Families gather to make them, sometimes hiding a coin inside for good luck, with the number of dumplings eaten representing potential fortune.",
        "Chinese New Year firecrackers scare away evil spirits (like the monster “Nian”). They originated from burning bamboo to make noise, evolving into modern fireworks using gunpowder.",
      ],
    },
    {
      countryName: "China",
      type: "festival",
      name: "Lantern Festival",
      description:
        "A traditional Chinese festival held on the 15th day of the first lunar month, celebrated with lantern displays and sweet rice balls.",
      imageUrl: "",
      funFacts: [],
    },
    {
      countryName: "China",
      type: "festival",
      name: "Mid-Autumn Festival",
      description:
        "A traditional Chinese festival celebrated on the 15th day of the eighth lunar month, symbolizing family togetherness and harvest.",
      imageUrl: "",
      funFacts: [],
    },
  ]);
  console.log("Categories seeded");

  // ════════════════════════════════════════
  // QUIZZES — EGYPT
  // ════════════════════════════════════════
  await Quiz.create({
    countryName: "Egypt",
    passThreshold: 80,
    minToPass: 8,
    questions: [
      {
        question: "What colours are on the Egyptian flag?",
        options: [
          "Red, White, Black",
          "Blue, Yellow, Green",
          "Red, White, Blue",
          "Green, White, Red",
        ],
        correctAnswer: "Red, White, Black",
      },
      {
        question: "What symbol appears in the centre of the Egyptian flag?",
        options: [
          "A pyramid",
          "The Eagle of Saladin",
          "The Sphinx",
          "A crescent moon",
        ],
        correctAnswer: "The Eagle of Saladin",
      },
      {
        question:
          "The Great Pyramid of Giza was built as a tomb for which Pharaoh?",
        options: ["Ramesses II", "Tutankhamun", "Khufu", "Khafre"],
        correctAnswer: "Khufu",
      },
      {
        question:
          "Approximately how many stone blocks make up the Great Pyramid of Giza?",
        options: ["500,000", "1 million", "2.3 million", "5 million"],
        correctAnswer: "2.3 million",
      },
      {
        question: "How tall is the Cairo Tower?",
        options: ["120 metres", "150 metres", "187 metres", "210 metres"],
        correctAnswer: "187 metres",
      },
      {
        question: "On which island does the Cairo Tower sit?",
        options: [
          "Rhoda Island",
          "Gezira Island",
          "Elephantine Island",
          "Philae Island",
        ],
        correctAnswer: "Gezira Island",
      },
      {
        question: 'What does "Sham El-Nessim" mean in Arabic?',
        options: [
          "Spring celebration",
          "Smelling the breeze",
          "Festival of the sun",
          "Day of colour",
        ],
        correctAnswer: "Smelling the breeze",
      },
      {
        question: "When does the Abu Simbel Sun Festival occur?",
        options: [
          "January 1st and July 1st",
          "March 21st and September 21st",
          "February 22nd and October 22nd",
          "April 15th and August 15th",
        ],
        correctAnswer: "February 22nd and October 22nd",
      },
      {
        question: "What is Egypt's national dish?",
        options: ["Ful Medames", "Om Ali", "Koshari", "Molokhia"],
        correctAnswer: "Koshari",
      },
      {
        question:
          "How long was the Great Pyramid the tallest man-made structure in the world?",
        options: [
          "Over 1,000 years",
          "Over 2,000 years",
          "Over 3,800 years",
          "Over 500 years",
        ],
        correctAnswer: "Over 3,800 years",
      },
    ],
  });

  // ════════════════════════════════════════
  // QUIZZES — GERMANY
  // ════════════════════════════════════════
  await Quiz.create({
    countryName: "Germany",
    passThreshold: 80,
    minToPass: 8,
    questions: [
      {
        question: "What colours are on the German flag?",
        options: [
          "Red, White, Blue",
          "Black, Red, Gold",
          "Blue, White, Red",
          "Black, White, Gold",
        ],
        correctAnswer: "Black, Red, Gold",
      },
      {
        question:
          "In what order do the colours appear on the German flag from top to bottom?",
        options: [
          "Red, Black, Gold",
          "Gold, Red, Black",
          "Black, Red, Gold",
          "Black, Gold, Red",
        ],
        correctAnswer: "Black, Red, Gold",
      },
      {
        question: "When was the Brandenburg Gate built?",
        options: ["1650–1680", "1788–1791", "1820–1850", "1900–1910"],
        correctAnswer: "1788–1791",
      },
      {
        question: "Which Disney castle was inspired by Neuschwanstein?",
        options: [
          "Cinderella Castle",
          "Beast's Castle",
          "Sleeping Beauty Castle",
          "Elsa's Ice Palace",
        ],
        correctAnswer: "Sleeping Beauty Castle",
      },
      {
        question: "How many years did it take to build Cologne Cathedral?",
        options: ["200 years", "400 years", "632 years", "800 years"],
        correctAnswer: "632 years",
      },
      {
        question: "When did the first Oktoberfest take place?",
        options: ["1750", "1810", "1875", "1920"],
        correctAnswer: "1810",
      },
      {
        question:
          "How many litres of beer are consumed at Oktoberfest each year?",
        options: [
          "1 million litres",
          "3 million litres",
          "7 million litres",
          "10 million litres",
        ],
        correctAnswer: "7 million litres",
      },
      {
        question:
          "What is the top prize at the Berlinale film festival called?",
        options: [
          "The Golden Lion",
          "The Palme d'Or",
          "The Golden Bear",
          "The Silver Camera",
        ],
        correctAnswer: "The Golden Bear",
      },
      {
        question:
          "What is the traditional warm drink served at German Christmas markets?",
        options: ["Hot chocolate", "Apple cider", "Glühwein", "Eggnog"],
        correctAnswer: "Glühwein",
      },
      {
        question:
          "The Quadriga on top of the Brandenburg Gate was temporarily taken to which city by Napoleon?",
        options: ["Rome", "Vienna", "London", "Paris"],
        correctAnswer: "Paris",
      },
    ],
  });

  // ════════════════════════════════════════
  // QUIZZES — CHINA
  // ════════════════════════════════════════
  await Quiz.create({
    countryName: "China",
    passThreshold: 80,
    minToPass: 8,
    questions: [
      {
        question: "What colours are on the Chinese flag?",
        options: [
          "Red and White",
          "Blue and White",
          "Red and Blue",
          "Red and Yellow",
        ],
        correctAnswer: "Red and Yellow",
      },
      {
        question: "What is a city in China?",
        options: ["Shanghai", "London", "Osaka", "New Delhi"],
        correctAnswer: "Shanghai",
      },
      {
        question: "What two flavors does sweet & sour chicken mix?",
        options: [
          "Salty and Spicy",
          "Sweet and Salty",
          "Sweet and Tangy",
          "Bitter and Sour",
        ],
        correctAnswer: "Sweet and Tangy",
      },
      {
        question: "How many days does Chinese New Year last?",
        options: ["A day", "7 days", "30 days", "15 days"],
        correctAnswer: "15 days",
      },
      {
        question: "What do kids receive during Chinese New Year?",
        options: [
          "Blue Cards",
          "Red envelopes with lucky money",
          "Free mooncakes",
          "Big lanterns",
        ],
        correctAnswer: "Red envelopes with lucky money",
      },
      {
        question: "The Great Wall of China is shaped like…",
        options: [
          "A big square",
          "A circle",
          "A giant dragon",
          "A straight line with no turns",
        ],
        correctAnswer: "A big square",
      },
      {
        question: "What is special about the Temple of Heaven?",
        options: [
          "It floats on water",
          "It has no doors",
          "It was built without nails",
          "It's painted only in black",
        ],
        correctAnswer: "It was built without nails",
      },
      {
        question: "What color is the sweet & sour sauce?",
        options: ["Red-orange", "Blue", "Purple", "Green"],
        correctAnswer: "Red-orange",
      },
      {
        question: "What shape is the Temple of Heaven known for?",
        options: [
          "Triangle roof",
          "Square blocks only",
          "Round circles",
          "Star shape",
        ],
        correctAnswer: "Round circles",
      },
      {
        question: "What food is eaten during the Lantern Festival?",
        options: [
          "Tangyuan (sweet rice balls)",
          "Ice cream",
          "Fried noodles",
          "Dumplings",
        ],
        correctAnswer: "Dumplings",
      },
    ],
  });

  console.log("Quizzes seeded");
  console.log("✅ Database seeded successfully!");
  process.exit(0);
};

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
