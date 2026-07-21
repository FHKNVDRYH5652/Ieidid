import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { GmailMessage, GmailLabel, GmailFolder, GmailProfile } from './types';
import { initAuth, googleSignIn, googleLogout, setAccessToken } from './lib/firebase';
import {
  getProfile,
  listLabels,
  listMessages,
  batchGetMessages,
  modifyMessageLabels,
  trashMessage,
  sendMessage
} from './lib/gmail';

import AuthScreen from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import MailList from './components/MailList';
import MailDetail from './components/MailDetail';
import ComposeModal from './components/ComposeModal';
import { Loader2, MailWarning, AlertCircle } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  // Auth state verification
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(true);

  // App data states
  const [profile, setProfile] = useState<GmailProfile | null>(null);
  const [labels, setLabels] = useState<GmailLabel[]>([]);
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<GmailMessage | null>(null);

  // Layout and filter states
  const [currentFolder, setCurrentFolder] = useState<GmailFolder>('INBOX');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Loading indicators
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Modals
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyToEmail, setReplyToEmail] = useState<{
    to: string;
    subject: string;
    body: string;
    threadId?: string;
    isForward?: boolean;
  } | null>(null);

  // Pagination
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [pageHistory, setPageHistory] = useState<string[]>([]); // Stores previous page tokens

  // 1. Initial Auth Check on Mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, cachedToken) => {
        setUser(currentUser);
        setToken(cachedToken);
        setNeedsAuth(false);
        setCheckingAuth(false);
      },
      () => {
        setNeedsAuth(true);
        setCheckingAuth(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Fetch User Profile and Labels once logged in with token
  useEffect(() => {
    if (token) {
      loadProfileAndLabels();
    }
  }, [token]);

  // 3. Load email messages when folder, query, or token changes
  useEffect(() => {
    if (token) {
      // Reset selected email when switching folders/labels
      setSelectedEmail(null);
      // Reset page history when filter/folder changes
      setPageHistory([]);
      loadEmailsList(undefined, true);
    }
  }, [token, currentFolder, searchQuery]);

  const loadProfileAndLabels = async () => {
    if (!token) return;
    setLoadingLabels(true);
    setGeneralError(null);
    try {
      const [userProfile, labelList] = await Promise.all([
        getProfile(token),
        listLabels(token)
      ]);
      setProfile(userProfile);
      setLabels(labelList);
    } catch (err: any) {
      console.error('Error loading profile or labels:', err);
      // If unauthorized, token might be expired. Require re-auth.
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        handleLogout();
      } else {
        setGeneralError('Could not sync labels or profile information with Gmail.');
      }
    } finally {
      setLoadingLabels(false);
    }
  };

  const loadEmailsList = async (pageToken?: string, isNewFilter: boolean = false) => {
    if (!token) return;
    setLoadingEmails(true);
    setGeneralError(null);
    try {
      const listData = await listMessages(token, currentFolder, searchQuery, pageToken);
      
      const messageIds = (listData.messages || []).map(m => m.id);
      
      // Batch fetch actual full email details
      const fullMessages = await batchGetMessages(token, messageIds);
      
      setEmails(fullMessages);
      setNextPageToken(listData.nextPageToken);

      if (isNewFilter) {
        setPageHistory([]);
      }
    } catch (err: any) {
      console.error('Error loading emails:', err);
      if (err.message?.includes('401')) {
        handleLogout();
      } else {
        setGeneralError('Failed to load emails from your Gmail account. Please try refreshing.');
      }
    } finally {
      setLoadingEmails(false);
    }
  };

  // Login handler
  const handleLogin = async () => {
    setGeneralError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      throw err;
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await googleLogout();
      setUser(null);
      setToken(null);
      setProfile(null);
      setLabels([]);
      setEmails([]);
      setSelectedEmail(null);
      setNeedsAuth(true);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Optimistic Toggle Star state
  const handleToggleStar = async (id: string, currentlyStarred: boolean) => {
    if (!token) return;
    
    // Optimistic state updates
    const targetAddLabels = currentlyStarred ? [] : ['STARRED'];
    const targetRemoveLabels = currentlyStarred ? ['STARRED'] : [];

    // Update emails list
    setEmails(prev =>
      prev.map(email =>
        email.id === id ? { ...email, isStarred: !currentlyStarred } : email
      )
    );

    // Update active details view
    if (selectedEmail?.id === id) {
      setSelectedEmail(prev => prev ? { ...prev, isStarred: !currentlyStarred } : null);
    }

    try {
      await modifyMessageLabels(token, id, targetAddLabels, targetRemoveLabels);
    } catch (err) {
      console.error('Star modification failed, rolling back:', err);
      // Rollback on failure
      setEmails(prev =>
        prev.map(email =>
          email.id === id ? { ...email, isStarred: currentlyStarred } : email
        )
      );
      if (selectedEmail?.id === id) {
        setSelectedEmail(prev => prev ? { ...prev, isStarred: currentlyStarred } : null);
      }
    }
  };

  // Optimistic Toggle Read/Unread state
  const handleToggleRead = async (id: string, currentlyUnread: boolean) => {
    if (!token) return;

    const targetAddLabels = currentlyUnread ? [] : ['UNREAD'];
    const targetRemoveLabels = currentlyUnread ? ['UNREAD'] : [];

    setEmails(prev =>
      prev.map(email =>
        email.id === id ? { ...email, isUnread: !currentlyUnread } : email
      )
    );

    if (selectedEmail?.id === id) {
      setSelectedEmail(prev => prev ? { ...prev, isUnread: !currentlyUnread } : null);
    }

    try {
      await modifyMessageLabels(token, id, targetAddLabels, targetRemoveLabels);
    } catch (err) {
      console.error('Read modification failed, rolling back:', err);
      setEmails(prev =>
        prev.map(email =>
          email.id === id ? { ...email, isUnread: currentlyUnread } : email
        )
      );
      if (selectedEmail?.id === id) {
        setSelectedEmail(prev => prev ? { ...prev, isUnread: currentlyUnread } : null);
      }
    }
  };

  // Archive (Remove from Inbox)
  const handleArchive = async (id: string) => {
    if (!token) return;
    
    // Remove from the local list optimistically since it leaves Inbox
    setEmails(prev => prev.filter(email => email.id !== id));
    if (selectedEmail?.id === id) {
      setSelectedEmail(null);
    }

    try {
      await modifyMessageLabels(token, id, [], ['INBOX']);
    } catch (err) {
      console.error('Archive failed:', err);
      setGeneralError('Failed to archive the email.');
      // Reload on failure to sync
      loadEmailsList();
    }
  };

  // Trash (Move to trash folder)
  const handleTrash = async (id: string) => {
    if (!token) return;

    // Remove from local list optimistically
    setEmails(prev => prev.filter(email => email.id !== id));
    if (selectedEmail?.id === id) {
      setSelectedEmail(null);
    }

    try {
      await trashMessage(token, id);
    } catch (err) {
      console.error('Trash failed:', err);
      setGeneralError('Failed to move the email to Trash.');
      loadEmailsList();
    }
  };

  // Compose / Reply / Forward Modals
  const handleCompose = () => {
    setReplyToEmail(null);
    setComposeOpen(true);
  };

  const handleReply = (email: GmailMessage) => {
    setReplyToEmail({
      to: email.from,
      subject: email.subject.toLowerCase().startsWith('re:') ? email.subject : `Re: ${email.subject}`,
      body: email.body,
      threadId: email.threadId
    });
    setComposeOpen(true);
  };

  const handleForward = (email: GmailMessage) => {
    setReplyToEmail({
      to: '',
      subject: email.subject.toLowerCase().startsWith('fwd:') ? email.subject : `Fwd: ${email.subject}`,
      body: email.body,
      threadId: email.threadId,
      isForward: true
    });
    setComposeOpen(true);
  };

  const handleSendMail = async (data: { to: string; subject: string; body: string; threadId?: string }) => {
    if (!token) return;
    await sendMessage(token, data);
    // Reload inbox if inside SENT folder or INBOX
    if (currentFolder === 'SENT' || currentFolder === 'INBOX') {
      loadEmailsList();
    }
  };

  // Select an email and mark as Read optimistically if currently unread
  const handleSelectEmail = (email: GmailMessage) => {
    setSelectedEmail(email);
    if (email.isUnread) {
      handleToggleRead(email.id, true);
    }
  };

  // Pagination: Load Older Pages
  const handleLoadMore = () => {
    if (!nextPageToken || loadingEmails) return;
    
    // Save current nextPageToken to history so we can come back
    setPageHistory(prev => [...prev, nextPageToken]);
    loadEmailsList(nextPageToken);
  };

  // Pagination: Load Newer Pages (History-based)
  const handleLoadPrevious = () => {
    if (pageHistory.length === 0 || loadingEmails) return;

    const previousHistory = [...pageHistory];
    previousHistory.pop(); // Remove current page token
    
    // The new target token is the last token left in history (or undefined for page 1)
    const targetToken = previousHistory[previousHistory.length - 1];
    
    setPageHistory(previousHistory);
    loadEmailsList(targetToken);
  };

  // Show a full loader during auth verification
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans gap-3">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Initializing connection...</span>
      </div>
    );
  }

  // Show sign-in screen if required
  if (needsAuth) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  // Determine standard readable mailbox title
  const folderTitle =
    currentFolder === 'INBOX'
      ? 'Inbox'
      : currentFolder === 'STARRED'
      ? 'Starred'
      : currentFolder === 'SENT'
      ? 'Sent Mail'
      : currentFolder === 'DRAFT'
      ? 'Drafts'
      : currentFolder === 'TRASH'
      ? 'Trash'
      : labels.find(l => l.id === currentFolder)?.name || 'Label Mail';

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-800">
      {/* Sidebar Panel (Left) */}
      <Sidebar
        currentFolder={currentFolder}
        onSelectFolder={setCurrentFolder}
        labels={labels}
        loadingLabels={loadingLabels}
        userEmail={profile?.emailAddress || user?.email || ''}
        userName={user?.displayName || 'Workspace User'}
        userPhoto={user?.photoURL || undefined}
        onCompose={handleCompose}
        onLogout={handleLogout}
      />

      {/* Main Mail Dashboard Layout */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Banner General Errors */}
        {generalError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-amber-50 border border-amber-200 shadow-md py-2 px-4 rounded-xl flex gap-2 items-center text-xs text-amber-900 animate-bounce">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{generalError}</span>
            <button
              onClick={() => setGeneralError(null)}
              className="ml-2 font-bold hover:text-amber-950 text-amber-600"
            >
              ×
            </button>
          </div>
        )}

        {/* Mail List Panel (Middle) */}
        <MailList
          emails={emails}
          loading={loadingEmails}
          selectedEmailId={selectedEmail?.id || null}
          onSelectEmail={handleSelectEmail}
          onToggleStar={handleToggleStar}
          onRefresh={() => loadEmailsList()}
          folderName={folderTitle}
          onSearch={setSearchQuery}
          hasMore={!!nextPageToken}
          onLoadMore={handleLoadMore}
          onLoadPrevious={handleLoadPrevious}
          isFirstPage={pageHistory.length === 0}
        />

        {/* Mail Detail Viewer Panel (Right) */}
        <MailDetail
          email={selectedEmail}
          onToggleStar={handleToggleStar}
          onToggleRead={handleToggleRead}
          onArchive={handleArchive}
          onTrash={handleTrash}
          onReply={handleReply}
          onForward={handleForward}
        />
      </main>

      {/* Floating Compose modal */}
      <ComposeModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSend={handleSendMail}
        replyToEmail={replyToEmail}
      />
    </div>
  );
}
