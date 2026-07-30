export interface WritingActivity {
  days: Record<string, number>;
}

export function addWritingActivity(
  activity: WritingActivity,
  dateKey: string,
  addedWords: number,
): WritingActivity {
  if (addedWords <= 0) return activity;
  return {
    days: {
      ...activity.days,
      [dateKey]: (activity.days[dateKey] ?? 0) + addedWords,
    },
  };
}

export function writingStreak(activity: WritingActivity, today: Date): number {
  let streak = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  while ((activity.days[localDateKey(cursor)] ?? 0) > 0) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
