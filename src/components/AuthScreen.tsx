import { useState } from 'react';
import { Mail, ShieldCheck, MailWarning, Loader2 } from 'lucide-react';

interface AuthScreenProps {
  onLogin: () => Promise<void>;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoginClick = async () => {
    setLoading(true);
    setError(null);
    try {
      await onLogin();
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('popup-closed-by-user') || err.code?.includes('popup-closed-by-user')) {
        setError(
          'Sign-in popup was closed or blocked. Because the app runs in an iframe sandbox, please make sure popups are allowed, or click the "Open in new tab" (↗) button at the top right of the screen to sign in smoothly!'
        );
      } else {
        setError(err.message || 'Google Sign-In failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Mail className="h-8 w-8 text-white" />
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-slate-900 tracking-tight">
          Gmail Dashboard
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Manage, compose, and organize your emails inside a swift workspace.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl sm:rounded-2xl border border-slate-100 flex flex-col gap-6">
          
          {/* Security & Access Info */}
          <div className="rounded-xl bg-blue-50/50 p-4 border border-blue-100 flex gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <span className="font-semibold block mb-1">Secure & Direct Access</span>
              This tool utilizes official Google Workspace APIs with direct login. Your email access tokens are held exclusively in-memory, ensuring your data is never stored, tracked, or sent to secondary servers.
            </div>
          </div>

          <div className="text-xs text-slate-500 leading-relaxed flex flex-col gap-2">
            <span className="font-medium text-slate-700">What permissions will be granted?</span>
            <ul className="list-disc pl-4 space-y-1">
              <li>Read email messages, threads, and metadata.</li>
              <li>Compose, reply to, send, and draft emails.</li>
              <li>Modify mail status (mark read, star, archive, send to trash).</li>
            </ul>
          </div>

          {error && (
            <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 flex gap-3 text-xs text-amber-900">
              <MailWarning className="h-5 w-5 text-amber-600 shrink-0" />
              <div>{error}</div>
            </div>
          )}

          {/* Official Sign in with Google Button */}
          <button
            onClick={handleLoginClick}
            disabled={loading}
            className={`gsi-material-button w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-slate-700 font-medium text-sm select-none ${
              loading ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'
            }`}
            id="google-signin-btn"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            ) : (
              <div className="gsi-material-button-icon shrink-0">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5 block">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
            )}
            <span>{loading ? 'Connecting accounts...' : 'Sign in with Google'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
