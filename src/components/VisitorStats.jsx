import React, { useEffect, useState } from 'react';
import { initVisitorTracking } from '../utils/visitorService';
import './VisitorStats.css';

const VisitorStats = () => {
    const [total, setTotal] = useState(0);

    useEffect(() => initVisitorTracking(setTotal), []);

    return (
        <div className="visitor-stats">
            <div className="stat-item">
                <span className="stat-val">{total.toLocaleString()}</span>
                <span className="stat-label">VISITS</span>
            </div>
        </div>
    );
};

export default VisitorStats;
