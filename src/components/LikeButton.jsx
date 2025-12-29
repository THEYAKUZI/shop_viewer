import React, { useState, useEffect } from 'react';
import { subscribeToVotes, handleVote } from '../utils/likeService';
import './LikeButton.css';

export default function LikeButton({ offerId }) {
    const [data, setData] = useState({ score: 0, up: 0, down: 0, userVote: null });
    const [animating, setAnimating] = useState(null);

    useEffect(() => {
        const unsubscribe = subscribeToVotes(offerId, (newData) => {
            setData(newData);
        });
        return () => unsubscribe();
    }, [offerId]);

    const onVote = (type) => (e) => {
        e.stopPropagation();
        e.preventDefault();

        // Trigger animation if turning ON a vote
        if (data.userVote !== type) {
            setAnimating(type);
            setTimeout(() => setAnimating(null), 400);
        }

        handleVote(offerId, type);
    };

    const isUp = data.userVote === 'up';
    const isDown = data.userVote === 'down';

    // Format score: +15, -5, 0 (Neutral)
    const formattedScore = data.score > 0 ? `+${data.score}` : data.score;

    return (
        <div className="vote-widget" onClick={(e) => e.stopPropagation()}>
            <button
                className={`vote-btn up ${isUp ? 'active' : ''} ${animating === 'up' ? 'animating' : ''}`}
                onClick={onVote('up')}
                title="Buff (Good Stats)"
                aria-label="Upvote"
            >
                <div className="icon-wrapper">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
                    </svg>
                </div>
            </button>
            <span
                className={`vote-score ${data.score > 0 ? 'positive' : data.score < 0 ? 'negative' : ''}`}
                title={`+${data.up} / -${data.down}`}
            >
                {formattedScore}
            </span>
            <button
                className={`vote-btn down ${isDown ? 'active' : ''} ${animating === 'down' ? 'animating' : ''}`}
                onClick={onVote('down')}
                title="Debuff (Bad Stats)"
                aria-label="Downvote"
            >
                <div className="icon-wrapper">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7.41 8.59L12 13.17 16.59 8.59 18 10l-6 6-6-6 1.41-1.41z" />
                    </svg>
                </div>
            </button>
        </div>
    );
}
