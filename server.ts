import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Initialize Firebase for server-side API routing
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  orderBy, 
  limit 
} from 'firebase/firestore';

// Load Firebase configuration
import firebaseConfig from './firebase-applet-config.json';

const app = express();
const PORT = 3000;

// Initialize Firebase with the same config and custom databaseId
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || '(default)');

app.use(express.json());

// Enable CORS for API requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// GET /api/transactions?apiKey=fam_...
app.get('/api/transactions', async (req, res) => {
  try {
    const { apiKey } = req.query;
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ error: 'apiKey query parameter is required' });
    }

    // Lookup user associated with this apiKey
    const apiKeyDocRef = doc(db, 'api_keys', apiKey);
    const apiKeySnap = await getDoc(apiKeyDocRef);

    if (!apiKeySnap.exists()) {
      return res.status(401).json({ error: 'Invalid or unauthorized apiKey' });
    }

    const { userId } = apiKeySnap.data();

    // Fetch transactions synced for this user
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const querySnapshot = await getDocs(q);
    const transactions: any[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      transactions.push({
        from: data.fromPay || 'Unknown',
        utr: data.utr || 'N/A',
        transactionId: data.transactionId || 'N/A',
        time: data.time || 'N/A',
        amount: data.amount || '₹0.0',
        purpose: data.purpose || 'N/A'
      });
    });

    return res.json({
      success: true,
      apiKey,
      total: transactions.length,
      transactions
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
