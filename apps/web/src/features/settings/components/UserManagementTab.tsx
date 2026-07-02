import { useState } from 'react';
import { useOrganization } from '../hooks/useOrganization';
import { Trash2, UserPlus, Loader2 } from 'lucide-react';
import type { UserRole } from '../types';

export function UserManagementTab() {
  const { users, isLoadingUsers, inviteUser, removeUser } = useOrganization();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('VIEWER');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    await inviteUser.mutateAsync({ email, role });
    setIsInviteOpen(false);
    setEmail('');
  };

  return (
    <div className="p-8 h-full flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-white">Team Members</h2>
          <p className="text-sm text-slate-400">Manage who has access to this workspace.</p>
        </div>
        <button 
          onClick={() => setIsInviteOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-lg shadow-blue-500/20 flex items-center gap-2"
        >
          <UserPlus size={16} /> Invite User
        </button>
      </div>

      {isInviteOpen && (
        <div className="mb-6 p-4 bg-slate-900/50 border border-slate-800 rounded-xl shrink-0">
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-400 mb-1">Email Address</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none" placeholder="colleague@company.com" />
            </div>
            <div className="w-full sm:w-48">
              <label className="block text-xs font-medium text-slate-400 mb-1">Role</label>
              <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 appearance-none outline-none">
                <option value="ADMIN">Admin</option>
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2 sm:pt-0 justify-end">
              <button type="button" onClick={() => setIsInviteOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button type="submit" disabled={inviteUser.isPending} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm disabled:opacity-50 flex items-center gap-2">
                {inviteUser.isPending && <Loader2 size={14} className="animate-spin" />} Send Invite
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
        {isLoadingUsers ? (
          <div className="text-slate-500">Loading users...</div>
        ) : (
          <div className="space-y-3">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-800 transition-colors hover:border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center font-bold shrink-0">
                    {user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : user.email[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{user.name || 'Pending User'}</p>
                    <p className="text-sm text-slate-400 truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-full border border-slate-700 font-medium">{user.role}</span>
                  <button 
                    onClick={() => removeUser.mutate(user.id)}
                    disabled={removeUser.isPending}
                    className="text-slate-500 hover:text-rose-400 transition-colors p-2"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {users.length === 0 && <div className="text-slate-500 text-sm p-4 text-center border border-dashed border-slate-800 rounded-xl">No users found.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
