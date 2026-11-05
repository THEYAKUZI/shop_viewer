import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/useLanguage';

// Counts down to targetTime (ms since epoch). Display only: the page re-splits the sections when a rotation ends.
const ShopTimer = ({ targetTime }) => {
    const { t } = useLanguage();
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const diff = Math.max(0, targetTime - now);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff / 60000) % 60);
    const s = Math.floor((diff / 1000) % 60);
    const pad = (n) => String(n).padStart(2, '0');

    return (
        <div className="shop-timer-display" role="timer" aria-label={`${h}h ${m}m ${s}s`}>
            <div className="timer-digits">
                <div className="timer-block"><span className="timer-num">{pad(h)}</span><span className="timer-unit">{t('HRS')}</span></div>
                <span className="timer-colon">:</span>
                <div className="timer-block"><span className="timer-num">{pad(m)}</span><span className="timer-unit">{t('MINS')}</span></div>
                <span className="timer-colon">:</span>
                <div className="timer-block"><span className="timer-num">{pad(s)}</span><span className="timer-unit">{t('SECS')}</span></div>
            </div>
        </div>
    );
};

export default ShopTimer;
