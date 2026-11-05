import React, { useState, useEffect } from 'react';

// Counts down to targetTime (ms since epoch) and calls onExpire once when it hits zero.
const ShopTimer = ({ targetTime, onExpire }) => {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const diff = Math.max(0, targetTime - now);
    const expired = diff === 0;

    useEffect(() => {
        if (expired && onExpire) onExpire();
    }, [expired, onExpire]);

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff / 60000) % 60);
    const s = Math.floor((diff / 1000) % 60);
    const pad = (n) => String(n).padStart(2, '0');

    return (
        <div className="timer" role="timer" aria-label={`${h}h ${m}m ${s}s`}>
            <span className="timer-seg"><span className="timer-num">{pad(h)}</span><span className="timer-unit">h</span></span>
            <span className="timer-seg"><span className="timer-num">{pad(m)}</span><span className="timer-unit">m</span></span>
            <span className="timer-seg"><span className="timer-num">{pad(s)}</span><span className="timer-unit">s</span></span>
        </div>
    );
};

export default ShopTimer;
