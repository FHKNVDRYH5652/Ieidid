import { useState, useEffect, FormEvent } from 'react';
import { Search, RotateCw, ChevronLeft, ChevronRight, Star, AlertCircle, Inbox, MailOpen, Mail } from 'lucide-react';
import { GmailMessage } from '../types';

interface MailListProps {
  emails: GmailMessage[];
  loading: boolean;
  selectedEmailId: string | null;
  onSelectEmail: (email: GmailMessage) => void;
  onToggleStar: (id: string, currentlyStarred: boolean) => Promise<void>;
  onRefresh: () => void;
  folderName: string;
  onSearch: (query: string) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  onLoadPrevious: () => void;
  isFirstPage: boolean;
}

export default function MailList({
  emails,
  loading,
  selectedEmailId,
  onSelectEmail,
  onToggleStar,
  onRefresh,
  folderName,
  onSearch,
  hasMore,
  onLoadMore,
  onLoadPrevious,
  isFirstPage,
}: MailListProps) {
  const [searchVal, setSearchVal] = useState('');

  // Helper to extract clean sender name from Gmail's "From" header
  const getSenderName = (fromStr: string) => {
    const match = fromStr.match(/^"?(.*?)"?\s*<.*?>$/);
    if (match && match[1]) {
      return match[1];
    }
    return fromStr.split('<')[0].trim() || fromStr;
  };

  // Helper to format Date elegantly
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      
      // If same day, show time
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      // If same year, show month day
      if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
      
      // Otherwise show full date
      return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(searchVal);
  };

  return (
    <div className="w-1/3 min-w-[360px] max-w-[480px] bg-white border-r border-slate-200 flex flex-col h-full font-sans" id="mail-list">
      {/* Search Header */}
      <div className="p-4 border-b border-slate-100 flex flex-col gap-3 shrink-0">
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            placeholder="Search all emails..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 placeholder-slate-400 font-medium transition-all"
            id="mail-search-input"
          />
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        </form>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {folderName}
            </span>
            <span className="bg-slate-100 text-slate-600 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
              {emails.length} Loaded
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              title="Refresh inbox"
              id="refresh-emails-btn"
            >
              <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            {/* Pagination Controls */}
            <div className="flex items-center border-l border-slate-100 pl-1 gap-0.5">
              <button
                onClick={onLoadPrevious}
                disabled={isFirstPage || loading}
                className={`p-2 rounded-lg text-slate-500 hover:text-slate-800 transition-colors ${
                  isFirstPage || loading ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100 cursor-pointer'
                }`}
                title="Newer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onLoadMore}
                disabled={!hasMore || loading}
                className={`p-2 rounded-lg text-slate-500 hover:text-slate-800 transition-colors ${
                  !hasMore || loading ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100 cursor-pointer'
                }`}
                title="Older"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {loading && emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
            <RotateCw className="h-6 w-6 animate-spin text-blue-500" />
            <p className="text-xs font-medium">Syncing Gmail data...</p>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 p-6 text-center text-slate-400">
            <Inbox className="h-8 w-8 text-slate-300" />
            <div>
              <p className="text-xs font-bold text-slate-700">No emails found</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Try searching or checking another folder. Emails in Trash might not show in Inbox.
              </p>
            </div>
          </div>
        ) : (
          emails.map((email) => {
            const isSelected = selectedEmailId === email.id;
            return (
              <div
                key={email.id}
                onClick={() => onSelectEmail(email)}
                className={`flex gap-3 p-4 text-left transition-all relative border-l-4 cursor-pointer hover:bg-slate-50 ${
                  isSelected
                    ? 'bg-blue-50/50 border-blue-500'
                    : email.isUnread
                    ? 'bg-slate-50/20 border-slate-300'
                    : 'border-transparent'
                }`}
                id={`email-item-${email.id}`}
              >
                {/* Read/Unread Indicator Dot */}
                {email.isUnread && (
                  <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                )}

                {/* Star checkbox */}
                <div className="flex flex-col items-center gap-1 mt-0.5 shrink-0">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await onToggleStar(email.id, email.isStarred);
                    }}
                    className={`p-1 rounded-lg transition-colors hover:bg-slate-100 ${
                      email.isStarred ? 'text-amber-500' : 'text-slate-300 hover:text-slate-400'
                    }`}
                  >
                    <Star className="h-3.5 w-3.5 fill-current" />
                  </button>
                  {email.isUnread ? (
                    <Mail className="h-3.5 w-3.5 text-blue-500/70" />
                  ) : (
                    <MailOpen className="h-3.5 w-3.5 text-slate-300" />
                  )}
                </div>

                {/* Email Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-xs truncate ${
                        email.isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-600'
                      }`}
                    >
                      {getSenderName(email.from)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0">
                      {formatDate(email.date)}
                    </span>
                  </div>

                  <h4
                    className={`text-xs truncate mb-0.5 ${
                      email.isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                    }`}
                  >
                    {email.subject}
                  </h4>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-normal">
                    {email.snippet}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
