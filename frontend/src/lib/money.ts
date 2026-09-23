import { getCurrentLanguage } from '../i18n';

/** Format an already-priced amount. Never convert agreed bookings or quotations here. */
export function formatMoney(amount: number, currency: string, language = getCurrentLanguage()): string {
  const locale = { en: 'en-GB', de: 'de-DE', fr: 'fr-FR' }[language] || 'en-GB';
  return new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'symbol', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

// Mirrors the server's two-decimal, half-up rounding for non-negative prices.
export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON * Math.max(1, amount)) * 100) / 100;
}
