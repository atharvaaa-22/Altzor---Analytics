import type React from 'react';
import { useState } from 'react';
import { useOrganization } from '../hooks/useOrganization';
import { Trash2, UserPlus, Loader2 } from 'lucide-react';
import type { UserRole } from '../types';
import { Button } from '../../../components/ui/Button';
import { Input, Select } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';

const roleVariant = (role: string): 'info' | 'purple' | 'neutral' => {
  if (role === 'ADMIN') return 'purple';
  if (role === 'EDITOR') return 'info';
  return 'neutral';
};

export function UserManagementTab(): React.JSX.Element {
  const { users, isLoadingUsers, inviteUser, removeUser } = useOrganization();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('VIEWER');

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    await inviteUser.mutateAsync({ email, role });
    setIsInviteOpen(false);
    setEmail('');
  };

  return (
    <div className="p-6 h-full flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-5 shrink-0">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Team Members</h2>
          <p className="text-sm text-slate-500">Manage who has access to this workspace.</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<UserPlus size={14} />}
          onClick={() => setIsInviteOpen(true)}
        >
          Invite User
        </Button>
      </div>

      {isInviteOpen && (
        <div className="mb-5 p-4 bg-slate-50 border border-slate-200 rounded-xl shrink-0">
          <form
            onSubmit={(e) => {
              void handleInvite(e);
            }}
            className="flex flex-col sm:flex-row sm:items-end gap-4"
          >
            <Input
              label="Email address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              wrapperClassName="flex-1"
            />
            <Select
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              wrapperClassName="w-full sm:w-40"
            >
              <option value="ADMIN">Admin</option>
              <option value="EDITOR">Editor</option>
              <option value="VIEWER">Viewer</option>
            </Select>
            <div className="flex gap-2 pt-1 sm:pt-0 justify-end">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setIsInviteOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" loading={inviteUser.isPending}>
                Send Invite
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2">
        {isLoadingUsers ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-sm text-slate-400 p-6 text-center border border-dashed border-slate-200 rounded-xl">
            No team members found.
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold flex items-center justify-center shrink-0">
                  {user.name
                    ? user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase()
                    : user.email[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {user.name || 'Pending User'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant={roleVariant(user.role)}>{user.role}</Badge>
                <button
                  onClick={() => removeUser.mutate(user.id)}
                  disabled={removeUser.isPending}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                  title="Remove user"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
