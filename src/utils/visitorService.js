import { db } from '../firebase';
import { ref, onValue, runTransaction, push, onDisconnect, set, serverTimestamp } from 'firebase/database';

export const initVisitorTracking = (onUpdate) => {
    if (!db) {
        // Mock data if firebase not set up
        onUpdate({ total: 1000, online: 1 });
        return () => { };
    }

    // 1. Total Visits Counter
    // We ideally only want to count this once per session/load
    const visitsRef = ref(db, 'stats/totalVisits');

    // Increment only if we haven't tracked this session yet (simple debounce)
    const sessionKey = `rampage_visit_${new Date().toISOString().split('T')[0]}`;
    if (!sessionStorage.getItem(sessionKey)) {
        runTransaction(visitsRef, (current) => {
            return (current || 0) + 1;
        }).then(() => {
            sessionStorage.setItem(sessionKey, 'true');
        }).catch(err => console.error("Visit tx failed", err));
    }

    // 2. Online Users (Presence)
    // Reference to standard firebase presence system
    const connectedRef = ref(db, '.info/connected');
    const onlineUsersRef = ref(db, 'stats/onlineUsers');

    // Monitor connection state
    onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            // We're connected!
            const myUserRef = push(onlineUsersRef);

            // When we disconnect, remove this ref
            onDisconnect(myUserRef).remove();

            // Set our status
            set(myUserRef, {
                timestamp: serverTimestamp(),
                userAgent: navigator.userAgent
            });
        }
    });

    // 3. Listen for counts to display
    // Total Visits Listener
    const unsubVisits = onValue(visitsRef, (snap) => {
        const total = snap.val() || 0;

        // Online Users Listener (nested mostly to simplify callback structure, 
        // realistically should be separate but we want atomic updates for the UI usually)
        // We'll just read online users here too
        getOnlineCount(total);
    });

    // Separate listener for online count
    const unsubOnline = onValue(onlineUsersRef, (snap) => {
        const users = snap.val() || {};
        const onlineCount = Object.keys(users).length;
        // We need to trigger update. We can store total in a variable or re-fetch.
        // For simplicity, let's assume the onUpdate handles partials or we pass current state.
        // Actually, let's explicitly read totalVisits current value? No, that's heavy.
        // Better pattern: Update state with whatever we have.
        onUpdate(prev => ({ ...prev, online: onlineCount }));
    });

    // Modified the visits listener to use the functional update pattern too
    const unsubVisits2 = onValue(visitsRef, (snap) => {
        onUpdate(prev => ({ ...prev, total: snap.val() || 0 }));
    });

    return () => {
        unsubVisits2();
        unsubOnline();
        // It's good practice to cleanup listeners, but 'onDisconnect' happens server-side 
        // automatically when the socket closes (closing tab).
        // However, if we unmount component but don't close tab, we might want to manually remove.
        // We'll leave automatic handling for now as it's most robust for 'closing website'.
    };
};

// Helper just to get initial read if needed
const getOnlineCount = (currentTotal) => {
    // implementation handled in listeners
};
