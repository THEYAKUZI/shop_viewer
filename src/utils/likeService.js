import { db } from '../firebase';
import { ref, onValue, runTransaction } from 'firebase/database';

const LOCAL_STORAGE_KEY = 'rampage_user_votes_v1';

// Helpers for local tracking
const getLocalVote = (id) => {
    try {
        const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        return stored[id] || null; // 'up', 'down', or null
    } catch {
        return null;
    }
};

const setLocalVote = (id, voteType) => {
    try {
        const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        if (voteType) stored[id] = voteType;
        else delete stored[id];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stored));
    } catch (e) {
        console.error("Local storage error:", e);
    }
};

// --- Real Implementation ---

export const subscribeToVotes = (id, onUpdate) => {
    if (db) {
        const votesRef = ref(db, `votes/${id}`);
        const unsubscribe = onValue(votesRef, (snapshot) => {
            const val = snapshot.val() || { up: 0, down: 0 };
            const up = val.up || 0;
            const down = val.down || 0;
            const score = up - down;
            const userVote = getLocalVote(id);

            // Calculate percentage (optional usage)
            const total = up + down;
            const percentage = total > 0 ? Math.round((up / total) * 100) : 0;

            onUpdate({
                score,
                up,
                down,
                percentage,
                userVote
            });
        });
        return unsubscribe;
    }

    // Mock Mode
    const mockHash = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i);
        return Math.abs(hash % 100);
    };

    // Simulate some existing votes
    let baseUp = mockHash(id);
    let baseDown = mockHash(id + 'down') % 20;

    // Adjust for local user action in mock mode
    const sendUpdate = () => {
        const userVote = getLocalVote(id);
        let up = baseUp;
        let down = baseDown;

        if (userVote === 'up') up++;
        if (userVote === 'down') down++;

        const score = up - down;
        const total = up + down;
        const percentage = total > 0 ? Math.round((up / total) * 100) : 0;

        onUpdate({ score, up, down, percentage, userVote });
    };

    sendUpdate();
    const handleStorage = () => sendUpdate();
    window.addEventListener('mock-vote-update', handleStorage);
    return () => window.removeEventListener('mock-vote-update', handleStorage);
};

export const handleVote = async (id, type) => {
    // type: 'up' | 'down'
    const currentVote = getLocalVote(id);
    let newVote = type;

    // If clicking same button, toggle off
    if (currentVote === type) {
        newVote = null;
    }

    setLocalVote(id, newVote);

    if (db) {
        const votesRef = ref(db, `votes/${id}`);
        try {
            await runTransaction(votesRef, (currentData) => {
                if (currentData === null) currentData = { up: 0, down: 0 };

                // Remove influence of old vote
                if (currentVote === 'up') currentData.up = Math.max(0, (currentData.up || 0) - 1);
                if (currentVote === 'down') currentData.down = Math.max(0, (currentData.down || 0) - 1);

                // Add influence of new vote
                if (newVote === 'up') currentData.up = (currentData.up || 0) + 1;
                if (newVote === 'down') currentData.down = (currentData.down || 0) + 1;

                return currentData;
            });
        } catch (e) {
            console.error("Firebase transaction failed:", e);
        }
    } else {
        // Mock Update
        window.dispatchEvent(new Event('mock-vote-update'));
    }

    return newVote;
};

// Maintained for App.jsx sorting (returns map of ID -> Score)
export const subscribeToAllLikes = (onUpdate) => {
    if (db) {
        const votesRef = ref(db, 'votes');
        const unsubscribe = onValue(votesRef, (snapshot) => {
            const val = snapshot.val() || {};
            const scores = {};
            Object.keys(val).forEach(key => {
                const item = val[key];
                const up = item.up || 0;
                const down = item.down || 0;
                scores[key] = up - down;
            });
            onUpdate(scores);
        });
        return unsubscribe;
    }

    onUpdate({});
    return () => { };
};
