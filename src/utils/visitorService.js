import { db } from '../firebase';
import { ref, onValue, set, increment } from 'firebase/database';

const LAST_VISIT_KEY = 'rampage_last_visit_day';

// Counts each browser once per day, so new tabs and reloads don't add visits.
const shouldCountVisit = () => {
    const today = new Date().toISOString().slice(0, 10);
    try {
        if (localStorage.getItem(LAST_VISIT_KEY) === today) return false;
        localStorage.setItem(LAST_VISIT_KEY, today);
    } catch {
        // Storage blocked: count this visit and move on.
    }
    return true;
};

// Increments the visit counter (once per day) and streams the total to onTotal.
export const initVisitorTracking = (onTotal) => {
    if (!db) {
        onTotal(0);
        return () => { };
    }

    const visitsRef = ref(db, 'stats/totalVisits');
    // Local development doesn't count as a visit.
    if (!import.meta.env.DEV && shouldCountVisit()) {
        set(visitsRef, increment(1)).catch(err => console.error("Visit count failed", err));
    }

    return onValue(visitsRef, (snap) => onTotal(snap.val() || 0));
};
