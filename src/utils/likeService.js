import { db } from '../firebase';
import { ref, onValue, runTransaction, get } from 'firebase/database';

const LOCAL_STORAGE_KEY = 'rampage_user_likes_v1';

// Helpers for local tracking (did *I* like this?)
const getLocalLikeStatus = (id) => {
    try {
        const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        return !!stored[id];
    } catch {
        return false;
    }
};

const setLocalLikeStatus = (id, status) => {
    try {
        const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        if (status) stored[id] = true;
        else delete stored[id];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stored));
    } catch (e) {
        console.error("Local storage error:", e);
    }
};

// --- Real Implementation ---

export const subscribeToLikes = (id, onUpdate) => {
    const isLikedLocally = getLocalLikeStatus(id);

    // If Firebase is configured
    if (db) {
        const likesRef = ref(db, `likes/${id}`);
        const unsubscribe = onValue(likesRef, (snapshot) => {
            const val = snapshot.val();
            const count = (typeof val === 'number') ? val : 0;
            const currentLikedStatus = getLocalLikeStatus(id);
            onUpdate({ count, isLiked: currentLikedStatus });
        });
        return unsubscribe;
    }

    // Fallback: Mock mode (similar to previous version)
    // We simulate a subscription by returning immediate value
    // and listening for window events
    const mockHash = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i);
        return Math.abs(hash % 145) + 5;
    };

    // Initial callback
    let mockCount = mockHash(id);
    // Adjust mock count based on local like status to mimic server
    // (If I liked it locally, but we are mocking server, we assume server count includes me)
    // Actually simplicity: Mock count is static base + 1 if liked.

    const sendUpdate = () => {
        const liked = getLocalLikeStatus(id);
        onUpdate({
            count: mockCount + (liked ? 1 : 0),
            isLiked: liked
        });
    };

    sendUpdate();

    const handleStorage = () => sendUpdate();
    window.addEventListener('mock-like-update', handleStorage);

    return () => {
        window.removeEventListener('mock-like-update', handleStorage);
    };
};

export const toggleLike = async (id) => {
    const wasLiked = getLocalLikeStatus(id);
    const newStatus = !wasLiked;

    setLocalLikeStatus(id, newStatus);

    if (db) {
        // Update Firebase
        const likesRef = ref(db, `likes/${id}`);
        try {
            await runTransaction(likesRef, (currentCount) => {
                if (currentCount === null) return 1; // Initialize
                // If we are liking, +1. If unliking, -1.
                return newStatus ? (currentCount + 1) : (currentCount - 1);
            });
        } catch (e) {
            console.error("Firebase transaction failed:", e);
            // Revert local status if network fails? 
            // For now, keep optimistic UI or revert. 
            // Simple: don't revert, just log.
        }
    } else {
        // Update Mock
        window.dispatchEvent(new Event('mock-like-update'));
    }

    return newStatus;
};

export const subscribeToAllLikes = (onUpdate) => {
    if (db) {
        const likesRef = ref(db, 'likes');
        const unsubscribe = onValue(likesRef, (snapshot) => {
            const val = snapshot.val() || {};
            onUpdate(val);
        });
        return unsubscribe;
    }

    // Mock fallback
    // In mock mode, we don't really have "all" likes easily accessible or changing 
    // without iterating everything, but for filtering we can return an empty object or mock data.
    // For now, let's just return empty in mock mode properly to avoid errors.
    onUpdate({});
    return () => { };
};
