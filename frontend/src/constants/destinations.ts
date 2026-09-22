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
    lat: 24.8067,
    lng: 93.9385,
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
    lat: 24.8067,
    lng: 93.9385,
  },
];

export const findDestination = (id: string): Destination | undefined =>
  DESTINATIONS.find((d) => d.id === id);
