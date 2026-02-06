import { useState } from 'react';
import { Users, Plus, Trash2, Edit2, Shield, Eye, EyeOff, Smartphone } from 'lucide-react';
import { authService, type User } from '../services/authService';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>(authService.getAllUsers());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const currentUser = authService.getCurrentUser();

  const refreshUsers = () => {
    setUsers(authService.getAllUsers());
  };

  const handleAddUser = (newUser: { phoneNumber: string; name: string; role: User['role'] }) => {
    try {
      authService.addUser(newUser.phoneNumber, newUser.name, newUser.role);
      refreshUsers();
      setShowAddModal(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to add user');
    }
  };

  const handleUpdateUser = (userId: string, updates: Partial<User>) => {
    try {
      authService.updateUser(userId, updates);
      refreshUsers();
      setEditingUser(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update user');
    }
  };

  const handleRemoveUser = (userId: string) => {
    if (!confirm('Are you sure you want to remove this user? This action cannot be undone.')) {
      return;
    }

    try {
      authService.removeUser(userId);
      refreshUsers();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to remove user');
    }
  };

  const handleToggleActive = (user: User) => {
    try {
      if (user.active) {
        authService.deactivateUser(user.id);
      } else {
        authService.reactivateUser(user.id);
      }
      refreshUsers();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to toggle user status');
    }
  };

  const getRoleBadgeColor = (role: User['role']) => {
    switch (role) {
      case 'admin': return 'bg-red-900/30 text-red-300 border-red-700';
      case 'user': return 'bg-blue-900/30 text-blue-300 border-blue-700';
      case 'readonly': return 'bg-gray-900/30 text-gray-300 border-gray-700';
    }
  };

  const getRoleIcon = (role: User['role']) => {
    switch (role) {
      case 'admin': return '👑';
      case 'user': return '👤';
      case 'readonly': return '👁️';
    }
  };

  const canManageUsers = authService.hasPermission('addUsers');

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">User Management</h2>
          <p className="text-sm md:text-base text-gray-400">
            Manage mobile numbers authorized to access this system
          </p>
        </div>
        {canManageUsers && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-3 md:py-2 rounded-lg font-medium transition-colors text-sm md:text-base touch-manipulation whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        )}
      </div>

      {/* Current User Badge */}
      <div className="bg-primary-900/30 border border-primary-700 rounded-lg p-4">
        <p className="text-xs md:text-sm text-primary-300 mb-2">Currently logged in as:</p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
              {currentUser?.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm md:text-base text-white font-medium truncate">{currentUser?.name}</p>
              <p className="text-xs md:text-sm text-gray-400 truncate">{authService.formatPhoneNumber(currentUser?.phoneNumber || '')}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getRoleBadgeColor(currentUser?.role || 'readonly')}`}>
            {getRoleIcon(currentUser?.role || 'readonly')} {currentUser?.role.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-base md:text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-400" />
            Authorized Users ({users.length})
          </h3>
        </div>

        <div className="divide-y divide-slate-700">
          {users.map((user) => (
            <div key={user.id} className={`p-4 ${!user.active ? 'opacity-50' : ''}`}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${
                  user.active ? 'bg-gradient-to-br from-primary-600 to-primary-700' : 'bg-gray-600'
                }`}>
                  {user.name.charAt(0).toUpperCase()}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h4 className="text-sm md:text-base text-white font-medium">{user.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                      {getRoleIcon(user.role)} {user.role.toUpperCase()}
                    </span>
                    {!user.active && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium border bg-gray-900/30 text-gray-400 border-gray-700">
                        INACTIVE
                      </span>
                    )}
                    {user.id === currentUser?.id && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium border bg-green-900/30 text-green-300 border-green-700">
                        YOU
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs md:text-sm text-gray-400 mb-2">
                    <Smartphone className="w-4 h-4 flex-shrink-0" />
                    <span className="break-all">{authService.formatPhoneNumber(user.phoneNumber)}</span>
                  </div>

                  {/* Permissions */}
                  <div className="flex flex-wrap gap-1 md:gap-2">
                    {user.permissions.viewDashboard && (
                      <span className="px-2 py-1 bg-slate-700 text-xs text-gray-300 rounded">
                        📊 Dashboard
                      </span>
                    )}
                    {user.permissions.viewSettings && (
                      <span className="px-2 py-1 bg-slate-700 text-xs text-gray-300 rounded">
                        ⚙️ Settings
                      </span>
                    )}
                    {user.permissions.editCompanies && (
                      <span className="px-2 py-1 bg-slate-700 text-xs text-gray-300 rounded">
                        🏢 Edit Companies
                      </span>
                    )}
                    {user.permissions.editIntegrations && (
                      <span className="px-2 py-1 bg-slate-700 text-xs text-gray-300 rounded">
                        🔌 Edit Integrations
                      </span>
                    )}
                    {user.permissions.editAlerts && (
                      <span className="px-2 py-1 bg-slate-700 text-xs text-gray-300 rounded">
                        🔔 Edit Alerts
                      </span>
                    )}
                    {user.permissions.addUsers && (
                      <span className="px-2 py-1 bg-slate-700 text-xs text-gray-300 rounded">
                        👥 Manage Users
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mt-2">
                    Added: {user.createdAt.toLocaleDateString()}
                    {user.lastLogin && ` • Last login: ${user.lastLogin.toLocaleString()}`}
                  </p>
                </div>

                {/* Actions */}
                {canManageUsers && user.id !== currentUser?.id && (
                  <div className="flex gap-2 mt-3 sm:mt-0 sm:flex-shrink-0">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="flex-1 sm:flex-none p-2 md:p-2.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded transition-colors touch-manipulation"
                      title="Edit user"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(user)}
                      className="flex-1 sm:flex-none p-2 md:p-2.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded transition-colors touch-manipulation"
                      title={user.active ? 'Deactivate user' : 'Reactivate user'}
                    >
                      {user.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleRemoveUser(user.id)}
                      className="flex-1 sm:flex-none p-2 md:p-2.5 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded transition-colors touch-manipulation"
                      title="Remove user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No users configured yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Role Descriptions */}
      <div className="bg-slate-800 rounded-lg p-4 md:p-6 border border-slate-700">
        <h3 className="text-base md:text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary-400" />
          Role Permissions
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-xl md:text-2xl flex-shrink-0">👑</span>
            <div className="min-w-0">
              <p className="text-sm md:text-base text-white font-medium">Admin</p>
              <p className="text-xs md:text-sm text-gray-400">Full access - Can manage everything including users</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl md:text-2xl flex-shrink-0">👤</span>
            <div className="min-w-0">
              <p className="text-sm md:text-base text-white font-medium">User</p>
              <p className="text-xs md:text-sm text-gray-400">Can view dashboard/settings and edit alerts, but cannot change companies or integrations</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl md:text-2xl flex-shrink-0">👁️</span>
            <div className="min-w-0">
              <p className="text-sm md:text-base text-white font-medium">Read-Only</p>
              <p className="text-xs md:text-sm text-gray-400">Can only view dashboard and settings - no edit permissions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddUser}
        />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdate={(updates) => handleUpdateUser(editingUser.id, updates)}
        />
      )}
    </div>
  );
}

// Add User Modal Component
function AddUserModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (user: { phoneNumber: string; name: string; role: User['role'] }) => void;
}) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<User['role']>('user');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ phoneNumber, name, role });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">Add New User</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 (234) 567-8900"
              required
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as User['role'])}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
            >
              <option value="admin">👑 Admin - Full Access</option>
              <option value="user">👤 User - Standard Access</option>
              <option value="readonly">👁️ Read-Only - View Only</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded font-medium transition-colors"
            >
              Add User
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit User Modal Component
function EditUserModal({
  user,
  onClose,
  onUpdate,
}: {
  user: User;
  onClose: () => void;
  onUpdate: (updates: Partial<User>) => void;
}) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ name, role });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">Edit User</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              type="text"
              value={authService.formatPhoneNumber(user.phoneNumber)}
              disabled
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Phone number cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as User['role'])}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
            >
              <option value="admin">👑 Admin - Full Access</option>
              <option value="user">👤 User - Standard Access</option>
              <option value="readonly">👁️ Read-Only - View Only</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded font-medium transition-colors"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
