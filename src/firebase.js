// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/setup#create-firebase-project-and-app
const firebaseConfig = {
    apiKey: "AIzaSyCkVqu6VoOuIvkBPVm0zqnHQgGCcldgFro",
    authDomain: "rampagearmory.firebaseapp.com",
    projectId: "rampagearmory",
    storageBucket: "rampagearmory.firebasestorage.app",
    messagingSenderId: "748445390640",
    appId: "1:748445390640:web:1f2fb9945685873672daf5",
    measurementId: "G-QM46V4R4YG",
    databaseURL: "https://rampagearmory-default-rtdb.firebaseio.com"
};

// Initialize Firebase
let app;
let db;

try {
    // Only initialize if config is replaced (simple check)
    if (firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
        app = initializeApp(firebaseConfig);
        db = getDatabase(app);
        console.log("Firebase initialized successfully");
    } else {
        console.warn("Firebase config missing. Using local mock mode.");
    }
} catch (e) {
    console.error("Firebase initialization failed:", e);
}

export { db };
