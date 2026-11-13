// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "shifraai-cbeb3.firebaseapp.com",
  projectId: "shifraai-cbeb3",
  storageBucket: "shifraai-cbeb3.firebasestorage.app",
  messagingSenderId: "1093493522072",
  appId: "1:1093493522072:web:ab00f0b0ac7a2e36415aed"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };