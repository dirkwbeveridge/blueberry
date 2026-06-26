export function getPostpartumWeek(babyDob: string | Date | null, now: Date = new Date()): number {
  if (!babyDob) return 1;

  const dob = babyDob instanceof Date ? babyDob : new Date(babyDob);
  if (Number.isNaN(dob.getTime())) return 1;
  if (dob.getTime() > now.getTime()) return 1;

  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const elapsedWeeks = Math.floor((now.getTime() - dob.getTime()) / msPerWeek) + 1;
  return Math.max(1, Math.min(52, elapsedWeeks));
}

export function getPostpartumAgeLabel(babyDob: string | Date | null, now: Date = new Date()): string {
  const week = getPostpartumWeek(babyDob, now);
  if (week < 5) return `Week ${week}`;
  if (week < 9) return `Month 2`;
  if (week < 13) return `Month 3`;
  const month = Math.max(3, Math.floor((week - 1) / 4) + 1);
  return `Month ${month}`;
}
