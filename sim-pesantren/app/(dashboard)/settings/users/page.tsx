'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { AppRole, RolePermission, Profile } from '@/types/database';
import { clearPermissionCache } from '@/utils/permission-helper';
import RolePermissionMatrix from '@/components/RolePermissionMatrix';
import {
  ShieldCheck,
  UserPlus,
  Lock,
  Loader2,
  Trash2,
  Plus,
  Users,
  Mail,
  User,
  Shield,
  Activity,
  X,
  Pencil,
  Phone
} from 'lucide-react';
import { toast } from 'sonner';

type TabType = 'users' | 'roles';

export default function UserRoleSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [loading, setLoading] = useState(true);

  // Users Tab States
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteIdRole, setInviteIdRole] = useState('');
  const [inviting, setInviting] = useState(false);

  // Edit User States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editIdRole, setEditIdRole] = useState<string>('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // Roles Tab States
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [addingRole, setAddingRole] = useState(false);

  // Edit Role States
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AppRole | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDesc, setEditRoleDesc] = useState('');
  const [savingRole, setSavingRole] = useState(false);

  // Fetch initial configuration
  const fetchData = useCallback(async () => {
    setLoading(true);

    // 1. Fetch users from server-side API (bypasses RLS, merges auth.users emails)
    try {
      const usersRes = await fetch('/api/users');
      if (usersRes.ok) {
        const { users: mergedUsers } = await usersRes.json();
        setProfiles(mergedUsers || []);
      } else {
        console.error('Failed to fetch users:', usersRes.status);
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
    }

    // 2. Fetch app_roles (independent — don't let this block user list)
    try {
      const { data: rolesData, error: rolesErr } = await supabase
        .from('app_roles')
        .select('*')
        .order('name', { ascending: true });

      if (rolesErr) {
        console.error('Error fetching roles:', rolesErr.message);
      } else {
        setRoles(rolesData || []);
        if (rolesData && rolesData.length > 0 && !selectedRoleId) {
          setSelectedRoleId(rolesData[0].id);
        }
        if (rolesData && rolesData.length > 0 && !inviteIdRole) {
          const nonAdmin = rolesData.find(r => r.name !== 'Super Admin') || rolesData[0];
          setInviteIdRole(nonAdmin.id);
        }
      }
    } catch (err: any) {
      console.error('Error fetching roles:', err);
    }

    // 3. Fetch role_permissions (independent)
    try {
      const { data: permData, error: permErr } = await supabase
        .from('role_permissions')
        .select('*');

      if (permErr) {
        console.error('Error fetching permissions:', permErr.message);
      } else {
        setPermissions(permData || []);
      }
    } catch (err: any) {
      console.error('Error fetching permissions:', err);
    }

    setLoading(false);
  }, [selectedRoleId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Invite User Handler
  // Generate random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pw = '';
    for (let i = 0; i < 8; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    setInvitePassword(pw);
  };

  const resetInviteForm = () => {
    setInviteEmail('');
    setInviteName('');
    setInvitePassword('');
    setInvitePhone('');
    setInviteIdRole('');
  };

  // Open edit modal
  const openEditModal = (user: any) => {
    setEditUser(user);
    setEditName(user.nama_lengkap || '');
    setEditIdRole(user.id_role || '');
    setEditPhone(user.no_hp === '—' ? '' : user.no_hp || '');
    setIsEditModalOpen(true);
  };

  // Save edited user
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser || !editName.trim()) {
      toast.error('Nama tidak boleh kosong.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_lengkap: editName.trim(),
          id_role: editIdRole || null,
          no_hp: editPhone.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal menyimpan perubahan.');
        return;
      }
      toast.success(data.message || 'Data pengguna berhasil diperbarui.');
      setIsEditModalOpen(false);
      setEditUser(null);
      await fetchData();
    } catch (err: any) {
      console.error('Edit user error:', err);
      toast.error('Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (user: any) => {
    if (!confirm(`Yakin ingin menghapus akun "${user.nama_lengkap}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal menghapus akun.');
        return;
      }
      toast.success(data.message || 'Akun berhasil dihapus.');
      setProfiles(prev => prev.filter(p => p.id !== user.id));
    } catch (err: any) {
      console.error('Delete user error:', err);
      toast.error('Gagal menghapus akun.');
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim() || !invitePassword) {
      toast.error('Nama, email, dan password wajib diisi.');
      return;
    }
    if (invitePassword.length < 6) {
      toast.error('Password minimal 6 karakter.');
      return;
    }

    setInviting(true);
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          password: invitePassword,
          nama: inviteName.trim(),
          id_role: inviteIdRole || undefined,
          no_hp: invitePhone.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Gagal membuat akun.');
        return;
      }

      // Add new user to list
      if (data.user) {
        setProfiles(prev => [data.user, ...prev]);
      }

      // Show success with WhatsApp status
      if (data.whatsapp === 'sent') {
        toast.success(`Akun berhasil dibuat & undangan WhatsApp terkirim ke ${inviteName.trim()}!`);
      } else if (data.whatsapp === 'failed') {
        toast.success(`Akun berhasil dibuat, tapi pengiriman WhatsApp gagal. Kirim kredensial secara manual.`);
      } else {
        toast.success(`Akun berhasil dibuat untuk ${inviteName.trim()}!`);
      }

      setIsInviteModalOpen(false);
      resetInviteForm();
      await fetchData();
    } catch (err: any) {
      console.error('Invite error:', err);
      toast.error('Gagal membuat akun pengguna.');
    } finally {
      setInviting(false);
    }
  };

  // Add Custom Role Handler
  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      toast.error('Nama role wajib diisi.');
      return;
    }
    setAddingRole(true);
    try {
      // 1. Insert role
      const { data: newRole, error: roleErr } = await supabase
        .from('app_roles')
        .insert([{ name: newRoleName.trim(), description: newRoleDesc.trim() }])
        .select();

      if (roleErr) throw roleErr;

      const roleId = newRole?.[0]?.id;
      
      // 2. Setup default blank feature permissions in role_permissions table
      if (roleId) {
        const defaultPerms = [
          { id_role: roleId, feature: 'Lembaga', can_view: false, can_create: false, can_edit: false, can_delete: false },
          { id_role: roleId, feature: 'Santri', can_view: true, can_create: false, can_edit: false, can_delete: false },
          { id_role: roleId, feature: 'Tahfidz', can_view: true, can_create: false, can_edit: false, can_delete: false },
          { id_role: roleId, feature: 'Kepegawaian', can_view: false, can_create: false, can_edit: false, can_delete: false },
          { id_role: roleId, feature: 'Keuangan', can_view: false, can_create: false, can_edit: false, can_delete: false },
          { id_role: roleId, feature: 'Akademik', can_view: false, can_create: false, can_edit: false, can_delete: false },
          { id_role: roleId, feature: 'Asrama', can_view: false, can_create: false, can_edit: false, can_delete: false },
          { id_role: roleId, feature: 'Perizinan', can_view: false, can_create: false, can_edit: false, can_delete: false }
        ];

        const { error: permErr } = await supabase
          .from('role_permissions')
          .insert(defaultPerms);

        if (permErr) throw permErr;
      }

      toast.success(`Role custom "${newRoleName}" berhasil dibuat!`);
      setIsAddRoleModalOpen(false);
      setNewRoleName('');
      setNewRoleDesc('');
      
      if (roleId) setSelectedRoleId(roleId);
      await fetchData();
    } catch (err: any) {
      console.error('Error adding role:', err);
      toast.error('Gagal menambahkan role custom.');
    } finally {
      setAddingRole(false);
    }
  };

  // Delete Custom Role Handler
  const handleDeleteRole = async (roleId: string, name: string) => {
    if (name === 'Super Admin') {
      toast.error('Gagal: Role Super Admin dilindungi dan tidak dapat dihapus.');
      return;
    }
    if (!confirm(`Hapus custom role "${name}"? Tindakan ini akan menghapus semua hak akses terkait.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('app_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
      toast.success(`Role "${name}" berhasil dihapus.`);
      
      setSelectedRoleId(roles[0]?.id || '');
      await fetchData();
    } catch (err: any) {
      console.error('Error deleting role:', err);
      toast.error('Gagal menghapus role custom.');
    }
  };

  // Open Edit Role Modal
  const openEditRoleModal = (role: AppRole) => {
    setEditingRole(role);
    setEditRoleName(role.name);
    setEditRoleDesc(role.description || '');
    setIsEditRoleModalOpen(true);
  };

  const SYSTEM_ROLES = ['Super Admin', 'Pengasuh', 'Wali Santri'];

  // Save Edit Role
  const handleSaveEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !editRoleName.trim()) {
      toast.error('Nama role wajib diisi.');
      return;
    }
    setSavingRole(true);
    try {
      const { updateRole } = await import('@/services/role-actions');
      const result = await updateRole(editingRole.id, {
        name: editRoleName.trim(),
        description: editRoleDesc.trim() || null,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setIsEditRoleModalOpen(false);
      setEditingRole(null);
      await fetchData();
    } catch (err: any) {
      toast.error('Gagal menyimpan perubahan role.');
    } finally {
      setSavingRole(false);
    }
  };

  // handleSavePermissions is now handled inside RolePermissionMatrix via Server Action.
  // This callback is called after a successful save to re-sync parent permission state.
  const handlePermissionSaveSuccess = useCallback(async () => {
    clearPermissionCache();
    await fetchData();
  }, [fetchData]);

  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const activeRolePermissions = permissions.filter(p => p.id_role === selectedRoleId);

  return (
    <>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-600" /> Manajemen User & Custom Role
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">
            Kelola pengguna portal admin, undang pengguna baru, dan atur kustomisasi hak akses matrix fitur.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-zinc-800 gap-2 mb-8">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition-all ${
            activeTab === 'users'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
          }`}
        >
          <Users className="h-4 w-4" />
          Pengguna Sistem ({profiles.length})
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition-all ${
            activeTab === 'roles'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
          }`}
        >
          <Lock className="h-4 w-4" />
          Matrix Hak Akses Role
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-slate-400 text-xs">Memuat modul manajemen user...</p>
        </div>
      ) : (
        <div className="animate-fadeIn">
          
          {/* TAB 1: User List */}
          {activeTab === 'users' && (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
              
              {/* Header List */}
              <div className="p-5 border-b border-slate-150 dark:border-zinc-850 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Daftar Pengguna Aktif</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Pengguna yang memiliki hak masuk ke dashboard administrasi.</p>
                </div>
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs shadow-md shadow-emerald-600/10 transition-all active:scale-95 duration-200"
                >
                  <UserPlus className="h-4 w-4" /> Undang User
                </button>
              </div>

              {/* Users Grid/Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-5">Nama Pengguna</th>
                      <th className="py-3.5 px-5">Email</th>
                      <th className="py-3.5 px-5">Role Pengguna</th>
                      <th className="py-3.5 px-5 text-center">Status</th>
                      <th className="py-3.5 px-5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-850 text-xs">
                    {profiles.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-850/20 transition-colors">
                        <td className="py-4 px-5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] uppercase shadow-sm">
                            {p.nama_lengkap.charAt(0)}
                          </div>
                          {p.nama_lengkap}
                        </td>
                        <td className="py-4 px-5 text-slate-500 dark:text-zinc-400 font-medium">
                          {p.email}
                        </td>
                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                            p.role === 'Super Admin'
                              ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20'
                              : p.role === 'Pengasuh'
                              ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20'
                              : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20'
                          }`}>
                            <Shield className="h-3 w-3" />
                            {p.role}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-center">
                          <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${
                            p.status === 'Aktif' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`} />
                          <span className={p.status === 'Aktif' ? 'font-bold text-emerald-600' : 'text-slate-400'}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditModal(p)}
                              title="Edit Pengguna"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:border-emerald-200 dark:hover:border-emerald-500/20 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-400 dark:text-zinc-500 transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(p)}
                              title="Hapus Pengguna"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:border-rose-200 dark:hover:border-rose-500/20 hover:text-rose-600 dark:hover:text-rose-400 text-slate-400 dark:text-zinc-500 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Custom Role Matrix */}
          {activeTab === 'roles' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Side: Role Selector */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-850 pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">Daftar Custom Role</h3>
                    <button
                      onClick={() => setIsAddRoleModalOpen(true)}
                      className="text-emerald-600 hover:text-emerald-700 text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Tambah Custom
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {roles.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRoleId(r.id)}
                        className={`w-full p-4 rounded-xl text-left border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                          selectedRoleId === r.id
                            ? 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.02] border-emerald-500'
                            : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850/60'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {r.name === 'Super Admin' && <Lock className="h-3.5 w-3.5 text-rose-500" />}
                            {r.name}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-normal">{r.description || 'Tanpa deskripsi'}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditRoleModal(r); }}
                            className="text-slate-400 hover:text-emerald-600 p-1 transition-colors"
                            title="Edit Role"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {r.name !== 'Super Admin' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteRole(r.id, r.name); }}
                              className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                              title="Hapus Role Custom"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Side: Permissions Checkbox Matrix */}
              <div className="lg:col-span-2 space-y-6">
                {selectedRole ? (
                  <RolePermissionMatrix
                    selectedRoleId={selectedRoleId}
                    selectedRoleName={selectedRole.name}
                    permissions={permissions}
                    onSaveSuccess={handlePermissionSaveSuccess}
                  />
                ) : (
                  <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-20 text-center rounded-2xl shadow-sm">
                    <Shield className="h-10 w-10 text-slate-300 dark:text-zinc-750 mx-auto mb-3" />
                    <h4 className="font-bold text-slate-700 dark:text-zinc-300">Menunggu Pilihan Role</h4>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

      {/* ══════════ Edit User Modal ══════════ */}
      {isEditModalOpen && editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />

          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="border-b border-slate-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between bg-slate-50/60 dark:bg-zinc-950/40">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Pencil className="h-4 w-4 text-emerald-600" /> Edit Pengguna
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors">✕</button>
            </div>

            {/* Body */}
            <form onSubmit={handleSaveEdit}>
              <div className="p-6 space-y-4">

                {/* Info akun */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                  <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm uppercase">
                    {editUser.nama_lengkap?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-100">{editUser.email}</p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-600">ID: {editUser.id?.slice(0, 8)}...</p>
                  </div>
                </div>

                {/* Nama Lengkap */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Nama Lengkap</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-600" />
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      disabled={saving}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-zinc-100 outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Role</label>
                  <select
                    value={editIdRole}
                    onChange={e => setEditIdRole(e.target.value)}
                    disabled={saving}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-zinc-100 outline-none transition-all cursor-pointer disabled:opacity-50"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* No HP */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">No. WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-600" />
                    <input
                      type="tel"
                      placeholder="628xxxxxxxxxx"
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value)}
                      disabled={saving}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-zinc-100 outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 flex justify-end gap-2 bg-slate-50/50 dark:bg-zinc-900/50">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold rounded-xl text-slate-600 dark:text-zinc-300 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/10 transition-all active:scale-95"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ Invite User Modal ══════════ */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => { setIsInviteModalOpen(false); resetInviteForm(); }} />
          
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden transform transition-all">
            
            {/* Modal Header */}
            <div className="border-b border-slate-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between bg-slate-50/60 dark:bg-zinc-950/40">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-emerald-600" /> Tambah Pengguna Baru
              </h3>
              <button onClick={() => { setIsInviteModalOpen(false); resetInviteForm(); }} className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors">✕</button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleInviteUser}>
              <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">

                {/* Nama Lengkap */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Nama Lengkap *</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-600" />
                    <input
                      type="text"
                      required
                      placeholder="Nama lengkap pengguna"
                      value={inviteName}
                      onChange={e => setInviteName(e.target.value)}
                      disabled={inviting}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-zinc-100 outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-600" />
                    <input
                      type="email"
                      required
                      placeholder="nama@domain.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      disabled={inviting}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-zinc-100 outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Password Sementara */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Password Sementara *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Min. 6 karakter"
                      value={invitePassword}
                      onChange={e => setInvitePassword(e.target.value)}
                      disabled={inviting}
                      className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-zinc-100 font-mono outline-none transition-all disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={generatePassword}
                      disabled={inviting}
                      className="px-3 py-2.5 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl text-[11px] font-bold text-slate-600 dark:text-zinc-300 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      🎲 Generate
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-600">Password akan dikirim ke WhatsApp user. User bisa ubah setelah login.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Role */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Role *</label>
                    <select
                      required
                      value={inviteIdRole}
                      onChange={e => setInviteIdRole(e.target.value)}
                      disabled={inviting}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-zinc-100 outline-none transition-all cursor-pointer disabled:opacity-50"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* No. WhatsApp */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">No. WhatsApp</label>
                    <input
                      type="tel"
                      placeholder="628xxxxxxxxxx"
                      value={invitePhone}
                      onChange={e => setInvitePhone(e.target.value)}
                      disabled={inviting}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-zinc-100 outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Info box */}
                <div className="flex items-start gap-2 px-3.5 py-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-500/[0.04] border border-emerald-100 dark:border-emerald-500/10 text-[11px] text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>Akun akan langsung aktif. Jika No. WhatsApp diisi dan Fonnte terkonfigurasi, kredensial login otomatis dikirim via WhatsApp.</span>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 flex justify-end gap-2 bg-slate-50/50 dark:bg-zinc-900/50">
                <button
                  type="button"
                  onClick={() => { setIsInviteModalOpen(false); resetInviteForm(); }}
                  disabled={inviting}
                  className="px-4 py-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold rounded-xl text-slate-600 dark:text-zinc-300 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/10 transition-all active:scale-95"
                >
                  {inviting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {inviting ? 'Membuat Akun...' : 'Buat & Kirim Undangan'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Edit Custom Role Modal */}
      {isEditRoleModalOpen && editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setIsEditRoleModalOpen(false)} />
          
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="border-b border-slate-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between bg-slate-50/60 dark:bg-zinc-950/40">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Edit Custom Role</h3>
              <button onClick={() => setIsEditRoleModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">✕</button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEditRole}>
              <div className="p-6 space-y-4">

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">Nama Role *</label>
                  <input
                    type="text"
                    required
                    placeholder="Cth: Bendahara Diniyah"
                    value={editRoleName}
                    onChange={e => setEditRoleName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-850 dark:text-zinc-100 focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">Deskripsi Singkat</label>
                  <textarea
                    rows={2}
                    placeholder="Tuliskan keterangan detail mengenai wewenang role..."
                    value={editRoleDesc}
                    onChange={e => setEditRoleDesc(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-850 dark:text-zinc-100 focus:outline-none transition-all resize-none"
                  />
                </div>

                {SYSTEM_ROLES.includes(editingRole.name) && (
                  <div className="flex items-start gap-2 px-3.5 py-3 rounded-xl bg-amber-50/60 dark:bg-amber-500/[0.04] border border-amber-200 dark:border-amber-500/10 text-[11px] text-amber-700 dark:text-amber-400">
                    <span className="font-bold">⚠️</span>
                    <span>Mengubah nama role <strong>{editingRole.name}</strong> akan <strong>memutus akses</strong> pengguna yang saat ini memiliki role ini, karena sistem menggunakan nama role untuk mencocokkan hak akses.</span>
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 flex justify-end gap-2 bg-slate-50/50 dark:bg-zinc-900/50">
                <button
                  type="button"
                  onClick={() => setIsEditRoleModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 text-xs font-bold rounded-lg text-slate-650 dark:text-zinc-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingRole}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-lg text-xs flex items-center gap-1.5"
                >
                  {savingRole && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
                  Simpan Perubahan
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Add Custom Role Modal */}
      {isAddRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setIsAddRoleModalOpen(false)} />
          
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform transition-all">
            
            {/* Modal Header */}
            <div className="border-b border-slate-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between bg-slate-50/60 dark:bg-zinc-950/40">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Tambah Custom Role</h3>
              <button onClick={() => setIsAddRoleModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">✕</button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddRole}>
              <div className="p-6 space-y-4">
                
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">Nama Role Baru *</label>
                  <input
                    type="text"
                    required
                    placeholder="Cth: Bendahara Diniyah, Keamanan"
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-850 dark:text-zinc-100 focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">Deskripsi Singkat</label>
                  <textarea
                    rows={2}
                    placeholder="Tuliskan keterangan detail mengenai wewenang role..."
                    value={newRoleDesc}
                    onChange={e => setNewRoleDesc(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-850 dark:text-zinc-100 focus:outline-none transition-all resize-none"
                  />
                </div>

              </div>

              {/* Modal Footer */}
              <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 flex justify-end gap-2 bg-slate-50/50 dark:bg-zinc-900/50">
                <button
                  type="button"
                  onClick={() => setIsAddRoleModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 text-xs font-bold rounded-lg text-slate-650 dark:text-zinc-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addingRole}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-lg text-xs flex items-center gap-1.5"
                >
                  {addingRole && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
                  Simpan Role
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </>
  );
}
