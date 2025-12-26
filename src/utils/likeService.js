const STORAGE_KEY = 'rampage_likes_v1';

// Initial seed data ensures consistent "popularity" across refreshes for everyone (simulated)
// In a real app, this would come from a database.
const getInitialCount = (id) => {
    // Generate a consistent pseudo-random number based on the ID string
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i);
        hash |= 0;
    }
    // Map hash to a number between 5 and 150
    return Math.abs(hash % 145) + 5;
};

export const getLikes = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
};

export const getLikeData = (id) => {
    const all = getLikes();
    if (!all[id]) {
        // Initialize if not present
        return {
            count: getInitialCount(id),
            isLiked: false
        };
    }
    return all[id];
};

export const toggleLike = (id) => {
    const all = getLikes();
    const current = all[id] || { count: getInitialCount(id), isLiked: false };

    const newData = {
        count: current.isLiked ? current.count - 1 : current.count + 1,
        isLiked: !current.isLiked
    };

    all[id] = newData;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

    // Dispatch event for live updates across components/tabs
    window.dispatchEvent(new Event('likes-updated'));

    return newData;
};
