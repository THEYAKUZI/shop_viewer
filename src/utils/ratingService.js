import { db, getUid } from '../firebase';
import { ref, onValue, get, update, increment } from 'firebase/database';

// Remembers what this browser rated so stars render instantly.
// The server-side vote (ratingVotes/{offerId}/{uid}) is the source of truth.
const LOCAL_STORAGE_KEY_RATINGS = 'rampage_user_ratings_v1';

const readLocalRatings = () => {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_RATINGS) || '{}');
    } catch {
        return {};
    }
};

export const getLocalRating = (id) => readLocalRatings()[id];

const setLocalRating = (id, rating) => {
    try {
        const stored = readLocalRatings();
        if (rating == null) delete stored[id];
        else stored[id] = rating;
        localStorage.setItem(LOCAL_STORAGE_KEY_RATINGS, JSON.stringify(stored));
    } catch {
        // Storage can be blocked (private mode); the rating just won't persist locally.
    }
};

// Streams every offer's rating totals as { [offerId]: { average, count, sum } }.
export const subscribeToAllRatings = (onUpdate) => {
    if (!db) {
        onUpdate({});
        return () => { };
    }
    return onValue(ref(db, 'ratings'), (snapshot) => {
        const all = {};
        Object.entries(snapshot.val() || {}).forEach(([id, val]) => {
            const count = (val && val.count) || 0;
            const sum = (val && val.sum) || 0;
            all[id] = { count, sum, average: count > 0 ? Math.round((sum / count) * 10) / 10 : 0 };
        });
        onUpdate(all);
    });
};

// Sets this visitor's rating (1-5) for an offer, or removes it with null.
// Resolves to the rating that is now stored for this browser.
export const submitRating = async (id, newRating) => {
    const previousLocal = getLocalRating(id);
    setLocalRating(id, newRating);
    if (!db) return newRating;

    try {
        const uid = await getUid();
        const votePath = `ratingVotes/${id}/${uid}`;
        const snap = await get(ref(db, votePath));
        const oldRating = snap.exists() ? snap.val() : null;

        // Nothing to change on the server. Removing a rating made before per-user
        // votes existed also lands here: it stays in the totals and is cleared locally.
        if (oldRating === newRating || (oldRating === null && newRating === null)) return newRating;

        const updates = {
            [votePath]: newRating,
            [`ratings/${id}/sum`]: increment((newRating || 0) - (oldRating || 0)),
        };
        if (oldRating === null) updates[`ratings/${id}/count`] = increment(1);
        if (newRating === null) updates[`ratings/${id}/count`] = increment(-1);

        await update(ref(db), updates);
        return newRating;
    } catch (e) {
        console.error('Rating failed:', e);
        setLocalRating(id, previousLocal);
        return previousLocal;
    }
};
