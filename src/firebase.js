import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC9DX8wVGVQa2FsIjMgfCh5Zu-s_2P0ly0",
  authDomain: "class-projection.firebaseapp.com",
  projectId: "class-projection",
  storageBucket: "class-projection.firebasestorage.app",
  messagingSenderId: "1046874453510",
  appId: "1:1046874453510:web:37458a4c84395d5ef1b587"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Set persistence to session-only to allow side-by-side tab testing of different roles
setPersistence(auth, browserSessionPersistence).catch((err) => {
  console.error("Failed to set auth persistence:", err);
});

export { db, auth, app };
