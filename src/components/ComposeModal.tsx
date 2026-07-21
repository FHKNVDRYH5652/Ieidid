import { useState, useEffect, FormEvent } from 'react';
import { X, Send, Minus, Maximize2, Loader2, AlertCircle } from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: { to: string; subject: string; body: string; threadId?: string }) => Promise<void>;
  replyToEmail?: {
    to: string;
    subject: string;
    body: string;
    threadId?: string;
    isForward?: boolean;
  } | null;
}

export default function ComposeModal({ isOpen, onClose, onSend, replyToEmail }: ComposeModalProps) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (replyToEmail) {
      setTo(replyToEmail.to);
      setSubject(replyToEmail.subject);
      
      // Construct beautiful quotes for replies / forwards
      if (replyToEmail.isForward) {
        setBody(
          `<br><br>---------- Forwarded message ---------<br>` +
          `<b>Subject:</b> ${replyToEmail.subject}<br>` +
          `<b>To:</b> ${replyToEmail.to}<br><br>` +
          `${replyToEmail.body}`
        );
      } else {
        setBody(
          `<br><br>On ${new Date().toLocaleString()}, wrote:<br>` +
          `<blockquote style="border-left: 2px solid #cbd5e1; margin-left: 0; padding-left: 12px; color: #64748b;">` +
          `${replyToEmail.body}` +
          `</blockquote>`
        );
      }
    } else {
      setTo('');
      setSubject('');
      setBody('');
    }
    setError(null);
  }, [replyToEmail, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!to.trim()) {
      setError('Please specify at least one recipient.');
      return;
    }
    if (!subject.trim()) {
      setError('Please add a subject.');
      return;
    }
    if (!body.trim()) {
      setError('Please write some content in the body.');
      return;
    }

    setSending(true);
    try {
      await onSend({
        to: to.trim(),
        subject: subject.trim(),
        body: body, // Sends as HTML
        threadId: replyToEmail?.threadId
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to send the email. Please check your network and try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl flex flex-col overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="bg-slate-900 text-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-sm tracking-tight">
            {replyToEmail ? (replyToEmail.isForward ? 'Forward Message' : 'Compose Reply') : 'New Message'}
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {error && (
            <div className="bg-red-50 border-b border-red-100 px-6 py-3 flex gap-2.5 items-center text-xs text-red-800">
              <AlertCircle className="h-4.5 w-4.5 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Fields */}
          <div className="px-6 py-3 space-y-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 w-12 text-right">To:</span>
              <input
                type="text"
                placeholder="recipient@example.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                disabled={sending}
                className="flex-1 text-xs font-medium text-slate-800 bg-transparent border-none py-1 focus:outline-none focus:ring-0 placeholder-slate-300"
                id="compose-to-input"
              />
            </div>
            <hr className="border-slate-100" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 w-12 text-right">Subject:</span>
              <input
                type="text"
                placeholder="Enter subject title"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={sending}
                className="flex-1 text-xs font-bold text-slate-800 bg-transparent border-none py-1 focus:outline-none focus:ring-0 placeholder-slate-300"
                id="compose-subject-input"
              />
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 p-6 overflow-y-auto">
            <textarea
              placeholder="Type your message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={sending}
              className="w-full h-full min-h-[220px] text-xs leading-relaxed text-slate-800 bg-transparent border-none focus:outline-none focus:ring-0 resize-none font-medium placeholder-slate-300"
              id="compose-body-input"
            />
          </div>

          {/* Footer Controls */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
            <span className="text-[10px] text-slate-400 font-mono">
              HTML formatting is supported
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                className="py-2 px-4 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={sending}
                className="py-2 px-5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl shadow-md shadow-blue-600/10 flex items-center gap-2 transition-all cursor-pointer"
                id="send-mail-submit-btn"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Mail</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
