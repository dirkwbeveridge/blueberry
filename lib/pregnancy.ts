export function getCurrentWeek(dueDateIso: string): number {
  const due = new Date(dueDateIso);
  const now = new Date();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksUntilDue = (due.getTime() - now.getTime()) / msPerWeek;
  const week = Math.round(40 - weeksUntilDue);
  return Math.min(40, Math.max(1, week));
}

export function getTrimester(week: number): 1 | 2 | 3 {
  if (week <= 13) return 1;
  if (week <= 26) return 2;
  return 3;
}

export function getDaysUntilDue(dueDateIso: string): number {
  const due = new Date(dueDateIso);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getWeekRange(week: number): { start: Date; end: Date } {
  const now = new Date();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const start = new Date(now.getTime() - (week - 1) * msPerWeek);
  const end   = new Date(start.getTime() + msPerWeek);
  return { start, end };
}
