export function formatAge(dobStr: string): string {
  if (!dobStr) return 'Unknown age';
  const dob = new Date(dobStr);
  if (Number.isNaN(dob.getTime())) return dobStr;
  const now = new Date();
  let months =
    (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (now.getDate() < dob.getDate()) months -= 1;
  if (months < 0) return 'Newborn';
  const yrs = Math.floor(months / 12);
  const remMonths = months % 12;
  if (yrs === 0) return `${remMonths} mo${remMonths === 1 ? '' : 's'}`;
  if (remMonths === 0) return `${yrs} yr${yrs === 1 ? '' : 's'}`;
  return `${yrs} yr${yrs === 1 ? '' : 's'} ${remMonths} mo${remMonths === 1 ? '' : 's'}`;
}

export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

export function formatTimeDisplay(hhmm: string): string {
  if (!hhmm || !hhmm.includes(':')) return hhmm;
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

export function getSpeciesEmoji(species: string): string {
  const s = species.toLowerCase();
  if (s.includes('canine') || s.includes('dog')) return '🐕';
  if (s.includes('feline') || s.includes('cat')) return '🐈';
  if (s.includes('bird') || s.includes('avian')) return '🦜';
  if (s.includes('rabbit') || s.includes('bunny')) return '🐇';
  return '🐾';
}

export function getInitials(name: string): string {
  return name
    .replace(/^(Dr\.\s+)/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

export function addMonthsToDate(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(y, m - 1 + months, d);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
