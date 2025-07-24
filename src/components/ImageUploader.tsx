import React, { useState, useCallback, useEffect } from 'react';
import { API_BASE_URL } from '../config';

interface ImageUploaderProps {
  onImagesChange: (imageUrls: string[]) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  maxImages?: number;
}

// A state for tracking individual file upload progress
interface UploadableFile {
  file: File;
  id: string;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  publicUrl?: string;
  error?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesChange, onUploadingChange, maxImages = 3 }) => {
  const [uploadableFiles, setUploadableFiles] = useState<UploadableFile[]>([]);
  const [globalError, setGlobalError] = useState<string>('');
  
  const isUploading = uploadableFiles.some(f => f.status === 'pending' || f.status === 'uploading');

  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

  const uploadFile = async (uploadable: UploadableFile) => {
    try {
      // 1. Get a secure upload URL from our backend
      const response = await fetch(`${API_BASE_URL}/api/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: uploadable.file.name, contentType: uploadable.file.type }),
      });
      
      if (!response.ok) {
        throw new Error('Could not get an upload URL.');
      }
      
      const { uploadUrl, publicUrl } = await response.json();

      // 2. Upload the file directly to R2 using the presigned URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: uploadable.file,
        headers: {
          'Content-Type': uploadable.file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload to R2 failed.');
      }
      
      // 3. Mark as success and store the public URL
      return { ...uploadable, status: 'success' as const, publicUrl };
    } catch (error) {
      console.error('Upload failed:', error);
      return { ...uploadable, status: 'error' as const, error: 'Upload failed' };
    }
  };


  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalError('');
    if (!event.target.files) return;

    const files = Array.from(event.target.files);
    if (uploadableFiles.length + files.length > maxImages) {
      setGlobalError(`You can only upload a maximum of ${maxImages} images.`);
      return;
    }
    
    const newUploadables: UploadableFile[] = files.map(file => ({
      file,
      id: crypto.randomUUID(),
      preview: URL.createObjectURL(file),
      status: 'pending',
    }));

    setUploadableFiles(prev => [...prev, ...newUploadables]);

    // Start uploading all new files
    const uploadPromises = newUploadables.map(uploadFile);
    const results = await Promise.all(uploadPromises);

    // Update state with results and notify parent component
    setUploadableFiles(prev => {
      const updatedFiles = prev.map(oldFile => {
        const updatedResult = results.find(res => res.id === oldFile.id);
        return updatedResult || oldFile;
      });
      
      const successfulUrls = updatedFiles
        .filter(f => f.status === 'success' && f.publicUrl)
        .map(f => f.publicUrl!);
        
      onImagesChange(successfulUrls);
      return updatedFiles;
    });
    
    // Clear input
    if (event.target) {
        event.target.value = '';
    }
  }, [uploadableFiles, maxImages, onImagesChange]);

  const removeImage = (id: string) => {
    const updatedFiles = uploadableFiles.filter(f => f.id !== id);
    setUploadableFiles(updatedFiles);
    
    const successfulUrls = updatedFiles
      .filter(f => f.status === 'success' && f.publicUrl)
      .map(f => f.publicUrl!);
    
    onImagesChange(successfulUrls);
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-slate-600 font-serif">
        Memorial Photos (up to {maxImages})
      </label>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
        <div className="space-y-1 text-center">
          <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex text-sm text-slate-600">
            <label htmlFor="file-upload" className={`relative cursor-pointer bg-white rounded-md font-medium text-pink-500 hover:text-pink-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-pink-500 ${isUploading ? 'opacity-50' : ''}`}>
              <span>{isUploading ? 'Uploading...' : `Upload up to ${maxImages} files`}</span>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} disabled={uploadableFiles.length >= maxImages || isUploading} />
            </label>
          </div>
          <p className="text-xs text-slate-500">Images will be uploaded to secure storage.</p>
        </div>
      </div>
      {globalError && <p className="text-sm text-red-500">{globalError}</p>}
      {uploadableFiles.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mt-4">
          {uploadableFiles.map((upFile) => (
            <div key={upFile.id} className="relative group">
              <img src={upFile.preview} alt={`Preview ${upFile.file.name}`} className="h-24 w-full object-cover rounded-md" />
              <div className="absolute inset-0 bg-black flex items-center justify-center transition-opacity duration-300 opacity-0 group-hover:opacity-60">
                {upFile.status === 'success' && <span className="text-white text-2xl">&#10003;</span>}
                {upFile.status === 'error' && <span className="text-red-500 text-2xl font-bold">!</span>}
                {(upFile.status === 'pending' || upFile.status === 'uploading') && <div className="w-6 h-6 border-2 border-dashed border-white rounded-full animate-spin"></div>}
              </div>
              <button onClick={() => removeImage(upFile.id)} className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                &#x2715;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
