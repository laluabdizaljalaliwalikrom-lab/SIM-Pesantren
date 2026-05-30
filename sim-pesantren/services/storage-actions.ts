import { supabase } from '@/lib/supabase';
import imageCompression from 'browser-image-compression';

const compressionOptions = {
  maxSizeMB: 0.5, // Compress to max 500KB
  maxWidthOrHeight: 800, // Max size 800px
  useWebWorker: true
};

/**
 * Upload foto santri ke bucket 'foto-santri'
 * @param file File foto dari input file browser
 * @param fileName Nama file tujuan (disarankan menggunakan NIS, misal: '12345.jpg')
 * @returns Public URL string dari foto yang berhasil di-upload
 */
export async function uploadFotoSantri(file: File, fileName: string): Promise<string> {
  try {
    // Compress image if it is an image type
    let uploadTarget: File | Blob = file;
    if (file.type.startsWith('image/')) {
      try {
        uploadTarget = await imageCompression(file, compressionOptions);
      } catch (compErr) {
        console.warn('Image compression failed, uploading original:', compErr);
      }
    }

    // Clean up filename to prevent path issues
    const cleanedName = fileName.trim().replace(/\s+/g, '_');

    // Upload file with upsert enabled to overwrite previous profile photos
    const { data, error } = await supabase.storage
      .from('foto-santri')
      .upload(cleanedName, uploadTarget, {
        upsert: true,
        cacheControl: '3600'
      });

    if (error) {
      console.error('Error uploading foto santri:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('foto-santri')
      .getPublicUrl(cleanedName);

    if (!urlData || !urlData.publicUrl) {
      throw new Error('Gagal mendapatkan public URL untuk foto santri.');
    }

    return urlData.publicUrl;
  } catch (err: any) {
    console.error('Exception in uploadFotoSantri:', err);
    throw new Error(err.message || 'Gagal mengunggah foto santri ke storage.');
  }
}

/**
 * Upload foto pegawai ke bucket 'foto-pegawai'
 * @param file File foto dari input file browser
 * @param fileName Nama file tujuan (disarankan menggunakan NIP, misal: '198765.jpg')
 * @returns Public URL string dari foto yang berhasil di-upload
 */
export async function uploadFotoPegawai(file: File, fileName: string): Promise<string> {
  try {
    // Compress image if it is an image type
    let uploadTarget: File | Blob = file;
    if (file.type.startsWith('image/')) {
      try {
        uploadTarget = await imageCompression(file, compressionOptions);
      } catch (compErr) {
        console.warn('Image compression failed, uploading original:', compErr);
      }
    }

    // Clean up filename to prevent path issues
    const cleanedName = fileName.trim().replace(/\s+/g, '_');

    // Upload file with upsert enabled to overwrite previous profile photos
    const { data, error } = await supabase.storage
      .from('foto-pegawai')
      .upload(cleanedName, uploadTarget, {
        upsert: true,
        cacheControl: '3600'
      });

    if (error) {
      console.error('Error uploading foto pegawai:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('foto-pegawai')
      .getPublicUrl(cleanedName);

    if (!urlData || !urlData.publicUrl) {
      throw new Error('Gagal mendapatkan public URL untuk foto pegawai.');
    }

    return urlData.publicUrl;
  } catch (err: any) {
    console.error('Exception in uploadFotoPegawai:', err);
    throw new Error(err.message || 'Gagal mengunggah foto pegawai ke storage.');
  }
}
