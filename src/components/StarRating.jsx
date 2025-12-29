
import React, { useState, useEffect } from 'react';
import { subscribeToRatings, submitRating } from '../utils/ratingService';
import './StarRating.css';

export default function StarRating({ offerId }) {
    const [data, setData] = useState({ average: 0, count: 0, myRating: undefined });
    const [hoverRating, setHoverRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeToRatings(offerId, (newData) => {
            setData(newData);
        });
        return () => unsubscribe();
    }, [offerId]);

    const handleRate = async (rating) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            // Toggle off if clicking same rating
            if (data.myRating === rating) {
                await submitRating(offerId, null);
            } else {
                await submitRating(offerId, rating);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRatingLabel = (rating) => {
        switch (rating) {
            case 1: return "Very Bad";
            case 2: return "Bad";
            case 3: return "Mid";
            case 4: return "Good";
            case 5: return "Perfection";
            default: return "";
        }
    };

    return (
        <div className="star-rating-container" title="Rate this item">
            <div
                className={`stars ${isSubmitting ? 'rating-loading' : ''}`}
                onMouseLeave={() => setHoverRating(0)}
            >
                {[1, 2, 3, 4, 5].map((star) => {
                    // Fill if star <= hover (if hovering) OR star <= myRating (if rated)
                    // If not hovering and not rated, maybe show average? 
                    // Usually user wants to see THEIR rating if they rated.
                    // If they haven't rated, showing average stars is confusing if it's interactive.
                    // Let's stick to: Filled if <= (hover || myRating).
                    // If no hover and no rating, empty? Or maybe show average visually?
                    // User request: "click on how high u want to rate it... under it show overall"
                    // Typical interaction: visually represent average if not user-rated?
                    // But then it's confusing if you click.
                    // Let's do: Show My Rating if exists, otherwise empty. 
                    // BUT for "average", we often show the average stars if user hasn't rated.
                    // Let's stick to simple: Inteactive stars. 



                    const isUserRating = data.myRating !== undefined;

                    const effectiveRating = hoverRating > 0
                        ? hoverRating
                        : (isUserRating ? data.myRating : (data.average || 0));

                    const fillPercentage = Math.max(0, Math.min(100, (effectiveRating - (star - 1)) * 100));

                    const isDim = hoverRating === 0 && !isUserRating;

                    return (
                        <span
                            key={star}
                            className={`star ${isDim ? 'dim' : ''} ${isUserRating ? 'my-rating' : ''}`}
                            style={{ '--fill-percent': `${fillPercentage}%` }}
                            onMouseEnter={() => setHoverRating(star)}
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleRate(star);
                            }}
                        >
                            ★
                        </span>
                    );
                })}
            </div>
            <div className="rating-stats" style={{ minHeight: '1.2em' }}>
                {hoverRating > 0 ? (
                    <span style={{ color: '#ffd700', fontWeight: 'bold', textTransform: 'capitalize' }}>
                        {getRatingLabel(hoverRating)}
                    </span>
                ) : (
                    data.count > 0 ? (
                        <>
                            <span style={{ color: '#fff', fontWeight: 'bold' }}>{data.average}</span>
                            <span style={{ fontSize: '0.65em', marginLeft: '2px', opacity: 0.7 }}>({data.count})</span>
                        </>
                    ) : (
                        <span style={{ opacity: 0.7 }}>No ratings</span>
                    )
                )}
            </div>
        </div>
    );
}
