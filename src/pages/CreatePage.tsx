
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMemorialsContext } from '../App';
import { Memorial } from '../types';
import { ImageUploader } from '../components/ImageUploader';
import { LoadingSpinner, Toast, SparkleIcon } from '../components/ui';
import { GoogleGenAI } from '@google/genai';

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
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState('');

  const handleRewrite = async () => {
    if (!memorialContent.trim()) {
        setRewriteError('Please write a memory first before using AI assist.');
        return;
    }
    setIsRewriting(true);
    setRewriteError('');
    setError('');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const prompt = `Rewrite the following tribute for a beloved pet to make it more heartfelt and eloquent. Keep the original sentiment and key memories. Return only the rewritten text, without any additional commentary. Here is the original text:\n\n"${memorialContent}"`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: "You are a compassionate assistant helping someone write a beautiful memorial for their pet. You refine their words to be more poetic and touching while preserving the core message.",
            }
        });
        
        const rewrittenText = response.text.trim().replace(/^"|"$/g, '');
        setMemorialContent(rewrittenText);

    } catch (err) {
        console.error("AI rewrite failed:", err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setRewriteError(`AI assistant failed. ${errorMessage}. This feature requires an API key to be configured.`);
    } finally {
        setIsRewriting(false);
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
              
              <ImageUploader 
                onImagesChange={setImages} 
                onUploadingChange={setIsUploadingImages}
              />
              
              <div className="bg-blue-100 p-3 rounded-lg text-sm text-blue-800">
                <p><strong>Note:</strong> Your unique memorial code is your key to this page from any device. Keep it safe!</p>
              </div>
              
              {error && <p className="text-red-500 text-center">{error}</p>}
              
              <button type="submit" className="w-full bg-pink-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-pink-600 transition-colors duration-300 disabled:bg-slate-400" disabled={isLoading || isUploadingImages}>
                {isUploadingImages ? 'Optimizing & Uploading...' : 'Create Memorial Page'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatePage;
