import React, { useRef, useState } from 'react';
import { getLocalRating, submitRating } from '../utils/ratingService';
import { useLanguage } from '../contexts/useLanguage';

const LABELS = { 1: 'Very bad', 2: 'Bad', 3: 'Okay', 4: 'Good', 5: 'Great' };

// 1-5 stars. The stars always show the community average; your own vote is shown
// as small text next to it (and left out of copied images).
// Works as a radio group: one tab stop, arrow keys move, Enter/Space rates.
export default function StarRating({ offerId, name, average = 0, count = 0 }) {
    const { t } = useLanguage();
    const [myRating, setMyRating] = useState(() => getLocalRating(offerId));
    const [hover, setHover] = useState(0);
    const [busy, setBusy] = useState(false);
    const groupRef = useRef(null);

    const handleRate = async (rating) => {
        if (busy) return;
        setBusy(true);
        const stored = await submitRating(offerId, myRating === rating ? null : rating);
        setMyRating(stored ?? undefined);
        setBusy(false);
    };

    const onKeyDown = (e) => {
        const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        const buttons = [...groupRef.current.querySelectorAll('button')];
        const current = buttons.indexOf(document.activeElement);
        const next = Math.min(4, Math.max(0, (current < 0 ? 0 : current) + step));
        buttons[next].focus();
        setHover(next + 1);
    };

    const shown = hover || average;
    const focusStar = myRating || 1;

    return (
        <div className="rating" onMouseLeave={() => setHover(0)}>
            <div
                ref={groupRef}
                role="radiogroup"
                aria-label={`${t('Rate')} ${name}`}
                className={`rating-stars ${hover ? 'hovering' : ''} ${busy ? 'busy' : ''}`}
                onKeyDown={onKeyDown}
                onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHover(0); }}
            >
                {[1, 2, 3, 4, 5].map(star => (
                    <button
                        key={star}
                        type="button"
                        role="radio"
                        aria-checked={myRating === star}
                        aria-label={`${star} – ${t(LABELS[star])}`}
                        tabIndex={star === focusStar ? 0 : -1}
                        className="rating-star"
                        style={{ '--fill': Math.max(0, Math.min(1, shown - (star - 1))) }}
                        onMouseEnter={() => setHover(star)}
                        onClick={(e) => { e.stopPropagation(); handleRate(star); }}
                    >★</button>
                ))}
            </div>
            <span className="rating-text">
                {hover
                    ? t(LABELS[hover])
                    : <>
                        {count > 0 ? <><strong>{average.toFixed(1)}</strong> ({count})</> : t('No ratings')}
                        {myRating !== undefined && <span className="rating-mine"> · {t('you')}: {myRating}★</span>}
                    </>}
            </span>
        </div>
    );
}
