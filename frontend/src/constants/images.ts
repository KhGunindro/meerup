/**
 * Centralised image map for destination assets.
 * All require() calls must be static strings — Metro bundler cannot resolve dynamic paths.
 * Add new destination images here and reference them by destination id.
 */
const DEST_IMAGES: Record<string, any> = {
  'kangla-fort':      require('@/assets/images/Kangla.png'),
  'loktak-lake':      require('@/assets/images/loktak.png'),
  'ima-keithel':      require('@/assets/images/Ima keithel.png'),
  'govindaji-temple': require('@/assets/images/govindjee-temple.jpg'),
  'sangai-festival':  require('@/assets/images/Sangai festival.png'),
  'chak-hao-singju':  require('@/assets/images/singju.webp'),
  'thabal':           require('@/assets/images/thabal.webp'),
};

const fallbackImg = require('@/assets/images/Kangla.png');

/** Returns the image asset for a given destination id, falling back to Kangla.png. */
export const getDestImg = (id: string) => DEST_IMAGES[id] ?? fallbackImg;
