
import { db } from '../firebase';
import { ref, onValue, runTransaction } from 'firebase/database';

const LOCAL_STORAGE_KEY_RATINGS = 'rampage_user_ratings_v1';

// Helpers for local tracking (what did I rate this?)
const getLocalRating = (id) => {
    try {
        const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_RATINGS) || '{}');
        return stored[id]; // Returns number or undefined
    } catch {
        return undefined;
    }
};

const setLocalRating = (id, rating) => {
    try {
        const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_RATINGS) || '{}');
        stored[id] = rating;
        localStorage.setItem(LOCAL_STORAGE_KEY_RATINGS, JSON.stringify(stored));
    } catch (e) {
        console.error("Local storage error:", e);
    }
};

// --- Real Implementation ---

export const subscribeToRatings = (id, onUpdate) => {
    const myRating = getLocalRating(id);

    // If Firebase is configured
    if (db) {
        const ratingRef = ref(db, `ratings/${id}`);
        const unsubscribe = onValue(ratingRef, (snapshot) => {
            const val = snapshot.val();
            const sum = (val && val.sum) || 0;
            const count = (val && val.count) || 0;
            const average = count > 0 ? (sum / count) : 0;

            onUpdate({
                average: parseFloat(average.toFixed(1)),
                count,
                myRating: getLocalRating(id)
            });
        });
        return unsubscribe;
    }

    // Fallback: Mock mode
    const mockHash = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i);
        return (Math.abs(hash % 20) + 30) / 10; // Mock 3.0 to 5.0
    };

    let mockAvg = mockHash(id);
    let mockCount = Math.floor(mockAvg * 10);

    const sendUpdate = () => {
        const r = getLocalRating(id);
        // Simple mock adjust
        onUpdate({
            average: r ? ((mockAvg * mockCount + r) / (mockCount + 1)).toFixed(1) : mockAvg.toFixed(1),
            count: mockCount + (r ? 1 : 0),
            myRating: r
        });
    };

    sendUpdate();
    const handleStorage = () => sendUpdate();
    window.addEventListener('mock-rating-update', handleStorage);

    return () => {
        window.removeEventListener('mock-rating-update', handleStorage);
    };
};

export const submitRating = async (id, newRating) => {
    const oldRating = getLocalRating(id);

    // Save locally first
    setLocalRating(id, newRating);

    if (db) {
        // Update Firebase
        const ratingRef = ref(db, `ratings/${id}`);
        try {
            await runTransaction(ratingRef, (currentData) => {
                if (currentData === null) {
                    return { sum: newRating, count: 1 };
                }

                let { sum = 0, count = 0 } = currentData;

                if (oldRating !== undefined) {
                    // Updating existing rating
                    sum = sum - oldRating + newRating;
                } else {
                    // New rating
                    sum = sum + newRating;
                    count = count + 1;
                }

                return { sum, count };
            });
        } catch (e) {
            console.error("Firebase transaction failed:", e);
        }
    } else {
        // Update Mock
        window.dispatchEvent(new Event('mock-rating-update'));
    }

    return newRating;
};
