import { useState, useEffect } from 'react';
import { Archive, Star, Trash2, Reply, Forward, Mail, MailOpen, AlertTriangle, ArrowLeft, Send } from 'lucide-react';
import { GmailMessage } from '../types';

interface MailDetailProps {
  email: GmailMessage | null;
  onToggleStar: (id: string, currentlyStarred: boolean) => Promise<void>;
  onToggleRead: (id: string, currentlyUnread: boolean) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onTrash: (id: string) => Promise<void>;
  onReply: (email: GmailMessage) => void;
  onForward: (email: GmailMessage) => void;
}

export default function MailDetail({
  email,
  onToggleStar,
  onToggleRead,
  onArchive,
  onTrash,
  onReply,
  onForward
}: MailDetailProps) {
  const [showTrashConfirm, setShowTrashConfirm] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isTrashing, setIsTrashing] = useState(false);

  // Reset confirmation banner on email change
  useEffect(() => {
    setShowTrashConfirm(false);
  }, [email?.id]);

  if (!email) {
    return (
      <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-8 text-center font-sans">
        <MailOpen className="h-12 w-12 text-slate-300 mb-3" />
        <h3 className="text-sm font-bold text-slate-700">No Email Selected</h3>
        <p className="text-xs text-slate-400 max-w-xs mt-1">
          Select an email from the inbox list to read its content and take actions.
        </p>
      </div>
    );
  }

  const handleArchiveClick = async () => {
    setIsArchiving(true);
    try {
      await onArchive(email.id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleTrashConfirm = async () => {
    setIsTrashing(true);
    try {
      await onTrash(email.id);
      setShowTrashConfirm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTrashing(false);
    }
  };

  const inInbox = email.labelIds.includes('INBOX');

  return (
    <div className="flex-1 bg-white flex flex-col h-full font-sans relative" id="mail-detail">
      {/* Action Toolbar */}
      <div className="h-14 border-b border-slate-100 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          {/* Archive */}
          {inInbox && (
            <button
              onClick={handleArchiveClick}
              disabled={isArchiving}
              className="p-2 hover:bg-slate-50 active:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              title="Archive (Remove from Inbox)"
              id="archive-btn"
            >
              <Archive className="h-4 w-4" />
            </button>
          )}

          {/* Star toggle */}
          <button
            onClick={() => onToggleStar(email.id, email.isStarred)}
            className={`p-2 hover:bg-slate-50 active:bg-slate-100 rounded-lg transition-colors cursor-pointer ${
              email.isStarred ? 'text-amber-500 hover:text-amber-600' : 'text-slate-500 hover:text-slate-800'
            }`}
            title={email.isStarred ? 'Remove Star' : 'Star message'}
            id="star-detail-btn"
          >
            <Star className={`h-4 w-4 ${email.isStarred ? 'fill-current' : ''}`} />
          </button>

          {/* Read / Unread */}
          <button
            onClick={() => onToggleRead(email.id, email.isUnread)}
            className="p-2 hover:bg-slate-50 active:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title={email.isUnread ? 'Mark as Read' : 'Mark as Unread'}
            id="unread-toggle-btn"
          >
            {email.isUnread ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
          </button>

          {/* Trash */}
          <button
            onClick={() => setShowTrashConfirm(true)}
            className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-500 transition-colors cursor-pointer"
            title="Move to Trash"
            id="trash-btn"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Reply & Forward */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onReply(email)}
            className="py-1.5 px-3 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            id="reply-btn"
          >
            <Reply className="h-3.5 w-3.5" />
            <span>Reply</span>
          </button>
          <button
            onClick={() => onForward(email)}
            className="py-1.5 px-3 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            id="forward-btn"
          >
            <Forward className="h-3.5 w-3.5" />
            <span>Forward</span>
          </button>
        </div>
      </div>

      {/* Mandatory Security Confirmation Dialog for Trash / Delete Operations */}
      {showTrashConfirm && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex gap-2.5 items-start">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-900">Move this email to Trash?</h4>
              <p className="text-[11px] text-amber-700 mt-0.5">
                The message will be removed from your mailbox and kept in Trash. Trashing emails requires your explicit consent.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end">
            <button
              onClick={() => setShowTrashConfirm(false)}
              className="py-1.5 px-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs border border-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleTrashConfirm}
              disabled={isTrashing}
              className="py-1.5 px-3 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
              id="confirm-trash-btn"
            >
              {isTrashing ? 'Trashing...' : 'Confirm Trash'}
            </button>
          </div>
        </div>
      )}

      {/* Email Subject / Metadata */}
      <div className="px-6 py-5 border-b border-slate-100 shrink-0">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
          {email.subject}
        </h2>
        
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
              {email.from ? email.from.substring(0, 2).toUpperCase() : 'M'}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">
                {email.from}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                to {email.to}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-400 font-medium">
              {email.date}
            </span>
          </div>
        </div>
      </div>

      {/* Email Body HTML Iframe Wrapper (isolates CSS from main app) */}
      <div className="flex-1 bg-slate-50/50 p-4">
        <div className="w-full h-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <iframe
            srcDoc={`
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { 
                      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
                      font-size: 13.5px;
                      line-height: 1.6;
                      color: #334155;
                      margin: 24px;
                      word-wrap: break-word;
                      word-break: break-word;
                      overflow-x: hidden;
                    }
                    img { max-width: 100%; height: auto; }
                    a { color: #2563eb; text-decoration: underline; }
                    blockquote {
                      border-left: 2px solid #cbd5e1;
                      margin-left: 0;
                      padding-left: 12px;
                      color: #64748b;
                    }
                    table {
                      border-collapse: collapse;
                      width: 100%;
                    }
                    th, td {
                      border: 1px solid #e2e8f0;
                      padding: 8px;
                      text-align: left;
                    }
                  </style>
                </head>
                <body>
                  ${email.body || email.snippet}
                </body>
              </html>
            `}
            className="w-full h-full border-none flex-1"
            title="Gmail content viewer"
            id="email-body-iframe"
          />
        </div>
      </div>
    </div>
  );
}
