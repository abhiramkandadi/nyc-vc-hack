/**
 * Real founder photos saved under public/founders, keyed by startup id.
 * An entry here always wins over the stock fallback portraits.
 * Only add a photo when the person's identity is certain and the source allows reuse.
 */
export const FOUNDER_PHOTOS: Record<string, string> = {
  // Mark Kardashov, from his a16z speedrun founder profile.
  "02mqjeu": "/founders/02mqjeu.jpg",
  // Jeremy Owston, from the Nuclear Turbines company team page.
  "akta-news-29597966": "/founders/akta-news-29597966.png",
  // Sebastian Thrun (Dulo)
  "akta-news-32486910": "/founders/akta-news-32486910.jpg",
  // Charlie Cheng (TeRAM)
  "akta-news-39683006": "/founders/akta-news-39683006.jpg",
  // Isha Bhatnagar (Beltic)
  "0000uxu": "/founders/0000uxu.jpg",
  // Ryan Williams (Ellis)
  "akta-news-35707038": "/founders/akta-news-35707038.jpg",
  // Scott Searle (Enigmata)
  "akta-news-35039388": "/founders/akta-news-35039388.jpg",
  // David Steckel (Polygrade)
  "akta-news-40214619": "/founders/akta-news-40214619.jpg",
  // John Karakelle (CreditBase.ai)
  "akta-news-36205631": "/founders/akta-news-36205631.jpg",
  // Dmitry Kharchenko (Cygrid)
  "akta-news-42258514": "/founders/akta-news-42258514.jpg",
  // Michael Polansky (Outer Bio)
  "akta-news-32929229": "/founders/akta-news-32929229.jpg",
  // Ethan Genteman (Slingshot Insurance)
  "akta-news-42278335": "/founders/akta-news-42278335.jpg",
  // Chris Thompson (RemoteThreat)
  "akta-news-39201248": "/founders/akta-news-39201248.jpg",
  // Shapor Naghibzadeh (QueryStory)
  "akta-news-35046058": "/founders/akta-news-35046058.jpg",
  // Souren Aghajanyan (Watchtower Labs)
  "akta-news-41935439": "/founders/akta-news-41935439.jpg",
};

/** Source / attribution shown as a tooltip on each photo. */
export const PHOTO_CREDITS: Record<string, string> = {
  "02mqjeu": "Mark Kardashov — https://speedrun.a16z.com/companies/keewano/mark-kardashov",
  "akta-news-29597966": "Jeremy Owston — Nuclear Turbines official team photo: https://www.nuclearturbines.com/",
  "akta-news-32486910": "Photo: Christopher Michel, CC BY 2.0, via Wikimedia Commons",
  "akta-news-39683006": "Photo from the TeRAM website",
  "0000uxu": "Photo from the Beltic website",
  "akta-news-35707038": "Photo from the Ellis website",
  "akta-news-35039388": "Photo from the Enigmata website",
  "akta-news-40214619": "Photo from the Polygrade website",
  "akta-news-36205631": "Photo from the CreditBase.ai website",
  "akta-news-42258514": "Photo from the Cygrid website",
  "akta-news-32929229": "Photo from the Outer Bio website",
  "akta-news-42278335": "Photo from the Slingshot Insurance website",
  "akta-news-39201248": "Photo from the RemoteThreat website",
  "akta-news-35046058": "Photo from the QueryStory website",
  "akta-news-41935439": "Photo from the Watchtower Labs website",
};
