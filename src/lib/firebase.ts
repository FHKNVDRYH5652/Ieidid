import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request the required scopes that the user accepted
provider.addScope('https://www.googleapis.com/auth/gmail.modify');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

// We can prompt the user to select their account
provider.setCustomParameters({
  prompt: 'select_account'
});

// Cache the access token in memory and local storage
const LOCAL_STORAGE_KEY = 'gmail_dashboard_google_token';
let cachedAccessToken: string | null = null;
try {
  cachedAccessToken = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_KEY) : null;
} catch (e) {
  console.error('Error reading localStorage', e);
}
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken) {
        try {
          cachedAccessToken = localStorage.getItem(LOCAL_STORAGE_KEY);
        } catch (e) {
          console.error('Error reading localStorage', e);
        }
      }
      
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If logged into Firebase but we don't have the cached access token, we will need the user to click sign-in
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch (e) {
        console.error('Error writing localStorage', e);
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, cachedAccessToken);
    } catch (e) {
      console.error('Error writing localStorage', e);
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  if (!cachedAccessToken) {
    try {
      cachedAccessToken = localStorage.getItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      console.error('Error reading localStorage', e);
    }
  }
  return cachedAccessToken;
};

export const setAccessToken = (token: string) => {
  cachedAccessToken = token;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, token);
  } catch (e) {
    console.error('Error writing localStorage', e);
  }
};

export const googleLogout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (e) {
    console.error('Error writing localStorage', e);
  }
};

import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';

export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');

// Get or generate API Key for a user
export const getOrCreateApiKey = async (userId: string, email: string): Promise<string> => {
  const userDocRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userDocRef);
  
  if (userSnap.exists()) {
    const data = userSnap.data();
    if (data.apiKey) {
      return data.apiKey;
    }
  }
  
  // Generate a new api key
  const rand1 = Math.random().toString(36).substring(2, 10);
  const rand2 = Math.random().toString(36).substring(2, 10);
  const apiKey = `fam_${rand1}${rand2}`;
  
  // Save to users collection
  await setDoc(userDocRef, {
    userId,
    email,
    apiKey,
    createdAt: Date.now()
  }, { merge: true });
  
  // Save to api_keys reverse lookup collection
  const apiKeyDocRef = doc(db, 'api_keys', apiKey);
  await setDoc(apiKeyDocRef, {
    userId,
    email,
    apiKey,
    createdAt: Date.now()
  });
  
  return apiKey;
};

// Save a parsed transaction to Firestore
export const saveTransaction = async (userId: string, tx: {
  amount: string;
  fromPay: string;
  transactionId: string;
  utr: string;
  time: string;
  purpose: string;
}) => {
  // Use transactionId or emailId as doc ID to avoid duplicates
  const docId = tx.transactionId && tx.transactionId !== 'N/A' 
    ? tx.transactionId 
    : `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
  const txDocRef = doc(db, 'transactions', docId);
  await setDoc(txDocRef, {
    id: docId,
    userId,
    amount: tx.amount,
    fromPay: tx.fromPay,
    transactionId: tx.transactionId,
    utr: tx.utr,
    time: tx.time,
    purpose: tx.purpose,
    createdAt: Date.now()
  }, { merge: true });
};

// Get user's transactions
export const getUserTransactions = async (userId: string) => {
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const querySnapshot = await getDocs(q);
  const transactions: any[] = [];
  querySnapshot.forEach((doc) => {
    transactions.push(doc.data());
  });
  return transactions;
};
