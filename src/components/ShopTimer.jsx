import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const ShopTimer = ({ targetDate, onExpire }) => {
    const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });
    const { t } = useLanguage();

    useEffect(() => {
        const calc = () => {
            const diff = new Date(targetDate) - new Date();
            if (diff <= 0) { if (onExpire) onExpire(); return null; }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff / 60000) % 60);
            const s = Math.floor((diff / 1000) % 60);
            return { h, m, s };
        };
        const initial = calc();
        if (initial) setTimeLeft(initial);
        const timer = setInterval(() => {
            const v = calc();
            if (v) setTimeLeft(v);
            else clearInterval(timer);
        }, 1000);
        return () => clearInterval(timer);
    }, [targetDate, onExpire]);

    const pad = (n) => String(n).padStart(2, '0');

    return (
        <div className="shop-timer-display">
            <div className="timer-digits">
                <div className="timer-block">
                    <span className="timer-num">{pad(timeLeft.h)}</span>
                    <span className="timer-unit">HRS</span>
                </div>
                <span className="timer-colon">:</span>
                <div className="timer-block">
                    <span className="timer-num">{pad(timeLeft.m)}</span>
                    <span className="timer-unit">MINS</span>
                </div>
                <span className="timer-colon">:</span>
                <div className="timer-block">
                    <span className="timer-num">{pad(timeLeft.s)}</span>
                    <span className="timer-unit">SECS</span>
                </div>
            </div>
        </div>
    );
};

export default ShopTimer;
