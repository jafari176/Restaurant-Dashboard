/**
 * Authoritative menu prices.
 *
 * The agent no longer speaks per-item prices during the call (the owner asked
 * for a single total before tax), so the post-call extractor has no prices in
 * the transcript to read and emits `"price":0` for some or all items. Order
 * 1083 landed with five items and a $0.00 total that way.
 *
 * Prices therefore come from here, not from the transcript. The model decides
 * *what* was ordered; this table decides what it costs.
 *
 * Keep in sync with the COMPLETE MENU & PRICING section of the agent prompt.
 */

export const MENU: Record<string, number> = {
  // Individual skewers (add-ons to kilo grills)
  'chicken skewer': 7.50,
  'filet mignon skewer': 7.99,
  'kafta skewer': 6.00,
  'lamb skewer': 7.50,
  'shrimp skewer': 7.25,
  'lamb chops': 3.99,
  'wings': 6.99,

  // Fries / rice / salad / dips
  'small fries': 6.52,
  'medium fries': 8.26,
  'large fries': 9.57,
  'small rice': 5.22,
  'medium rice': 6.96,
  'large rice': 8.70,
  'small tabbouleh': 8.75,
  'large tabbouleh': 15.99,
  'fattouche': 15.99,
  'small salad': 5.22,
  'medium salad': 6.96,
  'large salad': 8.70,
  'small houmous': 5.22,
  'large houmous': 8.70,
  'small garlic sauce': 5.22,
  'large garlic sauce': 8.70,

  // Other sides
  'sambousek': 2.25,
  'kibbih': 2.25,
  'araes': 6.99,
  'pita bag': 1.99,
  'falafel entree': 4.99,
  'spicy pita': 3.48,
  'cheese roll': 2.99,
  'pita falafel': 7.96,

  // Plates
  'filet mignon plate': 23.87,
  'shish taouk chicken plate': 20.99,
  'kafta kabab plate': 18.99,
  'al quds mix plate': 26.99,
  'lamb chops plate': 21.99,
  'chicken wings plate': 17.09,
  'half chicken plate': 20.25,
  'cuatro plate': 27.08,
  'assiette tres': 23.99,
  'chicken fattoush salad': 17.99,
  'falafel plate': 16.66,
  'lamb plate': 21.13,

  // Sandwiches
  'kafta kabab sandwich': 9.70,
  'shish taouk chicken sandwich': 10.13,
  'filet mignon sandwich': 11.57,
  'lamb sandwich': 10.05,

  // Trio sandwiches
  'shish taouk chicken sandwich trio': 16.66,
  'kafta kabab sandwich trio': 16.23,
  'filet mignon sandwich trio': 18.53,
  'trio lamb': 16.10,

  // Chicken
  'whole chicken': 26.99,
  'chicken trio': 31.99,
  'special family chicken': 47.99,
  'chicken wings': 31.40,

  // Kilo grills
  'half kilo mix grill': 35.99,
  'kilo mix grill': 64.99,
  'half kilo kafta grill': 30.99,
  'kilo kafta grill': 49.99,
  'half kilo lamb chop grill': 36.99,
  'kilo lamb chop grill': 64.99,
  'half kilo filet mignon grill': 38.99,
  'kilo filet mignon grill': 69.99,
  'half kilo shish taouk chicken grill': 32.99,
  'kilo shish taouk chicken grill': 57.99,
  'half kilo grilled lamb': 35.99,
  'kilo grilled lamb': 63.99,
  'grillade': 65.99,

  // Combos
  'filet + kafta': 59.99,
  'taouk + kafta': 54.99,
  'lamb + taouk': 63.99,
  'lamb + kafta': 60.99,
  'lamb + filet': 67.99,

  // Family packages
  'mix plus': 75.99,
  'holiday mix special': 82.00,
  'family shrimps plate': 54.99,

  // Customization
  'extra chicken skewer': 2.00,
  'extra filet skewer': 2.00,
  'substitute rice for fries': 3.00,

  // Beverages
  'coca-cola': 2.25,
  'pepsi': 2.25,
  '7up': 2.25,
  'canada dry': 2.25,
  'pepsi bottle': 2.99,
  'canada dry bottle': 2.62,
  'gatorade': 2.99,
  'ayran yogurt': 3.25,
  'laziza': 2.99,
  'mango juice': 2.99,
};

/**
 * Shorthand the agent actually says, mapped to its menu key. Callers drop the
 * middle word ("Kafta Sandwich" for "Kafta Kabab Sandwich"), so a strict
 * word-subset match misses. Listed explicitly rather than loosened, because a
 * looser matcher starts pricing the wrong item.
 */
const ALIASES: Record<string, string> = {
  'kafta sandwich': 'kafta kabab sandwich',
  'chicken sandwich': 'shish taouk chicken sandwich',
  'taouk sandwich': 'shish taouk chicken sandwich',
  'filet sandwich': 'filet mignon sandwich',
  'kafta plate': 'kafta kabab plate',
  'chicken plate': 'shish taouk chicken plate',
  'taouk plate': 'shish taouk chicken plate',
  'filet plate': 'filet mignon plate',
  'mix plate': 'al quds mix plate',
  'kafta trio': 'kafta kabab sandwich trio',
  'chicken trio sandwich': 'shish taouk chicken sandwich trio',
  'filet trio': 'filet mignon sandwich trio',
  'mix grill': 'kilo mix grill',
  'kafta grill': 'kilo kafta grill',
  'lamb chop grill': 'kilo lamb chop grill',
  'filet grill': 'kilo filet mignon grill',
  'filet mignon grill': 'kilo filet mignon grill',
  'chicken grill': 'kilo shish taouk chicken grill',
  'taouk grill': 'kilo shish taouk chicken grill',
  'coke': 'coca-cola',
  'hummus': 'small houmous',
  'houmous': 'small houmous',
  'tabbouleh': 'small tabbouleh',
  'fries': 'small fries',
  'rice': 'small rice',
  'salad': 'small salad',
  'garlic sauce': 'small garlic sauce',
};

/** Fold accents, punctuation and size words into a comparable form. */
function canonical(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/½|1\/2/g, 'half')
    .replace(/\bsm\b/g, 'small')
    .replace(/\bmd\b|\bmed\b/g, 'medium')
    .replace(/\blg\b/g, 'large')
    .replace(/\bkg\b|\bkilos?\b/g, 'kilo')
    .replace(/[^a-z0-9+ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CANON: Array<[string, number]> = Object.entries(MENU).map(
  ([k, v]) => [canonical(k), v],
);

/**
 * Look up a menu price for a name the model produced, which rarely matches a
 * key exactly ("Kilo Mix Grill" vs "kilo mix grill", "Fries - Large" vs
 * "large fries").
 *
 * Exact canonical match first, then a token-subset match, then the longest
 * substring match. Returns null when nothing matches confidently, so the
 * caller can fall back rather than invent a price.
 */
export function lookupPrice(name: string): number | null {
  let n = canonical(name);
  if (!n) return null;

  // Resolve shorthand to its full menu key before matching.
  const alias = ALIASES[n];
  if (alias) n = canonical(alias);

  for (const [key, price] of CANON) {
    if (key === n) return price;
  }

  // Every word of the menu key present in the spoken name, and vice versa.
  const words = new Set(n.split(' '));
  let best: { price: number; score: number } | null = null;

  for (const [key, price] of CANON) {
    const kw = key.split(' ');
    if (kw.every((w) => words.has(w))) {
      const score = kw.length;
      if (!best || score > best.score) best = { price, score };
    }
  }
  if (best) return best.price;

  for (const [key, price] of CANON) {
    if (n.includes(key) || key.includes(n)) {
      const score = Math.min(key.length, n.length);
      if (!best || score > best.score) best = { price, score };
    }
  }

  return best ? best.price : null;
}
