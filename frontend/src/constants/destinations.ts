export type HighlightItem = {
  title: string;
  desc: string;
  icon?: string;
};

export type PracticalInfo = {
  timings: string;
  entryFee: string;
  idealDuration: string;
  bestTime: string;
  photography: string;
};

export type AudioLanguage = {
  code: string;
  label: string;
  text: string;
};

export type AudioGuide = {
  title: string;
  narrator: string;
  duration: string;
  durationSec: number;
  languages: AudioLanguage[];
};

export type ArHotspot = {
  title: string;
  desc: string;
};

export type ArExperience = {
  title: string;
  subtitle: string;
  badge: string;
  modelName: string;
  arFeatures: string[];
  hotspots: ArHotspot[];
};

export type Destination = {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  badge: string;
  badgeColor: string;
  dist: string;
  rating: string;
  time: string;
  descShort: string;
  whyVisit: string;
  etiquette: string;
  mapLabel: string;
  lat: number;
  lng: number;
  audioGuide?: AudioGuide;
  arExperience?: ArExperience;
  highlights?: HighlightItem[];
  practicalInfo?: PracticalInfo;
  aiPrompts?: string[];
};

export const DESTINATIONS: Destination[] = [
  {
    id: 'kangla-fort',
    name: 'Kangla Fort',
    subtitle: 'Historic Royal Heart of Imphal',
    category: 'Sacred Sites',
    badge: 'Must Visit',
    badgeColor: '#DC2626',
    dist: '1.2 km',
    rating: '4.9',
    time: '45 min',
    descShort:
      "Ancient seat of Manipur's royal lineage on the banks of the Imphal River. Safeguards the legendary Kangla Sha dragon.",
    whyVisit:
      "Spanning over 237 acres in the center of Imphal, Kangla is the ancestral seat of Manipur's royal Ningthouja lineage dating back over two millennia to 33 CE. Kangla embodies the spiritual epicenter of the Meitei people, preserving sacred coronation spots, ancestral burial grounds, and mysterious subterranean passages.\n\nSurrounded by moat waters and dense sacred groves (Uinang Lai), the fort serves as an open-air sanctuary connecting myth, royal resistance against colonial dominance, and timeless nature.",
    etiquette:
      "Remove footwear before entering any temple or sacred mound within the complex. Photography inside the Kangla Sha shrine area is strictly prohibited. Dress modestly — shoulders and knees must be covered. Avoid loud noise near the Govindaji shrine precincts. Do not pick flowers or disturb the sacred grove (Uinang Lai). Women on menstruation are traditionally asked to avoid inner sanctums.",
    mapLabel: 'Kangla Complex Map',
    lat: 24.8080,
    lng: 93.9400,
    audioGuide: {
      title: 'Kangla Sha & The Sacred Royal Lineage',
      narrator: 'Dr. Sanatombi Devi · Meitei Cultural Historian',
      duration: '3m 45s',
      durationSec: 225,
      languages: [
        {
          code: 'en',
          label: 'English',
          text: "Welcome to Kangla Fort, the royal heartbeat of Manipur since 33 CE. Guarding this sacred gateway stand the colossal Kangla Sha dragon-lion statues, immortal symbols of Ningthouja royal sovereignty. Listen closely as we unveil the hidden secrets of the coronation mound, royal burial grounds, and the subterranean waters of ancient Imphal.",
        },
        {
          code: 'mni',
          label: 'মৈতৈলোন্ (Manipuri)',
          text: "কাংলা কোন্নাদা তরাম্না ওকচরি। মসি মতম শাংনা নিংথৌজা নিংথৌরোন্না শাসন তৌরম্বা পুৱারীগী শেংলবা মফম্নি। কাংলা শাগী শক্তমশিং অসিনা মণিপুরগী থৌনা অমসুং মারূপ ওইবগী চেৎনবা খুদম্নি।",
        },
      ],
    },
    arExperience: {
      title: 'Kangla Sha Guardian Dragon in 3D AR',
      subtitle: 'Spawn the mythical dragon guardian of Manipur in life-size 3D augmented reality',
      badge: 'Interactive 3D AR',
      modelName: 'Kangla Sha (Royal Dragon-Lion Guardian)',
      arFeatures: ['360° Gyro Inspection', 'True-to-Scale Projection', 'Sacred Lore Hotspots'],
      hotspots: [
        { title: 'Dragon Horn & Mane', desc: 'Symbolizes direct descent from celestial Ningthouja monarchs.' },
        { title: 'Sacred Pedestal', desc: 'Restored on the exact coronation meridian of ancient Imphal kings.' },
        { title: 'Dragon Scales', desc: 'Carved with Meitei heraldic motifs dating back two millennia.' },
      ],
    },
    highlights: [
      { title: 'Kangla Sha Shrines', desc: 'Colossal dragon-lion statues resurrected to guard the eastern citadel gate.' },
      { title: 'Govindaji Historic Shrine', desc: 'The 1846 Vaishnav brick sanctum where classical Raas Leela was enacted.' },
      { title: 'Royal Coronation Mound', desc: 'The spiritual epicenter where Ningthouja monarchs were crowned since 33 CE.' },
      { title: 'Citadel Moat & Sacred Grove', desc: 'Serene moat waters enveloped by ancient, untouched Umang Lai flora.' },
    ],
    practicalInfo: {
      timings: '7:00 AM – 5:30 PM (Closed Wednesdays)',
      entryFee: '₹20 (Indians) · ₹100 (International)',
      idealDuration: '1.5 – 2.5 Hours',
      bestTime: 'Sunrise or Late Afternoon (Golden Hour)',
      photography: 'Allowed (Restricted inside shrine sanctums)',
    },
    aiPrompts: [
      'Tell me the story of the Kangla Sha dragon',
      'What rituals were performed at the Kangla coronation mound?',
      'Why was Kangla Fort historically pivotal in the Anglo-Manipur war?',
    ],
  },
  {
    id: 'loktak-lake',
    name: 'Loktak Lake',
    subtitle: "World's Only Floating Lake",
    category: 'Nature',
    badge: 'Natural Wonder',
    badgeColor: '#0891B2',
    dist: '18 km',
    rating: '4.8',
    time: '2 hr',
    descShort:
      "The world's only floating lake with circular phumdis -- a serene, biodiverse escape unique to Manipur.",
    whyVisit:
      "Loktak Lake is the largest freshwater lake in Northeast India and home to the world-famous floating islands called phumdis -- heterogeneous masses of vegetation, soil, and organic matter. The Keibul Lamjao National Park, the world's only floating national park, sits on these islands and shelters the endangered Sangai (brow-antlered deer).\n\nA boat ride at dawn through the morning mist offers one of the most serene natural experiences in all of India. The lake sustains thousands of fishermen who live on floating huts called phumshongs.",
    etiquette:
      "Avoid littering -- bring back all plastic waste. Do not disturb the phumdis or wade through them. Motorboats are restricted near the national park zone; opt for country boats. Do not feed or approach the Sangai deer. Camping on phumdis is prohibited without forest department permission.",
    mapLabel: 'Loktak Lake Map',
    lat: 24.5320,
    lng: 93.7810,
    audioGuide: {
      title: 'Whispers of the Floating Phumdis',
      narrator: 'Biren Singh · Lake Ecosystem Custodian',
      duration: '4m 10s',
      durationSec: 250,
      languages: [
        {
          code: 'en',
          label: 'English',
          text: "You are looking across Loktak Lake, an ecological wonder found nowhere else on planet Earth. Beneath the morning mist drift thousands of circular phumdis—living, floating islands supporting traditional fishermen in phumshong huts, and guarding the world's last wild Sangai dancing deer.",
        },
        {
          code: 'mni',
          label: 'মৈতৈলোন্ (Manipuri)',
          text: "লোকতাক পাত অসি মহৌশাগী অচৌবা খুদোল অমনি। ফুমদিগী মথক্তা লৈরিবা সংগাই শা অমসুং ঙামীশিংগী পুন্সি অসিনা লোকতাকপু অখন্নবা শক্তম অমা পীরি।",
        },
      ],
    },
    arExperience: {
      title: 'Sangai Deer & Phumdi in 3D AR',
      subtitle: 'Inspect the endangered dancing deer and floating phumdi ecosystem in augmented reality',
      badge: 'Ecosystem 3D AR',
      modelName: 'Sangai (Brow-Antlered Dancing Deer)',
      arFeatures: ['Life-Size Spatial Projection', '360° Habitat Walkaround', 'Nature Audio Sync'],
      hotspots: [
        { title: 'Crown Brow-Antlers', desc: 'Majestic backward-curving antlers unique to the dancing Sangai.' },
        { title: 'Adapted Phumdi Hooves', desc: 'Broad, elastic hooves evolved specifically to balance on floating biomass.' },
        { title: 'Living Phumdi Matrix', desc: 'Thick mat of soil, vegetation, and organic roots floating on clear water.' },
      ],
    },
    highlights: [
      { title: 'Sendra Island Lookout', desc: 'Elevated panoramic viewpoint overlooking the concentric phumdi rings.' },
      { title: 'Keibul Lamjao Sanctuary', desc: 'The world’s only floating national park sheltering the endangered wild Sangai.' },
      { title: 'Phumshong Fisherman Huts', desc: 'Traditional thatched wooden huts floating directly upon the open lake.' },
      { title: 'Country Wooden Boat Cruise', desc: 'Gentle sunrise punting through labyrinthine water channels and lotus fields.' },
    ],
    practicalInfo: {
      timings: '6:00 AM – 6:00 PM Daily',
      entryFee: 'Free Lake Access (Country Boats: ₹300 - ₹600)',
      idealDuration: '2.5 – 4.0 Hours',
      bestTime: 'Sunrise (6:00 – 8:30 AM) for tranquil mist & birds',
      photography: 'Allowed (Drones restricted near national park boundary)',
    },
    aiPrompts: [
      'How do the floating phumdis stay buoyant all year?',
      'Where is the best spot to photograph the Sangai deer?',
      'What species of migratory birds visit Loktak in winter?',
    ],
  },
  {
    id: 'ima-keithel',
    name: 'Ima Keithel',
    subtitle: "Asia's All-Women Market",
    category: 'Markets',
    badge: 'Living Heritage',
    badgeColor: '#7C3AED',
    dist: '0.8 km',
    rating: '4.7',
    time: '1.5 hr',
    descShort:
      "Asia's largest all-women market -- a vibrant tapestry of commerce, handloom, and Meitei culture.",
    whyVisit:
      "Ima Keithel (Mother's Market) is a 500-year-old institution run exclusively by women in the heart of Imphal. Over 5,000 Ima (mothers) gather daily to sell handloom textiles, fresh produce, fish, pottery, and traditional Meitei artifacts.\n\nThis market is not just commerce -- it is a living symbol of Meitei matriarchal strength. The Imas have historically led resistance movements, including the Nupi Lan (Women's War) of 1904 and 1939 against British colonial trade policies. Shopping here is an act of participating in living history.",
    etiquette:
      "Bargaining is acceptable but do so respectfully -- these are livelihoods, not sport. Ask before photographing vendors. Do not touch merchandise without indicating intent to buy. Modest dress is appreciated. The market closes on festival days; check local calendars. Support by buying genuine handloom rather than synthetic imitations.",
    mapLabel: 'Ima Keithel Map',
    lat: 24.8074,
    lng: 93.9358,
    audioGuide: {
      title: 'Echoes of the Mothers: 500 Years of Nupi Power',
      narrator: 'Ima Memcha Devi · Textile Artisan & Market Elder',
      duration: '3m 15s',
      durationSec: 195,
      languages: [
        {
          code: 'en',
          label: 'English',
          text: "Step inside Ima Keithel—the Mother's Market. For over 500 years, this bustling commercial fortress has been managed exclusively by married Meitei women. From pioneering the historic Nupi Lan resistance against colonial monopolies to passing heirloom weaving skills down through generations, these 5,000 mothers are the bedrock of Manipur.",
        },
        {
          code: 'mni',
          label: 'মৈতৈলোন্ (Manipuri)',
          text: "ইমা কৈথেলদা তরাম্না ওকচরি। চহি ৫০০ হেন্না ইমাশিংনা লল্লোন-ইতিক তৌদুনা লাক্লিবা মফম অসিনা নূপী লানগী পুৱারী অমসুং মৈতৈ নূপীগী থৌনাগী চাউরবা খুদম্নি।",
        },
      ],
    },
    arExperience: {
      title: 'Meitei Handloom & Textile Loom in AR',
      subtitle: 'Examine authentic Meitei wooden shuttle looms and intricate Phanek patterns in 3D',
      badge: 'Heritage Craft AR',
      modelName: 'Traditional Meitei Handloom Loom',
      arFeatures: ['Weaving Loom Demonstration', 'Textile Texture Zoom', 'Yarn Dye Inspector'],
      hotspots: [
        { title: 'Mayek Naibi Border', desc: 'Ancestral horizontal stripe motifs woven exclusively with royal Meitei geometry.' },
        { title: 'Innaphi Gossamer Silk', desc: 'Featherlight diaphanous shawl adorned with intricate floral threadwork.' },
        { title: 'Hereditary Stall (Pham)', desc: 'Sacred vendor space inherited from mother to daughter across generations.' },
      ],
    },
    highlights: [
      { title: 'Purana Bazar Handloom Hall', desc: 'Thousands of brilliant silk Phaneks, Innaphis, and traditional Meitei shawls.' },
      { title: 'Fresh Produce & Forest Herb Hall', desc: 'Wild bamboo shoots, ghost peppers (U-Morok), and medicinal forest greens.' },
      { title: 'Ngari & Smoked Fish Section', desc: 'Fermented ngari, essential to everyday authentic Meitei culinary soul.' },
      { title: 'Nupi Lan Historic Memorial', desc: 'Tribute marker honoring the brave mothers of the 1904 & 1939 resistance.' },
    ],
    practicalInfo: {
      timings: '7:30 AM – 7:30 PM (Vibrant mornings 8 AM – 1 PM)',
      entryFee: 'Free Admission',
      idealDuration: '1.5 – 2.0 Hours',
      bestTime: 'Morning (9:00 AM – 11:30 AM)',
      photography: 'Polite to ask before photographing vendors up close',
    },
    aiPrompts: [
      'What was the historic Nupi Lan war led by these market mothers?',
      'How do I identify genuine authentic Meitei silk Phanek?',
      'What are the most popular traditional spices sold here?',
    ],
  },
  {
    id: 'govindaji-temple',
    name: 'Govindaji Temple',
    subtitle: 'Royal Vaishnav Sanctum of Imphal',
    category: 'Sacred Sites',
    badge: 'Sacred',
    badgeColor: '#D97706',
    dist: '0.5 km',
    rating: '4.9',
    time: '30 min',
    descShort:
      'The royal Vaishnav temple heart of Imphal, home to Raas Leela dance and elaborate ceremonial rituals.',
    whyVisit:
      "Govindaji Temple is the spiritual heart of Imphal and the epicenter of Meitei Vaishnavism. Built in 1846, the temple complex houses deities Govindajee, Baladev, and Jaganath. It is the site of the magnificent Raas Leela dance performances -- classical devotional dance-dramas enacted by trained performers in elaborate costumes.\n\nThe evening aarti here, with its flickering oil lamps, resonant bells, and choral chanting, offers a transcendent spiritual experience unlike any other in Northeast India.",
    etiquette:
      "Non-Hindus are generally permitted in outer areas; check signage for inner sanctum access. Remove footwear at the entrance. No photography inside the main shrine. Dress in traditional or formal attire -- avoid shorts and sleeveless tops. Maintain silence and turn off mobile ringtones. Do not turn your back to the main deity when leaving.",
    mapLabel: 'Govindaji Temple Map',
    lat: 24.7978,
    lng: 93.9485,
    audioGuide: {
      title: 'Devotion & Classical Raas Leela at Govindaji',
      narrator: 'Guru R.K. Singh · Classical Manipuri Dance Scholar',
      duration: '3m 30s',
      durationSec: 210,
      languages: [
        {
          code: 'en',
          label: 'English',
          text: "Govindaji Temple represents the pinnacle of Meitei devotional synthesis, where ancient Vedic devotion merged with the graceful aesthetics of classical Manipuri dance. In the courtyard before you, the sacred Raas Leela is enacted under moonlit festival skies.",
        },
        {
          code: 'mni',
          label: 'মৈতৈলোন্ (Manipuri)',
          text: "গোবিন্দজী লাইশঙদা তরাম্না ওকচরি। মসি মণিপুরী রাশ লীলা অমসুং লাইনীং-লাইশোনগী অচৌবা শেংলবা মফম্নি।",
        },
      ],
    },
    arExperience: {
      title: 'Classical Raas Leela Dancer in 3D AR',
      subtitle: 'View a life-size 3D classical Manipuri dancer wearing the ornate Potloi cylindrical skirt in AR',
      badge: 'Classical Dance AR',
      modelName: 'Manipuri Raas Leela Potloi Costume',
      arFeatures: ['Ornate Mirrorwork Shader', '360° Costume Details', 'Classical Pung Drum Audio'],
      hotspots: [
        { title: 'Stiffened Potloi Skirt', desc: 'Embroidered cylindrical skirt encrusted with mirrors, gold sequins, and silk.' },
        { title: 'Feathered Chura Headdress', desc: 'Sacred crown representing Lord Krishna adorned with delicate peacock plumes.' },
        { title: 'Graceful Tandava & Lasya Pose', desc: 'Classical fluid movements celebrated across international dance traditions.' },
      ],
    },
    highlights: [
      { title: 'Twin Golden Domes', desc: 'Gilded temple towers reflecting the morning valley sunlight over Imphal.' },
      { title: 'Mandapa Nat Sankirtan Courtyard', desc: 'Open pillared hall where devotional cymbals and pung drums reverberate.' },
      { title: 'Evening Deepa Aarti', desc: 'Transcendent ritual of brass oil lamps and chorus chanting at dusk.' },
      { title: 'Historic Bell Tower', desc: 'Bronze royal bell sounding across the palace grounds since 1846.' },
    ],
    practicalInfo: {
      timings: '5:00 AM – 12:00 PM & 4:00 PM – 8:30 PM',
      entryFee: 'Free (Donations optional)',
      idealDuration: '45 – 60 Minutes',
      bestTime: 'Evening Aarti (6:00 PM – 7:00 PM)',
      photography: 'Allowed in courtyards (Strictly prohibited inside inner sanctum)',
    },
    aiPrompts: [
      'What makes Manipuri classical Raas Leela dance distinct from other Indian dances?',
      'How was the Potloi costume traditionally designed and worn?',
      'Who commissioned the construction of Govindaji Temple?',
    ],
  },
  {
    id: 'sangai-festival',
    name: 'Sangai Festival',
    subtitle: "Manipur's Flagship Cultural Showcase",
    category: 'Festivals',
    badge: 'Upcoming',
    badgeColor: '#059669',
    dist: 'Imphal Valley',
    rating: '5.0',
    time: '10 days',
    descShort:
      "Manipur's flagship celebration featuring Raas Leela, Thang-Ta martial arts, water sports, and culinary showcases.",
    whyVisit:
      "The Sangai Festival (November 21-30) is Manipur's grandest cultural extravaganza, named after the endangered Sangai deer. Over 10 days, the valley comes alive with classical Raas Leela and Lai Haraoba dance performances, Thang-Ta martial arts demonstrations, indigenous water sports on Loktak Lake, handloom and handicraft exhibitions, and a spectacular food festival showcasing ancestral Meitei recipes.\n\nIt is the single best opportunity to experience the full breadth of Manipuri culture in one concentrated, immersive setting.",
    etiquette:
      "Book accommodations at least 3 months in advance. Attend evening performances only if you can maintain respectful silence. Do not enter restricted performance areas. Purchase crafts directly from artisans. For Loktak water sport events, wear life jackets provided by organizers.",
    mapLabel: 'Festival Grounds Map',
    lat: 24.7960,
    lng: 93.9490,
    audioGuide: {
      title: 'Symphony of the Valley: Inside Sangai Festival',
      narrator: 'Haobam Premjit · Festival Cultural Director',
      duration: '3m 50s',
      durationSec: 230,
      languages: [
        {
          code: 'en',
          label: 'English',
          text: "Every November, the entire valley of Manipur converges into a kaleidoscope of sound, color, and ancestral heritage. The Sangai Festival unites indigenous tribal dance, classical Raas Leela, fierce Thang-Ta martial artistry, and traditional water sports under one grand sky.",
        },
        {
          code: 'mni',
          label: 'মৈতৈলোন্ (Manipuri)',
          text: "সংগাই কুমহৈ অসি মণিপুরগী খ্বাইদগী চাউবা কলচরেল ফেষ্টিবেলনি। মসিনা মণিপুরগী তোঙান-তোঙানবা খুনাইগী নাৎ অমসুং চৎনবীশিংবু মালেমগী মাঙদা ফোংদোক্লি।",
        },
      ],
    },
    arExperience: {
      title: 'Thang-Ta Martial Arts Weapons in 3D AR',
      subtitle: 'Inspect the sacred Meitei curved sword (Thang) and spear (Ta) in interactive 3D AR',
      badge: 'Martial Arts AR',
      modelName: 'Meitei Thang-Ta Ceremonial Blades',
      arFeatures: ['Dynamic Motion Trails', 'Steel Reflection Map', 'Combat Stance Audio'],
      hotspots: [
        { title: 'Curved Thang Blade', desc: 'Double-edged steel blade perfected over centuries of valley defense.' },
        { title: 'Woven Bamboo Shield (Chung)', desc: 'Hardened lacquered shield bearing clan protective sigils.' },
        { title: 'Ceremonial Ta Spear', desc: 'Long-reach spear wielded in sacred ritual choreography and martial duels.' },
      ],
    },
    highlights: [
      { title: 'Main Amphitheatre Performances', desc: 'Continuous classical Raas Leela, Lai Haraoba, and Naga tribal dances.' },
      { title: 'Thang-Ta Arena', desc: 'Breathtaking demonstrations of ancient Meitei sword and spear combat.' },
      { title: 'Indigenous Food Pavilion', desc: 'Over 100 stalls serving hot Kanghou, Singju, Chak-hao, and smoked delicacies.' },
      { title: 'Loktak Water Sports Arena', desc: 'Traditional boat races and modern canoeing competitions on the floating lake.' },
    ],
    practicalInfo: {
      timings: 'November 21 – 30 Annually (10:00 AM – 9:30 PM)',
      entryFee: '₹50 – ₹100 per day entry passes',
      idealDuration: 'Full Day (Afternoon through Evening)',
      bestTime: 'Evenings for illuminated amphitheatre concerts',
      photography: 'Freely allowed (Avoid flash during classical dances)',
    },
    aiPrompts: [
      'What are the must-see performances on the Sangai Festival schedule?',
      'How do I book tickets and shuttle transport to the festival grounds?',
      'What traditional tribal crafts can I purchase at the festival?',
    ],
  },
  {
    id: 'chak-hao-singju',
    name: 'Chak-hao & Singju',
    subtitle: 'Ancestral Meitei Culinary Heritage',
    category: 'Food',
    badge: 'Meitei Special',
    badgeColor: '#BE185D',
    dist: 'Old Market Area',
    rating: '4.8',
    time: '1 hr',
    descShort:
      'Purple organic black rice paired with piquant lotus stem salad. A UNESCO-deserving culinary heritage.',
    whyVisit:
      "Chak-hao Kheer is a mesmerizing purple-black rice pudding made from organic black rice grown in the hills of Manipur. Rich in antioxidants with a nutty aroma and a deep violet hue, it has been served at royal banquets for centuries.\n\nSingju is a piquant, crunchy salad of fresh lotus stem, fermented ngari fish, banana flower, and a medley of local herbs dressed with chilli and lime. Together, they represent the holistic Meitei philosophy of food as medicine -- every ingredient chosen for both flavor and healing properties.",
    etiquette:
      "Many traditional restaurants do not serve alcohol -- respect this policy. Try food with your right hand as is local custom. Ask about spice levels before ordering -- Singju can be intensely hot. Support women-led eateries in the Ima Keithel area. Avoid wasting food -- portions are generous.",
    mapLabel: 'Food Quarter Map',
    lat: 24.8074,
    lng: 93.9358,
    audioGuide: {
      title: 'Food as Medicine: The Chak-hao & Singju Tradition',
      narrator: 'Chef Tomba Meitei · Indigenous Gastronomy Archivist',
      duration: '3m 00s',
      durationSec: 180,
      languages: [
        {
          code: 'en',
          label: 'English',
          text: "In Meitei culture, food is never just sustenance—it is medicine and spiritual communion. Chak-hao, the prized GI-tagged purple black aromatic rice, was once reserved only for royal Ningthou feasts. Paired with the fiery, herb-laden crunch of Singju, it creates a flavor harmony unique to Manipur.",
        },
        {
          code: 'mni',
          label: 'মৈতৈলোন্ (Manipuri)',
          text: "চাক-হাও অমসুং শিংজু অসি মৈতৈ চাউখৎ-নাৎকী খ্বাইদগী শেংলবা চীঞ্জাক্নি। চাক-হাওগী লৈনাম অমসুং শিংজুগী মরোই-মরোংনা হকচাং ফবদা মতেং পাংই।",
        },
      ],
    },
    arExperience: {
      title: 'Chak-hao Royal Feast in 3D AR',
      subtitle: 'Project a royal brass Meitei thali with purple Chak-hao kheer and fresh Singju onto your table in 3D',
      badge: 'Gastronomy AR',
      modelName: 'Ancestral Meitei Khengkhrong Thali',
      arFeatures: ['Steam & Texture Shader', 'Ingredient Botanical Inspector', 'Calorie & Herb Breakdown'],
      hotspots: [
        { title: 'Chak-hao Anthocyanin Grain', desc: 'Superfood black rice radiating a deep royal violet hue rich in antioxidants.' },
        { title: 'Fermented Ngari Dressing', desc: 'Aged fermented fish providing the essential savory umami kick to Singju salad.' },
        { title: 'Fresh Lotus Stem & Herb Medley', desc: 'Crisp lotus root, banana flower, perilla seeds, and fragrant local herbs.' },
      ],
    },
    highlights: [
      { title: 'Chak-hao Kheer Royal Pudding', desc: 'Silky, fragrant purple-black pudding simmered with bay leaf and cardamom.' },
      { title: 'Traditional Singju Stall', desc: 'Prepared fresh to order with pestle and mortar in the bustling market alleys.' },
      { title: 'Black Rice Tea & Infusions', desc: 'Nutty, caffeine-free herbal brew renowned for cardiovascular health.' },
      { title: 'Women-Led Traditional Kitchens', desc: 'Cozy century-old eateries preserving generational Meitei family recipes.' },
    ],
    practicalInfo: {
      timings: '10:30 AM – 7:30 PM (Daily)',
      entryFee: '₹40 – ₹120 per dish at local eateries',
      idealDuration: '45 – 60 Minutes',
      bestTime: 'Lunch (12:00 – 2:30 PM) or Evening tea (4:30 PM)',
      photography: 'Freely allowed (Share local food culture with tag #TasteManipur)',
    },
    aiPrompts: [
      'What are the health benefits of GI-tagged Manipuri Chak-hao black rice?',
      'How is traditional Manipuri Singju salad prepared at home?',
      'Where are the best women-run eateries near Ima Keithel for authentic Singju?',
    ],
  },
];

export const findDestination = (id: string): Destination | undefined =>
  DESTINATIONS.find((d) => d.id === id);
