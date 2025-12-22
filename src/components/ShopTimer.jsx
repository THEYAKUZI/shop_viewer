
import React, { useState, useEffect } from 'react';

const ShopTimer = ({ targetDate, onExpire }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const target = new Date(targetDate);
            const difference = target - now;

            if (difference <= 0) {
                if (onExpire) onExpire();
                return 'Resetting...';
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((difference / 1000 / 60) % 60);
            const seconds = Math.floor((difference / 1000) % 60);

            let timeString = '';
            if (days > 0) timeString += `${days}d `;
            if (hours > 0) timeString += `${hours}h `;
            timeString += `${minutes}m ${seconds}s`; // Always show minutes and seconds

            return timeString;
        };

        // Initial calculation
        const initial = calculateTimeLeft();
        setTimeLeft(initial);

        // If already expired, don't start interval
        if (initial === 'Resetting...') return;

        // Update every second
        const timer = setInterval(() => {
            const val = calculateTimeLeft();
            setTimeLeft(val);
            if (val === 'Resetting...') {
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [targetDate, onExpire]);

    return (
        <span style={{
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 'normal',
            marginLeft: '15px',
            textTransform: 'none',
            fontFamily: 'var(--font-main)'
        }}>
            (Resets in: <span style={{ color: '#ffcc00', fontWeight: 'bold' }}>{timeLeft}</span>)
        </span>
    );
};

export default ShopTimer;
