import React, { useEffect, useState, useRef } from 'react';
import { initVisitorTracking } from '../utils/visitorService';
import './VisitorStats.css';

const RollingDigit = ({ digit }) => {
    const [current, setCurrent] = useState(digit);
    const [prev, setPrev] = useState(digit);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        if (digit !== current) {
            setPrev(current);
            setCurrent(digit);
            setAnimating(true);
            const timer = setTimeout(() => setAnimating(false), 400);
            return () => clearTimeout(timer);
        }
    }, [digit]);

    return (
        <span className="rolling-digit">
            <span className={`digit-current ${animating ? 'slide-in' : ''}`}>{current}</span>
            {animating && <span className="digit-prev">{prev}</span>}
        </span>
    );
};

const RollingNumber = ({ value }) => {
    const digits = value.toLocaleString().split('');
    return (
        <span className="rolling-number">
            {digits.map((char, i) => (
                char === ',' ? <span key={`sep-${i}`} className="digit-separator">,</span>
                : <RollingDigit key={`${digits.length}-${i}`} digit={char} />
            ))}
        </span>
    );
};

const VisitorStats = () => {
    const [stats, setStats] = useState({ total: 0, online: 1 });

    useEffect(() => {
        const unsubscribe = initVisitorTracking((updateFn) => {
            setStats(prev => {
                if (typeof updateFn === 'function') {
                    return { ...prev, ...updateFn(prev) };
                }
                return { ...prev, ...updateFn };
            });
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="visitor-stats">
            <div className="stat-item">
                <span className="stat-val"><RollingNumber value={stats.total} /></span>
                <span className="stat-label">VISITS</span>
            </div>
        </div>
    );
};

export default VisitorStats;
