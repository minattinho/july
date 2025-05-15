// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD9vOKaBKOkoQWz442JjMHik4yVvoYr1OA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "financeiro-refeather.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "financeiro-refeather",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "financeiro-refeather.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "794612874149",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:794612874149:web:c253798eeb76bbd0c4c",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-DLQ9F0RDGB"
};

// Log config for debugging (will hide the API key)
console.log("Firebase config sendo usado:", 
  JSON.stringify({...firebaseConfig, apiKey: firebaseConfig.apiKey ? "***" : "não definido"})
);

// Verificando se as variáveis de ambiente estão definidas
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("Erro: Variáveis de ambiente do Firebase não estão configuradas corretamente!");
}

// Initialize Firebase
let app, auth, db;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("Firebase inicializado com sucesso!");
} catch (error) {
  console.error("Erro ao inicializar Firebase:", error);
}

// Export the services
export { auth, db };
export default app;