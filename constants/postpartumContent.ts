export interface PostpartumWeekContent {
  week: number;
  momRecovery: string;
  partnerFocus: string;
  babyFocus: string;
}

export const POSTPARTUM_WEEK_CONTENT: PostpartumWeekContent[] = [
  {
    week: 1,
    momRecovery: 'Prioritize rest, hydration, and pain management while your body recovers from birth.',
    partnerFocus: 'Protect sleep windows and take over logistics so recovery time stays uninterrupted.',
    babyFocus: 'Feed often, keep skin-to-skin contact high, and watch diaper counts closely.',
  },
  {
    week: 2,
    momRecovery: 'Recovery is still early. Move gently and stop activity if bleeding increases.',
    partnerFocus: 'Handle night-shift handoffs with clear communication and zero blame.',
    babyFocus: 'Expect irregular sleep and frequent feeding; both are normal at this stage.',
  },
  {
    week: 3,
    momRecovery: 'Energy can swing sharply. Keep expectations low and meals simple.',
    partnerFocus: 'Create one predictable daily support block that she can rely on.',
    babyFocus: 'Wake windows are short. Prioritize calm transitions between feed and sleep.',
  },
  {
    week: 4,
    momRecovery: 'Physical discomfort should ease gradually; persistent pain should be reviewed.',
    partnerFocus: 'Reconfirm your division of household labor before resentment builds.',
    babyFocus: 'Social engagement begins to increase. Track feeding and sleep patterns consistently.',
  },
  {
    week: 5,
    momRecovery: 'Add very light movement if comfortable, without pushing intensity.',
    partnerFocus: 'Schedule one protected self-care block for her each week.',
    babyFocus: 'Continue tummy-time in short sets and track any feeding concerns.',
  },
  {
    week: 6,
    momRecovery: 'Use the postpartum checkup to discuss mood, healing, and pelvic floor support.',
    partnerFocus: 'Support intimacy conversations with patience and no pressure.',
    babyFocus: 'Routines may feel steadier, but growth spurts can still disrupt sleep.',
  },
  {
    week: 7,
    momRecovery: 'Recovery moves from acute healing to rebuilding stamina and confidence.',
    partnerFocus: 'Watch for signs of emotional overload and offer concrete help immediately.',
    babyFocus: 'Track sleep quality, not just duration, to spot useful routine adjustments.',
  },
  {
    week: 8,
    momRecovery: 'Mood stability often improves with better sleep blocks and predictable support.',
    partnerFocus: 'Take one full independent baby-care shift each week to reduce mental load.',
    babyFocus: 'Baby is more alert and interactive, with longer calm wake periods.',
  },
  {
    week: 9,
    momRecovery: 'If recovery still feels stalled, escalate early to a care provider.',
    partnerFocus: 'Keep check-ins practical: ask what task would help most right now.',
    babyFocus: 'Feeding and sleep trends should now be easier to compare week to week.',
  },
  {
    week: 10,
    momRecovery: 'Reintroduce routines slowly and keep capacity-based limits visible to both partners.',
    partnerFocus: 'Stay proactive about shared chores to prevent invisible labor drift.',
    babyFocus: 'Developmental leaps may temporarily disrupt settled routines.',
  },
  {
    week: 11,
    momRecovery: 'Strength and confidence typically rise, but recovery remains nonlinear.',
    partnerFocus: 'Plan one low-effort reset activity together each week.',
    babyFocus: 'Track milestones and questions for the next pediatric visit.',
  },
  {
    week: 12,
    momRecovery: 'Close out fourth-trimester tracking with a realistic plan for next-stage support.',
    partnerFocus: 'Revisit long-term routines before returning to heavier work schedules.',
    babyFocus: 'At three months, focus on consistent cues, safe sleep, and milestone tracking.',
  },
];

export function getPostpartumWeekContent(week: number): PostpartumWeekContent {
  const clampedWeek = Math.max(1, Math.min(12, Math.floor(week)));
  return POSTPARTUM_WEEK_CONTENT[clampedWeek - 1];
}
