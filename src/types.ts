export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  timestamp: number;
  body: string; // HTML or plain text body
  isUnread: boolean;
  isStarred: boolean;
}

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface GmailLabel {
  id: string;
  name: string;
  type: 'system' | 'user';
  messagesTotal?: number;
  messagesUnread?: number;
}

export type GmailFolder = 'INBOX' | 'STARRED' | 'SENT' | 'DRAFT' | 'TRASH' | 'UNREAD' | string;
