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

/**
 * Upload logo pesantren ke bucket 'foto-pesantren'
 * @param file File logo dari input file browser
 * @param fileName Nama file tujuan (misal: 'logo_pesantren.png')
 * @returns Public URL string dari logo yang berhasil di-upload
 */
export async function uploadLogoPesantren(file: File, fileName: string): Promise<string> {
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

    // Upload file with upsert enabled to overwrite previous logo
    const { data, error } = await supabase.storage
      .from('foto-pesantren')
      .upload(cleanedName, uploadTarget, {
        upsert: true,
        cacheControl: '3600'
      });

    if (error) {
      console.error('Error uploading logo pesantren:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('foto-pesantren')
      .getPublicUrl(cleanedName);

    if (!urlData || !urlData.publicUrl) {
      throw new Error('Gagal mendapatkan public URL untuk logo pesantren.');
    }

    return urlData.publicUrl;
  } catch (err: any) {
    console.error('Exception in uploadLogoPesantren:', err);
    throw new Error(err.message || 'Gagal mengunggah logo pesantren ke storage.');
  }
}

/**
 * Upload foto pimpinan pesantren ke bucket 'foto-pesantren'
 * @param file File foto dari input file browser
 * @param fileName Nama file tujuan (misal: 'pimpinan_pesantren.png')
 * @returns Public URL string dari foto yang berhasil di-upload
 */
export async function uploadFotoPimpinan(file: File, fileName: string): Promise<string> {
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

    // Upload file with upsert enabled to overwrite previous photo
    const { data, error } = await supabase.storage
      .from('foto-pesantren')
      .upload(cleanedName, uploadTarget, {
        upsert: true,
        cacheControl: '3600'
      });

    if (error) {
      console.error('Error uploading foto pimpinan:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('foto-pesantren')
      .getPublicUrl(cleanedName);

    if (!urlData || !urlData.publicUrl) {
      throw new Error('Gagal mendapatkan public URL untuk foto pimpinan.');
    }

    return urlData.publicUrl;
  } catch (err: any) {
    console.error('Exception in uploadFotoPimpinan:', err);
    throw new Error(err.message || 'Gagal mengunggah foto pimpinan ke storage.');
  }
}


/**
 * Upload gambar hero slide ke bucket 'foto-pesantren'
 */
export async function uploadHeroSlide(file: File, fileName: string): Promise<string> {
  try {
    let uploadTarget: File | Blob = file;
    if (file.type.startsWith('image/')) {
      try {
        uploadTarget = await imageCompression(file, compressionOptions);
      } catch (compErr) {
        console.warn('Image compression failed, uploading original:', compErr);
      }
    }

    const cleanedName = fileName.trim().replace(/\s+/g, '_');

    const { data, error } = await supabase.storage
      .from('foto-pesantren')
      .upload(cleanedName, uploadTarget, {
        upsert: true,
        cacheControl: '3600'
      });

    if (error) {
      console.error('Error uploading hero slide:', error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('foto-pesantren')
      .getPublicUrl(cleanedName);

    if (!urlData || !urlData.publicUrl) {
      throw new Error('Gagal mendapatkan public URL untuk hero slide.');
    }

    return urlData.publicUrl;
  } catch (err: any) {
    console.error('Exception in uploadHeroSlide:', err);
    throw new Error(err.message || 'Gagal mengunggah gambar hero slide.');
  }
}

/**
 * Upload foto user ke bucket 'foto-users'
 * @param file File foto dari input file browser
 * @param userId ID user dari auth (untuk folder upload)
 * @param fileName Nama file tujuan (misal: 'profile.jpg')
 * @returns Public URL string dari foto yang berhasil di-upload
 */
export async function uploadFotoUser(file: File, userId: string, fileName: string): Promise<string> {
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
    // Path format: userId/cleanedName
    const storagePath = `${userId}/${cleanedName}`;

    // Upload file with upsert enabled to overwrite previous profile photo
    const { data, error } = await supabase.storage
      .from('foto-users')
      .upload(storagePath, uploadTarget, {
        upsert: true,
        cacheControl: '3600'
      });

    if (error) {
      console.error('Error uploading foto user:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('foto-users')
      .getPublicUrl(storagePath);

    if (!urlData || !urlData.publicUrl) {
      throw new Error('Gagal mendapatkan public URL untuk foto user.');
    }

    return urlData.publicUrl;
  } catch (err: any) {
    console.error('Exception in uploadFotoUser:', err);
    throw new Error(err.message || 'Gagal mengunggah foto profil ke storage.');
  }
}
