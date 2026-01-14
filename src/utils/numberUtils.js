// Utility to format number with thousand separators
export const formatAmount = (val) => {
  if (!val && val !== 0) return '';
  const parts = val.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join('.');
};

// Utility to convert Arabic numerals to English and enforce positive numbers
export const toPosNum = (val) => {
  if (!val && val !== 0) return '';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  let clean = val.toString().replace(/[٠-٩]/g, (d) => arabicDigits.indexOf(d));
  clean = clean.replace(/,/g, '').replace(/[^0-9.]/g, '');
  const parts = clean.split('.');
  if (parts.length > 2) {
    clean = parts[0] + '.' + parts.slice(1).join('');
  }
  if (clean.length > 1 && clean.startsWith('0') && clean[1] !== '.') {
    clean = clean.substring(1);
  }
  return clean;
};
// Utility to generally convert any input string with Arabic numbers to English numbers
export const normalizeInput = (val) => {
  if (!val) return '';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  return val.toString()
    .replace(/[٠-٩]/g, (d) => arabicDigits.indexOf(d))
    .replace(/[۰-۹]/g, (d) => persianDigits.indexOf(d));
};
