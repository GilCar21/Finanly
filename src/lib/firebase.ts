import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy, getDoc, setDoc } from "firebase/firestore";

// Default placeholder config
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "finace-family.firebaseapp.com",
  projectId: "finace-family",
  storageBucket: "finace-family.firebasestorage.app",
  messagingSenderId: "657823001558",
  appId: "1:657823001558:web:435c6e6fad65a81c295277",
  measurementId: "G-VTD61RM2X3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("👤 [Auth] Usuário logado:", user.email);
  } else {
    console.log("👋 [Auth] Nenhum usuário logado.");
  }
});

export const signIn = () => signInWithPopup(auth, googleProvider).catch((error) => {
  console.error("❌ [Auth] Erro ao logar:", error.message);
});
export const logOut = () => signOut(auth).catch((error) => {
  console.error("❌ [Auth] Erro ao deslogar:", error.message);
});

// ─── Account types ────────────────────────────────────────────────────────────

export type AccountType = "checking" | "credit" | "cash" | "savings";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: "Conta Corrente",
  credit: "Cartão de Crédito",
  cash: "Dinheiro",
  savings: "Poupança",
};

export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  checking: "🏦",
  credit: "💳",
  cash: "💵",
  savings: "🐷",
};

export interface Account {
  id?: string;
  name: string;          // e.g. "Nubank Gilberto", "Itaú Esposa"
  type: AccountType;
  ownerName: string;     // free text: "Gilberto" | "Esposa" | "Compartilhado"
  color: string;         // hex color for UI
  initialBalance: number;
  userId: string;
  sharedWith: string[];
}

// ─── Transaction ──────────────────────────────────────────────────────────────

export interface Transaction {
  id?: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  paymentMethod: string;
  status: 'paid' | 'pending';
  installments?: string;
  userId: string;
  sharedWith: string[];
  // Multi-account fields (optional for backward compatibility)
  accountId?: string;
  transferId?: string; // links the two transactions of a transfer
}

// ─── Category / Budget / UserProfile ─────────────────────────────────────────

export interface Category {
  name: string;
  color: string;
  icon?: string;
}

export interface Budget {
  category: string;
  limit: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  sharedWith: string[];
  customCategories?: Category[];
  budgets?: Budget[];
}
