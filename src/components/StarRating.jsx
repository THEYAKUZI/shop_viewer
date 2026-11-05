import React, { useState } from 'react';
import { getLocalRating, submitRating } from '../utils/ratingService';
import { useLanguage } from '../contexts/useLanguage';

const LABELS = { 1: 'Very bad', 2: 'Bad', 3: 'Okay', 4: 'Good', 5: 'Great' };

// Interactive 1-5 stars. Shows your rating if you rated, otherwise the average.
export default function StarRating({ offerId, average = 0, count = 0 }) {
    const { t } = useLanguage();
    const [myRating, setMyRating] = useState(() => getLocalRating(offerId));
    const [hover, setHover] = useState(0);
    const [busy, setBusy] = useState(false);

    const handleRate = async (rating) => {
        if (busy) return;
        setBusy(true);
        const stored = await submitRating(offerId, myRating === rating ? null : rating);
        setMyRating(stored ?? undefined);
        setBusy(false);
    };

    const shown = hover || myRating || average;
    const mine = !hover && myRating !== undefined;

    return (
        <div className="rating" onMouseLeave={() => setHover(0)}>
            <div className={`rating-stars ${mine ? 'mine' : ''} ${hover ? 'hovering' : ''} ${busy ? 'busy' : ''}`}>
                {[1, 2, 3, 4, 5].map(star => (
                    <button
                        key={star}
                        type="button"
                        className="rating-star"
                        style={{ '--fill': `${Math.max(0, Math.min(1, shown - (star - 1))) * 100}%` }}
                        onMouseEnter={() => setHover(star)}
                        onClick={(e) => { e.stopPropagation(); handleRate(star); }}
                        aria-label={`${t('Rate')} ${star}`}
                    >★</button>
                ))}
            </div>
            <span className="rating-text">
                {hover
                    ? t(LABELS[hover])
                    : count > 0
                        ? <><strong>{average.toFixed(1)}</strong> ({count})</>
                        : t('No ratings')}
            </span>
        </div>
    );
}
