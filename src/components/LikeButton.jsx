import React, { useState } from 'react';
import { getLocalLikeStatus, toggleLike } from '../utils/likeService';
import { useLanguage } from '../contexts/useLanguage';

export default function LikeButton({ offerId, count = 0 }) {
    const { t } = useLanguage();
    const [liked, setLiked] = useState(() => getLocalLikeStatus(offerId));
    const [animating, setAnimating] = useState(false);
    const [busy, setBusy] = useState(false);
    // Optimistic +1/-1 shown until the server count (the count prop) changes.
    const [pending, setPending] = useState(null);

    const shownCount = Math.max(0, pending && pending.base === count ? count + pending.delta : count);

    const handleClick = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (busy) return;

        const next = !liked;
        if (next) {
            setAnimating(true);
            setTimeout(() => setAnimating(false), 300);
        }
        setBusy(true);
        setLiked(next);
        setPending({ base: count, delta: next ? 1 : -1 });

        const result = await toggleLike(offerId);
        setLiked(result.liked);
        if (!result.changedServer) setPending(null);
        setBusy(false);
    };

    return (
        <button
            type="button"
            className={`like-btn ${liked ? 'liked' : ''} ${animating ? 'pop' : ''}`}
            onClick={handleClick}
            title={liked ? t('Unlike') : t('Like')}
            aria-label={`${t('Like')} (${shownCount})`}
            aria-pressed={liked}
        >
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span>{shownCount}</span>
        </button>
    );
}
