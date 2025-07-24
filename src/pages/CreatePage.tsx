
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMemorialsContext } from '../App';
import { Memorial } from '../types';
import { ImageUploader, UploadableFile } from '../components/ImageUploader';
import { LoadingSpinner, Toast } from '../components/ui';
import { API_BASE_URL } from '../config';

const ConfigCheckResult: React.FC<{ debugInfo: Record<string, boolean | string> | null, isLoading: boolean }> = ({ debugInfo, isLoading }) => {
    if (isLoading) {
        return <p className="mt-2 text-slate-600">Checking...</p>;
    }
    if (!debugInfo) {
        return null;
    }
    if (debugInfo.error) {
        return <p className="mt-2 text-red-600 font-medium">{String(debugInfo.error)}</p>;
    }
    return (
        <ul className="mt-3 space-y-1 font-mono text-xs">
            {Object.entries(debugInfo).map(([key, value]) => {
                const isSuccess = value === true || (typeof value === 'string' && value !== "NOT_FOUND" && value !== "");
                return (
                    <li key={key} className={`flex items-baseline p-1.5 rounded ${isSuccess ? 'bg-green-50' : 'bg-red-50'}`}>
                        <span className={`mr-2 font-bold w-4 text-center ${isSuccess ? 'text-green-500' : 'text-red-500'}`}>
                            {isSuccess ? '✔' : '✖'}
                        </span>
                        <span className="text-slate-600 min-w-[210px]">{key}</span>
                        <strong className={`ml-2 ${isSuccess ? 'text-green-800' : 'text-red-800'}`}>
                            {String(value)}
                        </strong>
                    </li>
                );
            })}
        </ul>
    );
};


const CreatePage = () => {
  const { addMemorial, generateSlug } = useMemorialsContext();
  const navigate = useNavigate();
  const [petName, setPetName] = useState('');
  const [slug, setSlug] = useState('');
  const [shortMessage, setShortMessage] = useState('');
  const [memorialContent, setMemorialContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [uploadDetails, setUploadDetails] = useState<UploadableFile[]>([]);
  const [debugInfo, setDebugInfo] = useState<Record<string, boolean | string> | null>(null);
  const [isCheckingConfig, setIsCheckingConfig] = useState(false);
  
  const handleRunConfigCheck = async () => {
    setIsCheckingConfig(true);
    setDebugInfo(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/debug-env`);
      if (!response.ok) {
          throw new Error(`The server responded with status ${response.status}. Make sure the worker is deployed.`);
      }
      const data = await response.json();
      setDebugInfo(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred.";
      setDebugInfo({ error: `Failed to fetch config check: ${message}` });
    } finally {
      setIsCheckingConfig(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!petName.trim()) {
      setError('Pet\'s name is required.');
      return;
    }
    if (isUploadingImages) {
        setError('Please wait for images to finish uploading.');
        return;
    }
    setIsLoading(true);

    // Use user-provided slug or generate a new one
    const finalSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') || generateSlug(petName);

    const newMemorial: Memorial = {
      slug: finalSlug,
      petName,
      shortMessage,
      memorialContent,
      images,
      createdAt: new Date().toISOString(),
    };

    const result = await addMemorial(newMemorial);
    
    if (result.success) {
        setShowToast(true);
        // Wait for toast to be visible, then navigate
        setTimeout(() => {
            navigate(`/memory/${finalSlug}`);
        }, 2000);
    } else {
        setError(result.error || 'An unknown error occurred. Please try again.');
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-baby-blue pt-24 pb-12">
      <Toast message={`${petName}'s memorial is ready!`} show={showToast} onDismiss={() => setShowToast(false)} />
      <div className="container mx-auto max-w-2xl px-4">
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-xl">
          <h1 className="text-3xl font-bold font-serif text-center text-slate-800">Create a Memorial</h1>
          <p className="text-center text-slate-600 mt-2">Fill in the details to build a beautiful tribute.</p>

          {isLoading ? (
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
                <label htmlFor="slug" className="block text-sm font-medium text-slate-600 font-serif">Custom Memorial Code (Optional)</label>
                <input type="text" id="slug" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="e.g., milo-the-brave (auto-generated if blank)" className="mt-1 block w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500" />
              </div>
              <div>
                <label htmlFor="shortMessage" className="block text-sm font-medium text-slate-600 font-serif">Short Message (e.g., "Forever in our hearts")</label>
                <input type="text" id="shortMessage" value={shortMessage} onChange={e => setShortMessage(e.target.value)} className="mt-1 block w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500" />
              </div>
              <div>
                <label htmlFor="memorialContent" className="block text-sm font-medium text-slate-600 font-serif">Tribute & Memories</label>
                <textarea id="memorialContent" value={memorialContent} onChange={e => setMemorialContent(e.target.value)} rows={6} className="mt-1 block w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500" placeholder="Share your favorite stories and what made them so special..."></textarea>
              </div>
              
              <ImageUploader 
                onImagesChange={setImages} 
                onUploadingChange={setIsUploadingImages}
                onUploadsChange={setUploadDetails}
              />

              {uploadDetails.length > 0 && (
                  <details className="bg-slate-100 p-3 rounded-lg text-xs text-slate-700 font-sans">
                      <summary className="font-semibold cursor-pointer text-sm">Image Upload Log</summary>
                      <ul className="mt-2 space-y-3">
                          {uploadDetails.map(file => (
                              <li key={file.id} className="break-words border-t border-slate-200 pt-2">
                                  <p><strong>File:</strong> {file.file.name}</p>
                                  <p><strong>Status:</strong> <span className={`font-mono px-1.5 py-0.5 rounded text-xs ${
                                      file.status === 'success' ? 'bg-green-100 text-green-800' :
                                      file.status === 'error' ? 'bg-red-100 text-red-800' :
                                      'bg-blue-100 text-blue-800'
                                  }`}>{file.status}</span></p>
                                  {file.uploadUrl && <p><strong>Presigned URL:</strong> <a href={file.uploadUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Click to view (URL is temporary)</a></p>}
                                  {file.publicUrl && <p><strong>Public URL:</strong> <a href={file.publicUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{file.publicUrl}</a></p>}
                                  {file.error && <p><strong>Error:</strong> <span className="text-red-600 font-medium">{file.error}</span></p>}
                              </li>
                          ))}
                      </ul>
                  </details>
              )}
              
              {/* --- New Debug Tool --- */}
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <h4 className="font-serif font-semibold text-slate-800 mb-2">Backend Configuration Check</h4>
                  <p className="text-sm text-slate-600 mb-3">If image uploads fail, run this check. All items should be green (✔). If any are red (✖), please follow the `DEPLOYMENT.md` guide to set your secrets and redeploy the worker.</p>
                  <button type="button" onClick={handleRunConfigCheck} disabled={isCheckingConfig} className="bg-slate-600 text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-slate-700 disabled:bg-slate-400">
                      {isCheckingConfig ? 'Checking...' : 'Run Check'}
                  </button>
                  <ConfigCheckResult debugInfo={debugInfo} isLoading={isCheckingConfig} />
              </div>


              <div className="bg-blue-100 p-3 rounded-lg text-sm text-blue-800">
                <p><strong>Note:</strong> Your unique memorial code is your key to this page from any device. Keep it safe!</p>
              </div>
              
              {error && <p className="text-red-500 text-center">{error}</p>}
              
              <button type="submit" className="w-full bg-pink-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-pink-600 transition-colors duration-300 disabled:bg-slate-400" disabled={isLoading || isUploadingImages}>
                {isUploadingImages ? 'Uploading images...' : 'Create Memorial Page'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatePage;
