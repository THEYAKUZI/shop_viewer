
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
        // removing optimistic update to avoid flash if transaction is slow, 
        // relying on transaction returning or subscription update? 
        // Subscription is fast usually.
        setIsSubmitting(true);
        try {
            await submitRating(offerId, rating);
        } finally {
            setIsSubmitting(false);
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

                    const isFilled = hoverRating > 0
                        ? star <= hoverRating
                        : (data.myRating && star <= data.myRating);

                    return (
                        <span
                            key={star}
                            className={`star ${isFilled ? 'filled' : ''} ${hoverRating >= star ? 'hovered' : ''}`}
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
            <div className="rating-stats">
                {data.count > 0 ? (
                    <>
                        <span style={{ color: '#fff', fontWeight: 'bold' }}>{data.average}</span>
                        <span style={{ fontSize: '0.65em', marginLeft: '2px', opacity: 0.7 }}>({data.count})</span>
                    </>
                ) : (
                    <span style={{ opacity: 0.7 }}>No ratings</span>
                )}
            </div>
        </div>
    );
}
