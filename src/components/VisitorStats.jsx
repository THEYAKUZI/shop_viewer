import React, { useEffect, useState } from 'react';
import { initVisitorTracking } from '../utils/visitorService';
import { useLanguage } from '../contexts/useLanguage';
import './VisitorStats.css';

// Total visit count. Also records this visit (once per browser per day).
const VisitorStats = () => {
    const { t, locale } = useLanguage();
    const [total, setTotal] = useState(null);

    useEffect(() => initVisitorTracking(setTotal), []);

    return (
        <div className="visitor-stats">
            <div className="stat-item">
                <span className="stat-val">{total === null ? '-' : total.toLocaleString(locale)}</span>
                <span className="stat-label">{t('VISITS')}</span>
            </div>
        </div>
    );
};

export default VisitorStats;
