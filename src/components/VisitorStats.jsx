import React, { useEffect, useState } from 'react';
import { initVisitorTracking } from '../utils/visitorService';
import './VisitorStats.css';

const VisitorStats = () => {
    const [stats, setStats] = useState({ total: 0, online: 1 });

    useEffect(() => {
        const unsubscribe = initVisitorTracking((updateFn) => {
            // updateFn can be a value or a function accepting prev state
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
                <span className="dot online"></span>
                <span className="stat-val">{stats.online}</span>
                <span className="stat-label">ONLINE</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
                <span className="stat-val">{stats.total.toLocaleString()}</span>
                <span className="stat-label">VISITS</span>
            </div>
        </div>
    );
};

export default VisitorStats;
