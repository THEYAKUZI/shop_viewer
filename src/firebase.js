// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Your provided configuration with Database URL assumption
const firebaseConfig = {
    apiKey: "AIzaSyCkVqu6VoOuIvkBPVm0zqnHQgGCcldgFro",
    authDomain: "rampagearmory.firebaseapp.com",
    projectId: "rampagearmory",
    storageBucket: "rampagearmory.firebasestorage.app",
    messagingSenderId: "748445390640",
    appId: "1:748445390640:web:1f2fb9945685873672daf5",
    measurementId: "G-QM46V4R4YG",
    // PLEASE VERIFY THIS URL IN THE FIREBASE CONSOLE -> REALTIME DATABASE TAB
    databaseURL: "https://rampagearmory-default-rtdb.firebaseio.com"
};

// reCAPTCHA v3 Site Key for App Check
const RECAPTCHA_SITE_KEY = "6LfIn08sAAAAAKGrTqQwBm8G98ANaOuu57r5nh2P";

// Initialize Firebase
let app, db, analytics, appCheck;

try {
    app = initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
    
    // Initialize App Check with reCAPTCHA v3
    appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true
    });
    console.log("App Check initialized successfully");
    
    // Initialize Database
    db = getDatabase(app);
    console.log("Firebase connected successfully to:", firebaseConfig.databaseURL);
} catch (error) {
    console.error("FIREBASE INIT ERROR:", error);
}

export { db, app, analytics, appCheck };
