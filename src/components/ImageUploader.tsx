import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';

interface ImageUploaderProps {
  onImagesChange: (imageUrls: string[]) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  maxImages?: number;
}

// A state for tracking individual file upload progress
interface UploadableFile {
  file: File;
  id: string; // A unique ID for this upload instance
  preview: string; // A local URL for instant preview
  status: 'queued' | 'uploading' | 'success' | 'error';
  publicUrl?: string; // The final URL after successful upload
  error?: string;
}

// This is the rewritten component.
export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesChange, onUploadingChange, maxImages = 3 }) => {
  const [uploadableFiles, setUploadableFiles] = useState<UploadableFile[]>([]);
  const [globalError, setGlobalError] = useState<string>('');

  // This effect reports the uploading status to the parent component.
  useEffect(() => {
    const isCurrentlyUploading = uploadableFiles.some(f => f.status === 'uploading' || f.status === 'queued');
    onUploadingChange?.(isCurrentlyUploading);
  }, [uploadableFiles, onUploadingChange]);

  // This effect is the core of the new logic. It finds any 'queued' files and starts uploading them.
  useEffect(() => {
    const filesToUpload = uploadableFiles.filter(f => f.status === 'queued');
    if (filesToUpload.length > 0) {
      filesToUpload.forEach(fileToUpload => {
        // Mark as uploading immediately
        setUploadableFiles(currentFiles =>
          currentFiles.map(f => f.id === fileToUpload.id ? { ...f, status: 'uploading' } : f)
        );

        // Start the actual upload
        uploadFile(fileToUpload)
          .then(result => {
            // Update the specific file with the result
            setUploadableFiles(currentFiles =>
              currentFiles.map(f => f.id === result.id ? result : f)
            );
          });
      });
    }
  }, [uploadableFiles]);

  // This effect updates the parent component with the list of successful URLs.
  useEffect(() => {
    const successfulUrls = uploadableFiles
      .filter(f => f.status === 'success' && f.publicUrl)
      .map(f => f.publicUrl!);
    onImagesChange(successfulUrls);
  }, [uploadableFiles, onImagesChange]);
  
  // This effect handles cleanup of the local preview URLs to prevent memory leaks.
  useEffect(() => {
    const previews = uploadableFiles.map(f => f.preview);
    return () => {
        previews.forEach(preview => URL.revokeObjectURL(preview));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const uploadFile = async (uploadable: UploadableFile): Promise<UploadableFile> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: uploadable.file.name, contentType: uploadable.file.type }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to get upload URL.' }));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }
      
      const { uploadUrl, publicUrl } = await response.json();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: uploadable.file,
        headers: { 'Content-Type': uploadable.file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error('Direct upload to storage failed.');
      }
      
      return { ...uploadable, status: 'success', publicUrl };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during upload.';
      console.error(`Upload failed for ${uploadable.file.name}:`, errorMessage);
      return { ...uploadable, status: 'error', error: errorMessage };
    }
  };


  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalError('');
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (!files.length) return;

    if (uploadableFiles.length + files.length > maxImages) {
      setGlobalError(`You can only upload a maximum of ${maxImages} images.`);
      return;
    }
    
    // Create new files with 'queued' status. This is the only thing this function does now.
    // The UI will update instantly showing the previews.
    const newUploadables: UploadableFile[] = files.map(file => ({
      file,
      id: crypto.randomUUID(),
      preview: URL.createObjectURL(file), // Important: Creates a temporary local URL for the thumbnail
      status: 'queued', 
    }));

    setUploadableFiles(prev => [...prev, ...newUploadables]);
    
    // Reset the file input so the user can select the same file again if they remove it.
    event.target.value = '';
  }, [uploadableFiles.length, maxImages]);

  const removeImage = (idToRemove: string) => {
    setUploadableFiles(currentFiles => {
        const fileToRemove = currentFiles.find(f => f.id === idToRemove);
        if (fileToRemove) {
            // Important: Clean up the local URL to prevent memory leaks.
            URL.revokeObjectURL(fileToRemove.preview);
        }
        return currentFiles.filter(f => f.id !== idToRemove);
    });
  };

  const isUploading = uploadableFiles.some(f => f.status === 'uploading' || f.status === 'queued');

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
              <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} disabled={uploadableFiles.length >= maxImages || isUploading} />
            </label>
          </div>
          <p className="text-xs text-slate-500">Images will be uploaded to secure storage.</p>
        </div>
      </div>
      {globalError && <p className="text-sm text-red-500">{globalError}</p>}
      {uploadableFiles.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mt-4">
          {uploadableFiles.map((upFile) => (
            <div key={upFile.id} className="relative group aspect-square">
              <img src={upFile.preview} alt={`Preview of ${upFile.file.name}`} className="h-full w-full object-cover rounded-md shadow-sm" />
              <div className="absolute inset-0 bg-black flex items-center justify-center transition-opacity duration-300 opacity-0 group-hover:opacity-60 rounded-md">
                {upFile.status === 'success' && <span className="text-green-400 text-3xl">&#10003;</span>}
                {upFile.status === 'error' && <span title={upFile.error} className="text-red-500 text-3xl font-bold cursor-help">!</span>}
                {(upFile.status === 'queued' || upFile.status === 'uploading') && <div className="w-8 h-8 border-4 border-dashed border-white rounded-full animate-spin"></div>}
              </div>
              <button onClick={() => removeImage(upFile.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500" aria-label="Remove image">
                &#x2715;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
