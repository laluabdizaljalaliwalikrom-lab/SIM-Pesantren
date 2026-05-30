'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Trash2, UploadCloud, User } from 'lucide-react';

interface ImageUploadProps {
  value?: string | File | null; // Initial image URL or selected File
  onChange: (file: File | null) => void; // Callback when image is selected or removed
  loading?: boolean; // Show loading spinner
  shape?: 'circle' | 'square'; // Shape of the dropzone
  label?: string; // Optional label above the dropzone
}

export default function ImageUpload({
  value,
  onChange,
  loading = false,
  shape = 'circle',
  label = 'Foto Profil'
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync internal preview when value changes
  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }

    if (value instanceof File) {
      const objectUrl = URL.createObjectURL(value);
      setPreviewUrl(objectUrl);
      
      // Cleanup Object URL on unmount or change
      return () => URL.revokeObjectURL(objectUrl);
    } else if (typeof value === 'string') {
      setPreviewUrl(value);
    }
  }, [value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Format file tidak didukung. Silakan pilih file gambar.');
        return;
      }
      onChange(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (loading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Format file tidak didukung. Silakan pilih file gambar.');
        return;
      }
      onChange(file);
    }
  };

  const triggerFileInput = () => {
    if (loading) return;
    fileInputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      {label && (
        <span className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-1">
          {label}
        </span>
      )}

      {/* Main Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`relative group cursor-pointer border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-emerald-500 dark:hover:border-emerald-500/50 bg-slate-50 dark:bg-zinc-950 flex items-center justify-center overflow-hidden transition-all duration-200 ${shapeClass} h-32 w-32`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
          disabled={loading}
        />

        {previewUrl ? (
          /* Preview Mode */
          <div className="relative w-full h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-zinc-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity duration-200">
              <Camera className="h-5 w-5 text-white" />
              <span className="text-[10px] text-white font-bold uppercase tracking-wider">
                Ubah Foto
              </span>
            </div>
          </div>
        ) : (
          /* Empty Dropzone State */
          <div className="flex flex-col items-center justify-center p-4 text-center space-y-1.5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            <Camera className="h-6 w-6 stroke-[1.5]" />
            <div className="text-[9px] font-bold uppercase tracking-wider">
              Unggah Foto
            </div>
          </div>
        )}

        {/* Loading Spinner overlay */}
        {loading && (
          <div className={`absolute inset-0 bg-zinc-950/65 flex flex-col items-center justify-center text-white ${shapeClass}`}>
            <RefreshCw className="h-5 w-5 animate-spin text-emerald-450" />
            <span className="text-[8px] font-bold uppercase tracking-widest mt-1 text-emerald-300">
              Uploading...
            </span>
          </div>
        )}
      </div>

      {/* Helper Action Buttons below Dropzone */}
      {previewUrl && !loading && (
        <div className="flex items-center gap-2.5 pt-1.5">
          <button
            type="button"
            onClick={triggerFileInput}
            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-450 transition-colors bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-500/15"
          >
            <UploadCloud className="h-3 w-3" />
            Ubah
          </button>
          <button
            type="button"
            onClick={handleRemove}
            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-455 transition-colors bg-rose-50 dark:bg-rose-500/5 px-2.5 py-1 rounded-lg border border-rose-100 dark:border-rose-900/15"
          >
            <Trash2 className="h-3 w-3" />
            Hapus
          </button>
        </div>
      )}
    </div>
  );
}
