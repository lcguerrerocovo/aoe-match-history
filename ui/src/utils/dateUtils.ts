export function toISODateString(dateStr: string): string {
  // Handles 'YYYY-MM-DD HH:mm UTC' and similar
  if (dateStr.includes('UTC')) {
    // If missing seconds, add ':00'
    let iso = dateStr.replace(' ', 'T').replace(' UTC', 'Z');
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/.test(iso)) {
      iso = iso.replace('Z', ':00Z');
    }
    return iso;
  }
  return dateStr;
} 