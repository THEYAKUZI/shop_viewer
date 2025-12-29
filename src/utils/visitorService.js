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
    const onlineUsersRef = ref(db, 'stats/live_sessions_v1'); // Changed key to reset
    let myUserRef;

    // Monitor connection state
    const unsubConnected = onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            // We're connected!
            // Create a reference specifically for this session
            myUserRef = push(onlineUsersRef);

            // When we disconnect (close tab/network loss), remove this ref
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
        onUpdate(prev => ({ ...prev, total: snap.val() || 0 }));
    });

    // Separate listener for online count
    const unsubOnline = onValue(onlineUsersRef, (snap) => {
        const users = snap.val() || {};
        const onlineCount = Object.keys(users).length;
        onUpdate(prev => ({ ...prev, online: onlineCount }));
    });

    return () => {
        unsubVisits();
        unsubOnline();
        unsubConnected();

        // Manual cleanup: If the component unmounts (e.g. navigation), 
        // remove our specific node so we don't count as double if we come back.
        if (myUserRef) {
            set(myUserRef, null).catch(err => console.error("Cleanup failed", err));
        }
    };
};

// Helper just to get initial read if needed
const getOnlineCount = (currentTotal) => {
    // implementation handled in listeners
};
