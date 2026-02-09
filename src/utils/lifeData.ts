export interface LifeData {
  birthday: Date;
  deathDate: Date;
  lifeExpectancy: number;
  totalYears: number;
  yearsLived: number;
  yearsRemaining: number;
  totalWeeks: number;
  weeksLived: number;
  weeksRemaining: number;
  totalMonths: number;
  monthsLived: number;
  monthsRemaining: number;
  totalDays: number;
  daysLived: number;
  daysRemaining: number;
  percentLived: number;
  currentSeason: 'spring' | 'summer' | 'autumn' | 'winter';
  totalHeartbeats: number;
  heartbeatsUsed: number;
  heartbeatsRemaining: number;
  totalSunsets: number;
  sunsetsUsed: number;
  sunsetsRemaining: number;
  exceededExpectancy: boolean;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_PER_YEAR = 365.25;
const WEEKS_PER_YEAR = 52.1775;
const AVG_HEARTBEATS_PER_MINUTE = 72;
const MINUTES_PER_DAY = 1440;

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / MS_PER_DAY);
}

function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function getSeason(percentLived: number): 'spring' | 'summer' | 'autumn' | 'winter' {
  if (percentLived < 25) return 'spring';
  if (percentLived < 50) return 'summer';
  if (percentLived < 75) return 'autumn';
  return 'winter';
}

export function calculateLifeData(birthday: Date, lifeExpectancy: number): LifeData {
  const now = new Date();
  const deathDate = new Date(birthday);
  deathDate.setFullYear(deathDate.getFullYear() + lifeExpectancy);

  const totalDays = Math.round(lifeExpectancy * DAYS_PER_YEAR);
  const daysLivedRaw = daysBetween(birthday, now);
  const exceededExpectancy = daysLivedRaw >= totalDays;

  const daysLived = exceededExpectancy ? totalDays : daysLivedRaw;
  const daysRemaining = exceededExpectancy ? 0 : totalDays - daysLived;

  const totalWeeks = Math.round(lifeExpectancy * WEEKS_PER_YEAR);
  const weeksLived = exceededExpectancy ? totalWeeks : Math.floor(daysLivedRaw / 7);
  const weeksRemaining = exceededExpectancy ? 0 : totalWeeks - weeksLived;

  const totalMonths = lifeExpectancy * 12;
  const monthsLivedRaw = monthsBetween(birthday, now);
  const monthsLived = exceededExpectancy ? totalMonths : Math.min(monthsLivedRaw, totalMonths);
  const monthsRemaining = exceededExpectancy ? 0 : totalMonths - monthsLived;

  const yearsLivedRaw = daysLivedRaw / DAYS_PER_YEAR;
  const yearsLived = exceededExpectancy ? lifeExpectancy : Math.floor(yearsLivedRaw);
  const yearsRemaining = exceededExpectancy ? 0 : lifeExpectancy - yearsLived;

  const percentLived = exceededExpectancy ? 100 : Math.min((daysLivedRaw / totalDays) * 100, 100);

  const totalHeartbeats = Math.round(totalDays * MINUTES_PER_DAY * AVG_HEARTBEATS_PER_MINUTE);
  const heartbeatsUsed = Math.round(daysLived * MINUTES_PER_DAY * AVG_HEARTBEATS_PER_MINUTE);
  const heartbeatsRemaining = totalHeartbeats - heartbeatsUsed;

  return {
    birthday,
    deathDate,
    lifeExpectancy,
    totalYears: lifeExpectancy,
    yearsLived,
    yearsRemaining,
    totalWeeks,
    weeksLived,
    weeksRemaining,
    totalMonths,
    monthsLived,
    monthsRemaining,
    totalDays,
    daysLived,
    daysRemaining,
    percentLived,
    currentSeason: getSeason(percentLived),
    totalHeartbeats,
    heartbeatsUsed,
    heartbeatsRemaining,
    totalSunsets: totalDays,
    sunsetsUsed: daysLived,
    sunsetsRemaining: daysRemaining,
    exceededExpectancy,
  };
}

export function getTimeRemaining(deathDate: Date): {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const now = new Date();

  if (now >= deathDate) {
    return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  let years = deathDate.getFullYear() - now.getFullYear();
  let months = deathDate.getMonth() - now.getMonth();
  let days = deathDate.getDate() - now.getDate();
  let hours = deathDate.getHours() - now.getHours();
  let minutes = deathDate.getMinutes() - now.getMinutes();
  let seconds = deathDate.getSeconds() - now.getSeconds();

  if (seconds < 0) { seconds += 60; minutes--; }
  if (minutes < 0) { minutes += 60; hours--; }
  if (hours < 0) { hours += 24; days--; }
  if (days < 0) {
    const prevMonth = new Date(deathDate.getFullYear(), deathDate.getMonth(), 0);
    days += prevMonth.getDate();
    months--;
  }
  if (months < 0) { months += 12; years--; }

  return { years, months, days, hours, minutes, seconds };
}
