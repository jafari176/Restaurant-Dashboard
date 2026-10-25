export interface Special {
  id: string;
  name_en: string;
  name_fr: string | null;
  description: string | null;
  price: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SpecialInput = Omit<Special, 'id' | 'created_at' | 'updated_at'>;

/** Today in the restaurant's timezone, as YYYY-MM-DD. */
export function todayInToronto(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
}

/**
 * Mirrors live_specials() in the database and the filter in the call-start
 * webhook: active, and today falls inside the date range.
 */
export function isLive(special: Special, today = todayInToronto()): boolean {
  return special.is_active && special.start_date <= today && special.end_date >= today;
}

export function isPast(special: Special, today = todayInToronto()): boolean {
  return special.end_date < today;
}

/**
 * The coming Friday and Sunday, for pre-filling the form. On a Friday or
 * Saturday this returns the current weekend rather than the next one, since
 * that is the weekend the owner is about to run.
 */
export function comingWeekend(): { start: string; end: string } {
  const todayStr = todayInToronto();
  const [y, m, d] = todayStr.split('-').map(Number);
  const today = new Date(Date.UTC(y, m - 1, d));

  const dow = today.getUTCDay(); // 0 Sun, 5 Fri, 6 Sat
  // Saturday and Sunday fall inside a weekend already running, so step back to
  // its Friday rather than skipping to the next one.
  const daysToFriday = dow === 0 ? -2 : dow === 6 ? -1 : (5 - dow) % 7;

  const friday = new Date(today);
  friday.setUTCDate(friday.getUTCDate() + daysToFriday);

  const sunday = new Date(friday);
  sunday.setUTCDate(sunday.getUTCDate() + 2);

  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
  return { start: fmt(friday), end: fmt(sunday) };
}

/** Same calculation, shifted a week, for the "Run again" button. */
export function nextWeekend(): { start: string; end: string } {
  const { start, end } = comingWeekend();
  const shift = (s: string) => {
    const dt = new Date(`${s}T00:00:00Z`);
    dt.setUTCDate(dt.getUTCDate() + 7);
    return dt.toISOString().slice(0, 10);
  };
  const todayStr = todayInToronto();
  // If this weekend is still ahead, reuse it; otherwise jump to the next one.
  return start > todayStr ? { start, end } : { start: shift(start), end: shift(end) };
}
