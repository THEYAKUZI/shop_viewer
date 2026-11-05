import { db, getUid } from '../firebase';
import { ref, onValue, get, update, increment } from 'firebase/database';

// Remembers which offers this browser liked so hearts render instantly.
// The server-side vote (likeVotes/{offerId}/{uid}) is the source of truth.
const LOCAL_STORAGE_KEY = 'rampage_user_likes_v1';

const readLocalLikes = () => {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
};

export const getLocalLikeStatus = (id) => !!readLocalLikes()[id];

const setLocalLikeStatus = (id, liked) => {
    try {
        const stored = readLocalLikes();
        if (liked) stored[id] = true;
        else delete stored[id];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stored));
    } catch {
        // Storage can be blocked (private mode); the heart just won't persist.
    }
};

// Likes or unlikes an offer. Resolves to { liked, changedServer }.
export const toggleLike = async (id) => {
    const wantLiked = !getLocalLikeStatus(id);
    setLocalLikeStatus(id, wantLiked);
    if (!db) return { liked: wantLiked, changedServer: false };

    try {
        const uid = await getUid();
        const votePath = `likeVotes/${id}/${uid}`;
        const hasVote = (await get(ref(db, votePath))).exists();

        // Already in the wanted state on the server. This also covers likes made
        // before per-user votes existed: they stay counted and are only cleared locally.
        if (hasVote === wantLiked) return { liked: wantLiked, changedServer: false };

        await update(ref(db), {
            [votePath]: wantLiked ? true : null,
            [`likes/${id}`]: increment(wantLiked ? 1 : -1),
        });
        return { liked: wantLiked, changedServer: true };
    } catch (e) {
        console.error('Like failed:', e);
        setLocalLikeStatus(id, !wantLiked);
        return { liked: !wantLiked, changedServer: false };
    }
};

export const subscribeToAllLikes = (onUpdate) => {
    if (!db) {
        onUpdate({});
        return () => { };
    }
    return onValue(ref(db, 'likes'), (snapshot) => onUpdate(snapshot.val() || {}));
};
