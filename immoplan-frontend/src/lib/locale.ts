import i18n from './i18n';

export function getIntlLocale(language = i18n.resolvedLanguage ?? i18n.language): string {
  if (language === 'mg') return 'mg-MG';
  if (language === 'en') return 'en-US';
  return 'fr-FR';
}

export function formatNumber(value: number, language = i18n.resolvedLanguage ?? i18n.language): string {
  return new Intl.NumberFormat(getIntlLocale(language)).format(value);
}

export function formatRelativeDate(date: Date, language = i18n.resolvedLanguage ?? i18n.language): string {
  const now = Date.now();
  const diffMs = date.getTime() - now;
  const diffMinutes = Math.round(diffMs / 60000);
  const absMinutes = Math.abs(diffMinutes);
  const rtf = new Intl.RelativeTimeFormat(getIntlLocale(language), { numeric: 'auto' });

  if (absMinutes < 60) return rtf.format(diffMinutes, 'minute');
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, 'day');
  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, 'month');
  const diffYears = Math.round(diffMonths / 12);
  return rtf.format(diffYears, 'year');
}

export function formatDateByOptions(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  language = i18n.resolvedLanguage ?? i18n.language
): string {
  return new Intl.DateTimeFormat(getIntlLocale(language), options).format(date);
}
