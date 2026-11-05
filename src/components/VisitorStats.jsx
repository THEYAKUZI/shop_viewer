import React, { useEffect, useState } from 'react';
import { initVisitorTracking } from '../utils/visitorService';
import { useLanguage } from '../contexts/useLanguage';

// Total visit count. Also records this visit (once per browser per day).
const VisitorStats = () => {
    const { locale } = useLanguage();
    const [total, setTotal] = useState(null);

    useEffect(() => initVisitorTracking(setTotal), []);

    return <>{total === null ? '-' : total.toLocaleString(locale)}</>;
};

export default VisitorStats;
