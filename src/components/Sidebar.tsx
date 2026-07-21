import { Inbox, Star, Send, FileText, Trash2, LogOut, PenSquare, Tag, User as UserIcon, Loader2, Code } from 'lucide-react';
import { GmailLabel, GmailFolder } from '../types';

interface SidebarProps {
  currentFolder: GmailFolder;
  onSelectFolder: (folder: GmailFolder) => void;
  labels: GmailLabel[];
  loadingLabels: boolean;
  userEmail: string;
  userName: string;
  userPhoto?: string;
  onCompose: () => void;
  onLogout: () => void;
}

export default function Sidebar({
  currentFolder,
  onSelectFolder,
  labels,
  loadingLabels,
  userEmail,
  userName,
  userPhoto,
  onCompose,
  onLogout
}: SidebarProps) {
  // Define main folders
  const mainFolders = [
    { id: 'INBOX', name: 'Inbox', icon: Inbox },
    { id: 'STARRED', name: 'Starred', icon: Star },
    { id: 'SENT', name: 'Sent', icon: Send },
    { id: 'DRAFT', name: 'Drafts', icon: FileText },
    { id: 'TRASH', name: 'Trash', icon: Trash2 },
  ];

  // Filter out system labels to show only user-defined labels
  const userLabels = labels.filter(label => label.type === 'user');

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 font-sans" id="sidebar">
      {/* Title / Brand */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center">
          <Inbox className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-white text-lg tracking-tight">Gmail Client</h1>
          <p className="text-[10px] text-slate-500 font-mono">Workspace Sync</p>
        </div>
      </div>

      {/* Compose Button */}
      <div className="p-4">
        <button
          onClick={onCompose}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/10 flex items-center justify-center gap-2 transition-all"
          id="compose-btn"
        >
          <PenSquare className="h-5 w-5" />
          <span>Compose Mail</span>
        </button>
      </div>

      {/* Main Folders Section */}
      <div className="flex-1 overflow-y-auto px-3 space-y-6 py-2">
        <div>
          <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Mailboxes</span>
          <nav className="space-y-1">
            {mainFolders.map(folder => {
              const Icon = folder.icon;
              const isActive = currentFolder === folder.id;
              return (
                <button
                  key={folder.id}
                  onClick={() => onSelectFolder(folder.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  id={`folder-${folder.id.toLowerCase()}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{folder.name}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Developer API Section */}
        <div>
          <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Integrations</span>
          <nav className="space-y-1">
            <button
              onClick={() => onSelectFolder('API_SYSTEM')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                currentFolder === 'API_SYSTEM'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              id="folder-api-system"
            >
              <div className="flex items-center gap-3">
                <Code className={`h-4 w-4 ${currentFolder === 'API_SYSTEM' ? 'text-white' : 'text-slate-500'}`} />
                <span>FamApp Developer API</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Labels Section */}
        <div>
          <div className="px-3 flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Custom Labels</span>
            {loadingLabels && <Loader2 className="h-3 w-3 text-slate-500 animate-spin" />}
          </div>
          <nav className="space-y-1 max-h-48 overflow-y-auto">
            {userLabels.length === 0 ? (
              <span className="px-3 text-xs text-slate-600 italic block py-1">No custom labels</span>
            ) : (
              userLabels.map(label => {
                const isActive = currentFolder === label.id;
                return (
                  <button
                    key={label.id}
                    onClick={() => onSelectFolder(label.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left truncate ${
                      isActive
                        ? 'bg-slate-800 text-white border-l-2 border-blue-500'
                        : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
                    }`}
                    id={`label-${label.id}`}
                  >
                    <Tag className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{label.name}</span>
                  </button>
                );
              })
            )}
          </nav>
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3 mb-3">
          {userPhoto ? (
            <img
              src={userPhoto}
              alt={userName}
              referrerPolicy="no-referrer"
              className="h-9 w-9 rounded-xl object-cover ring-2 ring-slate-800"
            />
          ) : (
            <div className="h-9 w-9 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center font-bold">
              <UserIcon className="h-4 w-4" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white truncate">{userName}</h4>
            <p className="text-[10px] text-slate-500 truncate">{userEmail}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 hover:bg-red-950/30 text-red-400 hover:text-red-300 text-xs font-semibold rounded-xl border border-dashed border-slate-800 hover:border-red-900/50 transition-all cursor-pointer"
          id="logout-btn"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
