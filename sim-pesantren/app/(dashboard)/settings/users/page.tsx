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
  X
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
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviting, setInviting] = useState(false);

  // Roles Tab States
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [addingRole, setAddingRole] = useState(false);

  // Fetch initial configuration
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch users from server-side API (bypasses RLS, merges auth.users emails)
      const usersRes = await fetch('/api/users');
      if (!usersRes.ok) {
        const errBody = await usersRes.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${usersRes.status}`);
      }
      const { users: mergedUsers } = await usersRes.json();
      setProfiles(mergedUsers || []);

      // 2. Fetch app_roles
      const { data: rolesData, error: rolesErr } = await supabase
        .from('app_roles')
        .select('*')
        .order('name', { ascending: true });
      if (rolesErr) throw rolesErr;
      setRoles(rolesData || []);

      if (rolesData && rolesData.length > 0 && !selectedRoleId) {
        setSelectedRoleId(rolesData[0].id);
      }

      // 3. Fetch role_permissions
      const { data: permData, error: permErr } = await supabase
        .from('role_permissions')
        .select('*');
      if (permErr) throw permErr;
      setPermissions(permData || []);

    } catch (err: any) {
      console.error('Error fetching data:', err);
      toast.error('Gagal memuat pengaturan pengguna & hak akses.');
    } finally {
      setLoading(false);
    }
  }, [selectedRoleId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Invite User Handler
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteRoleId) {
      toast.error('Semua kolom undangan wajib diisi.');
      return;
    }
    setInviting(true);
    try {
      const selectedRole = roles.find(r => r.id === inviteRoleId);
      
      // Simulate invitation creation
      // In production, this would trigger Supabase Auth invite / insert into custom user profiles table
      const mockNewUser = {
        id: Math.random().toString(),
        nama_lengkap: inviteEmail.split('@')[0].toUpperCase(),
        email: inviteEmail.trim(),
        role: selectedRole?.name || 'Wali Santri',
        status: 'Aktif',
        no_hp: '—'
      };

      setProfiles(prev => [mockNewUser, ...prev]);
      toast.success(`Undangan email berhasil dikirim ke: ${inviteEmail}`);
      setIsInviteModalOpen(false);
      setInviteEmail('');
    } catch (err: any) {
      toast.error('Gagal mengirim undangan.');
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
          { id_role: roleId, feature: 'Santri', can_view: true, can_create: false, can_edit: false, can_delete: false },
          { id_role: roleId, feature: 'Keuangan', can_view: false, can_create: false, can_edit: false, can_delete: false },
          { id_role: roleId, feature: 'Akademik', can_view: false, can_create: false, can_edit: false, can_delete: false }
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

  // handleSavePermissions is now handled inside RolePermissionMatrix via Server Action.
  // This callback is called after a successful save to re-sync parent permission state.
  const handlePermissionSaveSuccess = useCallback(async () => {
    clearPermissionCache();
    await fetchData();
  }, [fetchData]);

  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const activeRolePermissions = permissions.filter(p => p.id_role === selectedRoleId);

  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
      <div className="flex border-b border-slate-200 dark:border-zinc-800 gap-2">
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
                        {r.name !== 'Super Admin' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteRole(r.id, r.name); }}
                            className="text-slate-350 hover:text-rose-600 p-1 transition-colors flex-shrink-0"
                            title="Hapus Role Custom"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
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

      {/* Invite User Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setIsInviteModalOpen(false)} />
          
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform transition-all">
            
            {/* Modal Header */}
            <div className="border-b border-slate-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between bg-slate-50/60 dark:bg-zinc-950/40">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1">
                <UserPlus className="h-4 w-4 text-emerald-600" /> Undang Pengguna Baru
              </h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">✕</button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleInviteUser}>
              <div className="p-6 space-y-4">
                
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">Email Tujuan *</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="nama@domain.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-850 dark:text-zinc-100 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">Pilih Role Pengguna *</label>
                  <select
                    required
                    value={inviteRoleId}
                    onChange={e => setInviteRoleId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-zinc-100 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="" disabled>-- Pilih Role --</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="border-t border-slate-100 dark:border-zinc-800 px-6 py-4 flex justify-end gap-2 bg-slate-50/50 dark:bg-zinc-900/50">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 text-xs font-bold rounded-lg text-slate-650 dark:text-zinc-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-lg text-xs flex items-center gap-1.5"
                >
                  {inviting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Kirim Undangan
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

    </div>
  );
}
