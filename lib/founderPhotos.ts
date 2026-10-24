/**
 * Real founder photos saved under public/founders, keyed by startup id.
 * An entry here always wins over the stock fallback portraits.
 * Only add a photo when the person's identity is certain and the license allows reuse.
 */
export const FOUNDER_PHOTOS: Record<string, string> = {
  // Sebastian Thrun (Dulo)
  "akta-news-32486910": "/founders/akta-news-32486910.jpg",
};

/** Attribution required by each photo's license. */
export const PHOTO_CREDITS: Record<string, string> = {
  "akta-news-32486910": "Photo: Christopher Michel, CC BY 2.0, via Wikimedia Commons",
};
