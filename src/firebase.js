import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// Firebase web config. These values are public identifiers, not secrets:
// access is controlled by the Realtime Database rules (database.rules.json).
const firebaseConfig = {
    apiKey: "AIzaSyCkVqu6VoOuIvkBPVm0zqmHQgGCcldgFro",
    authDomain: "rampagearmory.firebaseapp.com",
    projectId: "rampagearmory",
    storageBucket: "rampagearmory.firebasestorage.app",
    messagingSenderId: "748445390640",
    appId: "1:748445390640:web:1f2fb9945685873672daf5",
    measurementId: "G-QM46V4R4YG",
    databaseURL: "https://rampagearmory-default-rtdb.firebaseio.com"
};

let app, db, analytics;

try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    analytics = getAnalytics(app);
} catch (error) {
    console.error("Firebase init error:", error);
}

// Resolves to an anonymous user id, signing in only the first time a visitor
// likes or rates something. Each id can cast one like and one rating per item.
// The auth SDK is loaded on demand so visitors who never vote don't download it.
let uidPromise = null;
export const getUid = () => {
    if (!app) return Promise.reject(new Error("Firebase unavailable"));
    if (!uidPromise) {
        uidPromise = import("firebase/auth")
            .then(({ getAuth, onAuthStateChanged, signInAnonymously }) => {
                const auth = getAuth(app);
                return new Promise((resolve) => {
                    const stop = onAuthStateChanged(auth, (user) => {
                        stop();
                        resolve(user || signInAnonymously(auth).then((cred) => cred.user));
                    });
                });
            })
            .then((user) => user.uid)
            .catch((error) => {
                uidPromise = null; // allow a retry on the next click
                throw error;
            });
    }
    return uidPromise;
};

export { db, app, analytics };
