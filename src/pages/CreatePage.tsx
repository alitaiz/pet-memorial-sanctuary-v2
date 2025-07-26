
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMemorialsContext } from '../App';
import { ImageUploader } from '../components/ImageUploader';
import { LoadingSpinner, Toast, SparkleIcon } from '../components/ui';
import { MemorialUpdatePayload } from '../types';
import { API_BASE_URL } from '../config';

const MAX_TOTAL_IMAGES = 5;

const CreatePage = () => {
  const { slug: editSlug } = useParams<{ slug: string }>();
  const isEditMode = !!editSlug;

  const { addMemorial, getMemorialBySlug, updateMemorial, getCreatedMemorials } = useMemorialsContext();
  const navigate = useNavigate();

  const [petName, setPetName] = useState('');
  const [slug, setSlug] = useState('');
  const [shortMessage, setShortMessage] = useState('');
  const [memorialContent, setMemorialContent] = useState('');
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [editKey, setEditKey] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState('');

  const maxNewImages = MAX_TOTAL_IMAGES - existingImages.length;

  useEffect(() => {
      if (isEditMode && editSlug) {
          setIsLoading(true);
          const loadMemorialForEdit = async () => {
              const memorial = await getMemorialBySlug(editSlug);
              const created = getCreatedMemorials();
              const ownerInfo = created.find(m => m.slug === editSlug);

              if (memorial && ownerInfo) {
                  setPetName(memorial.petName);
                  setShortMessage(memorial.shortMessage);
                  setMemorialContent(memorial.memorialContent);
                  setExistingImages(memorial.images);
                  setSlug(memorial.slug);
                  setEditKey(ownerInfo.editKey);
              } else {
                  setError("You don't have permission to edit this memorial or it doesn't exist.");
                  setTimeout(() => navigate('/list'), 2000);
              }
              setIsLoading(false);
          };
          loadMemorialForEdit();
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, editSlug, navigate]);

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];
    
    const uploadPromises = files.map(async (file) => {
        const presignResponse = await fetch(`${API_BASE_URL}/api/upload-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name, contentType: file.type }),
        });

        if (!presignResponse.ok) {
            const errorData = await presignResponse.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to get upload URL for ${file.name}`);
        }
        const { uploadUrl, publicUrl } = await presignResponse.json();

        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
        });

        if (!uploadResponse.ok) {
            throw new Error(`Upload failed for ${file.name}.`);
        }

        return publicUrl;
    });

    return Promise.all(uploadPromises);
  };

  const handleRewrite = async () => {
    if (!memorialContent.trim()) {
        setRewriteError('Please write a memory first before using AI assist.');
        return;
    }
    setIsRewriting(true);
    setRewriteError('');
    setError('');

    try {
        const response = await fetch(`/api/rewrite-tribute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: memorialContent }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'The AI assistant failed to respond. Please try again later.');
        }

        const { rewrittenText } = await response.json();
        setMemorialContent(rewrittenText);

    } catch (err) {
        console.error("AI rewrite failed:", err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setRewriteError(errorMessage);
    } finally {
        setIsRewriting(false);
    }
  };
  
  const handleRemoveExistingImage = (urlToRemove: string) => {
    setExistingImages(current => current.filter(url => url !== urlToRemove));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!petName.trim()) {
      setError("Pet's name is required.");
      return;
    }

    setIsLoading(true);

    if (isEditMode) {
      // --- EDIT MODE ---
      if (!editSlug || !editKey) {
        setError('Could not update memorial. Key information is missing.');
        setIsLoading(false);
        return;
      }
      try {
        const newImageUrls = await uploadFiles(stagedFiles);
        const finalImageUrls = [...existingImages, ...newImageUrls];
        const updatedData: MemorialUpdatePayload = {
          petName,
          shortMessage,
          memorialContent,
          images: finalImageUrls,
        };
        const result = await updateMemorial(editSlug, editKey, updatedData);
        if (result.success) {
          setShowToast(true);
          setTimeout(() => navigate(`/memory/${editSlug}`), 2000);
        } else {
          setError(result.error || 'An unknown error occurred during update.');
          setIsLoading(false);
        }
      } catch (uploadError) {
        console.error("Upload process failed during edit:", uploadError);
        setError(uploadError instanceof Error ? uploadError.message : "A critical error occurred during file upload.");
        setIsLoading(false);
      }
    } else {
      // --- CREATE MODE ---
      // Step 1: Create the memorial record without images to reserve the slug.
      const createResult = await addMemorial({
        petName,
        shortMessage,
        memorialContent,
        slug: slug.trim(),
        images: [], // CRITICAL: Initially create with no images.
      });

      // Step 2: Handle creation failure (e.g., duplicate slug).
      // If it fails, we stop here. No images were uploaded and the UI state is preserved.
      if (!createResult.success || !createResult.slug || !createResult.editKey) {
        setError(createResult.error || 'Failed to create memorial. The code might be taken.');
        setIsLoading(false);
        return;
      }

      const newSlug = createResult.slug;
      const newEditKey = createResult.editKey;

      // Step 3: If creation succeeded and there are images, upload them and update the record.
      if (stagedFiles.length > 0) {
        try {
          const newImageUrls = await uploadFiles(stagedFiles);

          const updatePayload: MemorialUpdatePayload = {
            petName,
            shortMessage,
            memorialContent,
            images: newImageUrls,
          };
          const updateResult = await updateMemorial(newSlug, newEditKey, updatePayload);
          
          if (!updateResult.success) {
            // Edge case: Memorial created, but photos failed to attach. Guide the user.
            setError(`Memorial created, but we couldn't add the photos. You can add them later by editing.`);
            setIsLoading(false);
            setTimeout(() => navigate(`/memory/${newSlug}`), 3500); // Navigate after a delay to allow reading the error.
            return;
          }
        } catch (uploadError) {
          const errorMessage = uploadError instanceof Error ? uploadError.message : "Could not upload photos.";
          setError(`Memorial created, but photo upload failed: ${errorMessage}. You can add photos later by editing.`);
          setIsLoading(false);
          setTimeout(() => navigate(`/memory/${newSlug}`), 3500);
          return;
        }
      }

      // Step 4: If all steps were successful, show toast and navigate.
      setShowToast(true);
      setTimeout(() => navigate(`/memory/${newSlug}`), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-baby-blue pt-24 pb-12">
      <Toast message={isEditMode ? `${petName}'s memorial updated!` : `${petName}'s memorial is ready!`} show={showToast} onDismiss={() => setShowToast(false)} />
      <div className="container mx-auto max-w-2xl px-4">
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-xl">
          <h1 className="text-3xl font-bold font-serif text-center text-slate-800">{isEditMode ? 'Edit Memorial' : 'Create a Memorial'}</h1>
          <p className="text-center text-slate-600 mt-2">{isEditMode ? 'Update the details for this tribute.' : 'Fill in the details to build a beautiful tribute.'}</p>

          {isLoading && !showToast ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div>
                <label htmlFor="petName" className="block text-sm font-medium text-slate-600 font-serif">Pet's Name *</label>
                <input type="text" id="petName" value={petName} onChange={e => setPetName(e.target.value)} className="mt-1 block w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500" required />
              </div>
              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-slate-600 font-serif">Custom Memorial Code</label>
                <input type="text" id="slug" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder={isEditMode ? '' : "e.g., milo-the-brave (auto-generated if blank)"} className="mt-1 block w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 disabled:bg-slate-100 disabled:text-slate-500" disabled={isEditMode} />
              </div>
              <div>
                <label htmlFor="shortMessage" className="block text-sm font-medium text-slate-600 font-serif">Short Message (e.g., "Forever in our hearts")</label>
                <input type="text" id="shortMessage" value={shortMessage} onChange={e => setShortMessage(e.target.value)} className="mt-1 block w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500" />
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <label htmlFor="memorialContent" className="block text-sm font-medium text-slate-600 font-serif">Tribute & Memories</label>
                  <button 
                    type="button" 
                    onClick={handleRewrite}
                    disabled={isRewriting || !memorialContent.trim()}
                    className="flex items-center gap-1.5 text-sm text-pink-500 hover:text-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium px-2 py-1 rounded-md hover:bg-pink-50"
                    aria-label="Rewrite with AI"
                  >
                    <SparkleIcon className={`w-4 h-4 ${isRewriting ? 'animate-spin' : ''}`} />
                    <span>{isRewriting ? 'Thinking...' : 'AI Assist'}</span>
                  </button>
                </div>
                <textarea 
                  id="memorialContent" 
                  value={memorialContent} 
                  onChange={e => { setMemorialContent(e.target.value); setRewriteError(''); }} 
                  rows={6} 
                  className="mt-1 block w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500" 
                  placeholder="Share your favorite stories and what made them so special..."></textarea>
                {rewriteError && <p className="text-red-500 text-xs mt-1">{rewriteError}</p>}
              </div>

              {isEditMode && existingImages.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-slate-600 font-serif">Current Photos (click to remove)</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mt-2 p-2 border border-slate-200 rounded-md">
                        {existingImages.map((imgUrl) => (
                            <div key={imgUrl} className="relative group aspect-square">
                                <img src={imgUrl} alt={`Existing photo`} className="h-full w-full object-cover rounded-md shadow-sm" />
                                <button 
                                    type="button" 
                                    onClick={() => handleRemoveExistingImage(imgUrl)}
                                    className="absolute inset-0 w-full h-full bg-black/50 flex items-center justify-center text-white text-3xl opacity-0 group-hover:opacity-100 transition-opacity rounded-md cursor-pointer"
                                    aria-label="Remove image"
                                >
                                    &#x2715;
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
              )}
              
              {maxNewImages > 0 ? (
                <ImageUploader
                  onFilesChange={setStagedFiles}
                  isSubmitting={isLoading}
                  maxImages={maxNewImages}
                />
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-600 font-serif">Memorial Photos</label>
                  <div className="mt-1 bg-slate-100 p-4 rounded-md text-sm text-slate-600 text-center">
                    You have reached the maximum of {MAX_TOTAL_IMAGES} photos. Remove an existing photo to add a new one.
                  </div>
                </div>
              )}
              
              <div className="bg-blue-100 p-3 rounded-lg text-sm text-blue-800">
                <p><strong>Important:</strong> This memorial can only be permanently deleted or edited from <strong>this device</strong>. Please keep the memorial code safe to share with others.</p>
              </div>
              
              {error && <p className="text-red-500 text-center">{error}</p>}
              
              <button type="submit" className="w-full bg-pink-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-pink-600 transition-colors duration-300 disabled:bg-slate-400" disabled={isLoading}>
                {isLoading ? 'Submitting...' : (isEditMode ? 'Update Memorial' : 'Create Memorial Page')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatePage;
