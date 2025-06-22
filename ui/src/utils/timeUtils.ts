// Date utilities
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

// Duration utilities
export function parseDuration(duration: string | number): number {
  if (typeof duration === 'number') return duration;
  if (typeof duration !== 'string') return 0;
  
  const parts = duration.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
} 