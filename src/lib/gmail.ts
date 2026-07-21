import { GmailMessage, GmailProfile, GmailLabel } from '../types';

// Helper to decode Base64URL
function decodeBase64URL(data: string): string {
  if (!data) return '';
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return decodeURIComponent(escape(atob(base64)));
  } catch (e) {
    try {
      return atob(base64);
    } catch (e2) {
      console.error('Base64 decoding failed:', e2);
      return '[Decoding Error]';
    }
  }
}

// Recursively find and decode the body part (HTML preferred, then plain text)
function getMessageBody(payload: any): string {
  if (!payload) return '';
  
  if (payload.body && payload.body.data) {
    return decodeBase64URL(payload.body.data);
  }

  if (payload.parts) {
    // Look for text/html first
    const htmlPart = findPart(payload.parts, 'text/html');
    if (htmlPart && htmlPart.body && htmlPart.body.data) {
      return decodeBase64URL(htmlPart.body.data);
    }

    // Then look for text/plain
    const plainPart = findPart(payload.parts, 'text/plain');
    if (plainPart && plainPart.body && plainPart.body.data) {
      const decodedPlain = decodeBase64URL(plainPart.body.data);
      return `<div style="white-space: pre-wrap; font-family: sans-serif; line-height: 1.5; color: #1f2937;">${escapeHtml(decodedPlain)}</div>`;
    }

    // Fallback: check nested parts
    for (const part of payload.parts) {
      if (part.parts) {
        const body = getMessageBody(part);
        if (body) return body;
      }
    }
  }

  return '';
}

function findPart(parts: any[], mimeType: string): any {
  for (const part of parts) {
    if (part.mimeType === mimeType) {
      return part;
    }
    if (part.parts) {
      const nestedPart = findPart(part.parts, mimeType);
      if (nestedPart) return nestedPart;
    }
  }
  return null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const getProfile = async (accessToken: string): Promise<GmailProfile> => {
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch profile: ${response.statusText}`);
  }
  return await response.json();
};

export const listLabels = async (accessToken: string): Promise<GmailLabel[]> => {
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to list labels: ${response.statusText}`);
  }
  const data = await response.json();
  return data.labels || [];
};

export interface ListMessagesResponse {
  messages: { id: string; threadId: string }[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export const listMessages = async (
  accessToken: string,
  folder: string,
  searchQuery: string = '',
  pageToken?: string
): Promise<ListMessagesResponse> => {
  let query = searchQuery;
  
  // Apply folder constraints
  if (folder === 'INBOX') {
    query = `label:INBOX ${query}`.trim();
  } else if (folder === 'STARRED') {
    query = `label:STARRED ${query}`.trim();
  } else if (folder === 'SENT') {
    query = `label:SENT ${query}`.trim();
  } else if (folder === 'DRAFT') {
    query = `label:DRAFT ${query}`.trim();
  } else if (folder === 'TRASH') {
    query = `label:TRASH ${query}`.trim();
  } else if (folder === 'UNREAD') {
    query = `label:UNREAD ${query}`.trim();
  } else if (folder) {
    // Custom label ID
    query = `label:${folder} ${query}`.trim();
  }

  const params = new URLSearchParams({
    maxResults: '25',
  });
  if (query) {
    params.append('q', query);
  }
  if (pageToken) {
    params.append('pageToken', pageToken);
  }

  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to list messages: ${response.statusText}`);
  }
  return await response.json();
};

export const getMessageDetails = async (accessToken: string, id: string): Promise<GmailMessage> => {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch message details for ${id}: ${response.statusText}`);
  }
  const data = await response.json();

  const headers = data.payload?.headers || [];
  const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
  const toHeader = headers.find((h: any) => h.name.toLowerCase() === 'to')?.value || 'Me';
  const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
  const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';
  
  const isUnread = data.labelIds?.includes('UNREAD') || false;
  const isStarred = data.labelIds?.includes('STARRED') || false;
  
  const body = getMessageBody(data.payload);

  return {
    id: data.id,
    threadId: data.threadId,
    labelIds: data.labelIds || [],
    snippet: data.snippet || '',
    from: fromHeader,
    to: toHeader,
    subject: subjectHeader,
    date: dateHeader,
    timestamp: parseInt(data.internalDate) || Date.now(),
    body: body,
    isUnread: isUnread,
    isStarred: isStarred,
  };
};

// Fetches multiple messages in parallel, with chunks to prevent rate-limiting or heavy locks
export const batchGetMessages = async (accessToken: string, ids: string[]): Promise<GmailMessage[]> => {
  if (ids.length === 0) return [];
  
  const results: GmailMessage[] = [];
  const chunkSize = 10;
  
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const promises = chunk.map(id => 
      getMessageDetails(accessToken, id).catch(err => {
        console.error(`Error loading email ${id}:`, err);
        return null;
      })
    );
    const resolved = await Promise.all(promises);
    resolved.forEach(msg => {
      if (msg) results.push(msg);
    });
  }
  
  // Sort descending by timestamp
  return results.sort((a, b) => b.timestamp - a.timestamp);
};

export const modifyMessageLabels = async (
  accessToken: string,
  id: string,
  addLabelIds: string[],
  removeLabelIds: string[]
): Promise<any> => {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/modify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      addLabelIds,
      removeLabelIds,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to modify labels for ${id}: ${response.statusText}`);
  }
  return await response.json();
};

export const trashMessage = async (accessToken: string, id: string): Promise<any> => {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/trash`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to trash message ${id}: ${response.statusText}`);
  }
  return await response.json();
};

export const untrashMessage = async (accessToken: string, id: string): Promise<any> => {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/untrash`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to untrash message ${id}: ${response.statusText}`);
  }
  return await response.json();
};

export const deleteMessagePermanently = async (accessToken: string, id: string): Promise<any> => {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to permanently delete message ${id}: ${response.statusText}`);
  }
  return { success: true };
};

export const sendMessage = async (
  accessToken: string,
  { to, subject, body, threadId }: { to: string; subject: string; body: string; threadId?: string }
): Promise<any> => {
  // Simple check for required fields
  if (!to || !subject || !body) {
    throw new Error('Recipient, Subject, and Body are required.');
  }

  // Construct standard MIME structure
  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset="UTF-8"',
    'MIME-Version: 1.0',
  ];

  if (threadId) {
    emailLines.push(`In-Reply-To: ${threadId}`);
    emailLines.push(`References: ${threadId}`);
  }

  // Double newline before body content
  emailLines.push('');
  emailLines.push(body);

  const emailText = emailLines.join('\r\n');
  
  // Safe Base64URL encoder
  const encodedEmail = btoa(unescape(encodeURIComponent(emailText)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const requestBody: any = {
    raw: encodedEmail,
  };
  if (threadId) {
    requestBody.threadId = threadId;
  }

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to send email: ${response.statusText}`);
  }

  return await response.json();
};

export interface ParsedFamAppTransaction {
  amount: string;
  fromPay: string;
  transactionId: string;
  utr: string;
  time: string;
  purpose: string;
}

export function parseFamAppEmail(bodyText: string, snippetText: string): ParsedFamAppTransaction | null {
  // Check if it's actually a FamApp email
  const isFamApp = 
    bodyText.toLowerCase().includes('famapp') || 
    bodyText.toLowerCase().includes('famx') || 
    snippetText.toLowerCase().includes('famapp') ||
    snippetText.toLowerCase().includes('famx') ||
    bodyText.toLowerCase().includes('fmpib');

  if (!isFamApp) return null;

  // Clean HTML elements and normalize whitespace
  const cleanText = bodyText
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8377;/g, '₹') // currency entity
    .replace(/\s+/g, ' ');

  // Extraction logic
  // 1. Amount: Look for ₹ currency and decimals/digits
  let amount = '₹0.0';
  const amountMatch = cleanText.match(/(?:received|saved|of)\s*₹\s*([0-9.,]+)/i) || cleanText.match(/₹\s*([0-9.,]+)/);
  if (amountMatch) {
    amount = '₹' + amountMatch[1];
  } else {
    // try snippet
    const snippetAmount = snippetText.match(/₹\s*([0-9.,]+)/);
    if (snippetAmount) {
      amount = '₹' + snippetAmount[1];
    }
  }

  // 2. From (Payee / Sender):
  let fromPay = 'Unknown Sender';
  const fromMatch = cleanText.match(/from\s+([A-Za-z\s]{3,25})(?=\s*(?:Transaction ID|Date|Updated Balance|UTR|Purpose|If this|$))/i);
  if (fromMatch) {
    fromPay = fromMatch[1].trim();
  }

  // 3. Transaction ID:
  let transactionId = 'N/A';
  const txMatch = cleanText.match(/Transaction\s+ID\s*:\s*([A-Z0-9]+)/i);
  if (txMatch) {
    transactionId = txMatch[1].trim();
  }

  // 4. UTR:
  let utr = 'N/A';
  const utrMatch = cleanText.match(/UTR\s*:\s*(\d+)/i);
  if (utrMatch) {
    utr = utrMatch[1].trim();
  }

  // 5. Time (Date):
  let time = 'N/A';
  const dateMatch = cleanText.match(/Date\s*:\s*([A-Za-z0-9\s,:]+?)(?=\s*(?:Updated Balance|UTR|Purpose|If this|$))/i);
  if (dateMatch) {
    time = dateMatch[1].trim();
  }

  // 6. Purpose:
  let purpose = 'N/A';
  const purposeMatch = cleanText.match(/Purpose\s*:\s*([A-Za-z0-9\s]+?)(?=\s*(?:If this|Updated Balance|UTR|$))/i);
  if (purposeMatch) {
    purpose = purposeMatch[1].trim();
  }

  return {
    amount,
    fromPay,
    transactionId,
    utr,
    time,
    purpose
  };
}
