// Whole calendar days from today (local time) until the given date.
export const daysFromToday = (iso) => {
    const d = new Date(iso), now = new Date();
    return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
};

// "today" / "tomorrow" / "in 3 days", translated.
export const relativeDay = (iso, t) => {
    const n = daysFromToday(iso);
    if (n <= 0) return t('today');
    if (n === 1) return t('tomorrow');
    return t('in {n} days').replace('{n}', n);
};
