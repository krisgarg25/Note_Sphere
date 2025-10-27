// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAI, GoogleAIBackend } from 'firebase/ai';
import {getFirestore} from "@firebase/firestore";
import {getStorage} from "@firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBpIEHt9ac67AyuBUeTiX3yefXDj9M6jko",
    authDomain: "note-sphere-me.firebaseapp.com",
    projectId: "note-sphere-me",
    storageBucket: "note-sphere-me.firebasestorage.app",
    messagingSenderId: "871476488857",
    appId: "1:871476488857:web:2a44c7fcf1d8f5c1eae608",
    measurementId: "G-3814M886QX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const FIRESTORE_DB= getFirestore(app);
export const FIREBASE_STORAGE= getStorage(app);
export const FIREBASE_AI = getAI(app, {
    backend: new GoogleAIBackend()
});