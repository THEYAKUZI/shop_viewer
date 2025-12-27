import React, { useState, useEffect } from 'react';
import { subscribeToLikes, toggleLike } from '../utils/likeService';
import './LikeButton.css';

export default function LikeButton({ offerId }) {
    const [data, setData] = useState({ count: 0, isLiked: false });
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeToLikes(offerId, (newData) => {
            setData(newData);
        });
        return () => unsubscribe();
    }, [offerId]);

    const handleClick = (e) => {
        e.stopPropagation(); // Prevent card click
        e.preventDefault();

        if (!data.isLiked) {
            setAnimating(true);
            setTimeout(() => setAnimating(false), 600);
        }

        toggleLike(offerId);
    };

    return (
        <button
            className={`like-btn ${data.isLiked ? 'liked' : ''} ${animating ? 'animating' : ''}`}
            onClick={handleClick}
            title={data.isLiked ? "Unlike" : "Like"}
        >
            <div className="heart-icon">
                <svg viewBox="0 0 24 24" fill={data.isLiked ? "#ff4081" : "none"} stroke={data.isLiked ? "#ff4081" : "currentColor"} strokeWidth="2">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
            </div>
            <span className="like-count">{data.count}</span>
            <div className="hover-label">RECOMMEND</div>
        </button>
    );
}
