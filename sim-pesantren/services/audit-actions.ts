import { supabase } from '@/lib/supabase';
import { AuditActionType } from '@/types/database';

export interface LogActivityParams {
  action: AuditActionType;
  module: 'Santri' | 'Pegawai' | 'Keuangan' | 'Pembayaran' | 'Asrama' | 'Tahfidz' | 'Akademik' | 'PPDB' | 'Settings' | 'Auth';
  description: string;
  recordId?: string | null;
  oldData?: Record<string, any> | null;
  newData?: Record<string, any> | null;
}

/**
 * Mencatat aktivitas pengguna ke tabel audit_logs.
 * Otomatis mengambil data user sesi aktif dari Supabase.
 */
export async function logActivity({
  action,
  module,
  description,
  recordId = null,
  oldData = null,
  newData = null,
}: LogActivityParams): Promise<{ success: boolean; error?: any }> {
  try {
    // 1. Dapatkan user sesi aktif
    const { data: { user } } = await supabase.auth.getUser();
    
    let userId: string | null = null;
    let userName: string | null = 'Sistem';
    let userRole: string | null = 'System';

    if (user) {
      userId = user.id;
      // Dapatkan profil user untuk mengambil nama dan role
      const { data: profile } = await supabase
        .from('profiles')
        .select('nama_lengkap, role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        userName = profile.nama_lengkap || user.email || 'Pengguna';
        userRole = profile.role || 'Staff';
      } else {
        userName = user.email || 'Pengguna';
        userRole = 'Authenticated';
      }
    }

    // 2. Simpan ke tabel audit_logs
    const { error } = await supabase.from('audit_logs').insert([
      {
        user_id: userId,
        user_name: userName,
        user_role: userRole,
        action,
        module,
        record_id: recordId ? String(recordId) : null,
        description,
        old_data: oldData || null,
        new_data: newData || null,
        user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
      },
    ]);

    if (error) {
      console.warn('Gagal mencatat audit log:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Error saat menjalankan logActivity:', err);
    return { success: false, error: err.message };
  }
}
