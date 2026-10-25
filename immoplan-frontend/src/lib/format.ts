/** Normalise une heure (ex. depuis `<input type="time">` ou DB) vers `HH:MM` attendu par l'API. */
export function toHHMM(time: string | undefined | null): string {
    if (time == null || typeof time !== 'string') return '';
    const t = time.trim();
    const m = t.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return t.length >= 5 ? t.slice(0, 5) : t;
    return `${m[1].padStart(2, '0')}:${m[2]}`;
  }
  