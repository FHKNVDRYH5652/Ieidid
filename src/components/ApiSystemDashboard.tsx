import { useState, useEffect } from 'react';
import { 
  Code, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink, 
  Database, 
  Key, 
  ArrowRight, 
  TrendingDown, 
  TrendingUp, 
  Layers 
} from 'lucide-react';
import { getOrCreateApiKey, getUserTransactions } from '../lib/firebase';

interface ApiSystemDashboardProps {
  userId: string;
  userEmail: string;
  onManualSync: () => Promise<void>;
  syncing: boolean;
}

export default function ApiSystemDashboard({
  userId,
  userEmail,
  onManualSync,
  syncing
}: ApiSystemDashboardProps) {
  const [apiKey, setApiKey] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  // Load or generate API Key
  const loadApiKey = async () => {
    try {
      const key = await getOrCreateApiKey(userId, userEmail);
      setApiKey(key);
    } catch (err) {
      console.error('Error fetching API key:', err);
    }
  };

  // Load synced transactions from Firestore
  const loadTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const txs = await getUserTransactions(userId);
      setTransactions(txs);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadApiKey();
      loadTransactions();
    }
  }, [userId]);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const getApiUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/api/transactions?apiKey=${apiKey}`;
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(getApiUrl());
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSync = async () => {
    setSyncSuccess(null);
    try {
      await onManualSync();
      await loadTransactions();
      setSyncSuccess('Successfully scanned and synced FamApp transactions to Firebase!');
      setTimeout(() => setSyncSuccess(null), 5000);
    } catch (err) {
      console.error('Sync failed:', err);
    }
  };

  // Helper to strip currency formatting for visual styling
  const formatAmount = (amt: string) => {
    return amt || '₹0.0';
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto p-6 md:p-8" id="api-dashboard">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider flex items-center gap-1">
              <Database className="h-3 w-3" /> Live Sync
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Code className="h-6 w-6 text-blue-600" /> FamApp Developer API Panel
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Sync and expose your Gmail FamX payment notifications automatically to an external secure REST API.
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-sm cursor-pointer transition-all shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Syncing Gmail...' : 'Scan & Sync Gmail Now'}</span>
        </button>
      </div>

      {syncSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex gap-2 items-center">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <span className="font-medium">{syncSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Credentials Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between lg:col-span-1">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Key className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">Your secure API Key</h3>
            <p className="text-slate-500 text-xs mb-4">Use this token to query your transaction endpoint from third-party tools.</p>
          </div>

          <div>
            <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl mb-3">
              <span className="font-mono text-xs select-all text-slate-700 flex-1 overflow-x-auto truncate">
                {showKey ? apiKey : 'fam_••••••••••••••••••••'}
              </span>
              <button
                onClick={() => setShowKey(!showKey)}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-800 uppercase px-1.5 py-0.5 rounded hover:bg-slate-200"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>

            <button
              onClick={handleCopyKey}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
            >
              {copiedKey ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy API Key</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* API URL Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between lg:col-span-2">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Code className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-bold font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                GET
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">REST API URL Endpoint</h3>
            <p className="text-slate-500 text-xs mb-4">
              Send an HTTP GET request to this endpoint. It returns a beautifully structured JSON payload of your FamApp transactions in real-time.
            </p>
          </div>

          <div>
            <div className="bg-slate-900 text-slate-200 font-mono text-xs p-3.5 rounded-xl flex items-center gap-3 overflow-x-auto mb-3 whitespace-nowrap">
              <span className="text-emerald-400 font-bold uppercase select-none">GET</span>
              <span className="text-slate-300 flex-1 overflow-x-auto select-all scrollbar-none">{getApiUrl()}</span>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={handleCopyUrl}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/10 transition-all cursor-pointer"
              >
                {copiedUrl ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Copied API Endpoint!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy API URL</span>
                  </>
                )}
              </button>
              <a
                href={getApiUrl()}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">Try API</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* JSON Schema Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-8">
        <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-500" /> API JSON Output Format
        </h3>
        <p className="text-slate-500 text-xs mb-4">
          Below is the clean JSON layout you will receive when calling your custom endpoint:
        </p>
        <pre className="bg-slate-950 text-slate-300 rounded-xl p-4 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
{`{
  "success": true,
  "apiKey": "${apiKey || 'fam_...'}",
  "total": ${transactions.length},
  "transactions": [
    {
      "from": "DASHRATH MAHTO",
      "utr": "310828948695",
      "transactionId": "FMPIB6230170558",
      "time": "12:35 PM IST, 21 July 2026",
      "amount": "₹1.0",
      "purpose": "Sent using Paytm UPI"
    }
  ]
}`}
        </pre>
      </div>

      {/* Live Synced Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col flex-1">
        <div className="p-6 border-b border-slate-150 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Firestore Synced Log</h3>
            <p className="text-slate-500 text-[11px]">Parsed payment alerts stored permanently in Firebase Firestore</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
            {transactions.length} total
          </span>
        </div>

        <div className="flex-1">
          {loadingTransactions ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-6 w-6 text-slate-400 animate-spin" />
              <span className="text-xs text-slate-400">Reading records from Firebase...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 px-6 text-center flex flex-col items-center justify-center gap-3">
              <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-dashed border-slate-200">
                <Database className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="text-slate-800 text-xs font-semibold">No transactions parsed yet</p>
                <p className="text-slate-400 text-[11px] mt-0.5 max-w-sm mx-auto">
                  Click <strong>"Scan & Sync Gmail Now"</strong> above or load your Inbox list to automatically scan your emails and save transactions in Firestore.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-150">
                    <th className="py-3 px-6">Amount</th>
                    <th className="py-3 px-6">From (Payee)</th>
                    <th className="py-3 px-6">Transaction ID</th>
                    <th className="py-3 px-6">UTR No.</th>
                    <th className="py-3 px-6">Time / Date</th>
                    <th className="py-3 px-6">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {transactions.map((tx, idx) => (
                    <tr key={tx.id || idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-emerald-600 font-mono text-sm">
                        {formatAmount(tx.amount)}
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-slate-900">{tx.fromPay}</td>
                      <td className="py-3.5 px-6 font-mono text-slate-500">{tx.transactionId}</td>
                      <td className="py-3.5 px-6 font-mono text-slate-500">{tx.utr}</td>
                      <td className="py-3.5 px-6 text-slate-500">{tx.time}</td>
                      <td className="py-3.5 px-6">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          {tx.purpose}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
