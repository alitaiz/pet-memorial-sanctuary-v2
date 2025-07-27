
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMemorialsContext } from '../App';
import { Memorial } from '../types';
import { Carousel } from '../components/Carousel';
import { PawPrintIcon } from '../components/ui';

const MemoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { getMemorialBySlug, loading, getCreatedMemorials } = useMemorialsContext();
  const navigate = useNavigate();
  const [memorial, setMemorial] = useState<Omit<Memorial, 'editKey'> | null>(null);
  const [error, setError] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [recoverCode, setRecoverCode] = useState('');
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    let isMounted = true;
    // When slug changes, reset the page state to show loading indicator
    setMemorial(null);
    setError('');
    
    const fetchMemorial = async () => {
      if (slug) {
        const createdMemorials = getCreatedMemorials();
        const ownerInfo = createdMemorials.find(m => m.slug === slug);
        if (isMounted) {
          setIsOwner(!!ownerInfo);
        }

        const foundMemorial = await getMemorialBySlug(slug);
        if (isMounted) {
          if (foundMemorial) {
            setMemorial(foundMemorial);
          } else {
            setError(`Could not find a memorial with code "${slug}".`);
            setTimeout(() => navigate(`/recover?notfound=true&slug=${slug}`), 2500);
          }
        }
      }
    };

    fetchMemorial();
    return () => { isMounted = false; };
  }, [slug, getMemorialBySlug, navigate, getCreatedMemorials]);

  // Lightbox escape key handler
  useEffect(() => {
    if (fullscreenImage) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closeFullscreen();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreenImage]);
  
  const handleRecoverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = recoverCode.trim();
    if (trimmedCode) {
        // Navigate to the new memorial page. This will trigger the useEffect above.
        navigate(`/memory/${trimmedCode}`);
        setRecoverCode('');
    }
  };
  
  const handleImageClick = (imageUrl: string) => {
    setFullscreenImage(imageUrl);
    // Use a microtask to ensure the element is rendered before we transition opacity
    queueMicrotask(() => setShowOverlay(true));
  };

  const closeFullscreen = () => {
    setShowOverlay(false);
    setTimeout(() => {
      setFullscreenImage(null);
    }, 300); // Duration of the fade-out transition
  };

  if (loading && !memorial) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-light-beige text-center p-4">
            <PawPrintIcon className="w-16 h-16 text-slate-400 animate-pulse" />
            <p className="mt-4 font-serif text-slate-600 text-xl">Looking for this memory...</p>
        </div>
    );
  }
  
  if (error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-light-beige text-center p-4">
            <h2 className="text-2xl font-serif text-red-500">{error}</h2>
            <p className="mt-2 text-slate-600">You will be redirected to the recovery page shortly.</p>
        </div>
      )
  }

  if (!memorial) {
    // This state is briefly hit before loading starts or if slug is missing.
    return null; 
  }

  const coverImage = "https://images.unsplash.com/photo-1529601698370-496585414153?auto=format&fit=crop&w=1920&q=80";

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative h-80 md:h-96 w-full flex items-center justify-center text-white text-center">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${coverImage})` }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent"></div>
        <div className="relative z-10 p-4">
          <h1 className="text-5xl md:text-7xl font-bold font-serif drop-shadow-lg">{memorial.petName}</h1>
          <p className="mt-4 text-xl font-serif italic drop-shadow-md">"{memorial.shortMessage || 'Forever loved, never forgotten.'}"</p>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto max-w-3xl p-6 md:p-8 -mt-20 relative z-10">
        <div className="bg-white p-6 md:p-10 rounded-2xl shadow-2xl relative" style={{ paddingTop: memorial.avatar ? '6rem' : '2.5rem' }}>
            {memorial.avatar && (
              <img
                src={memorial.avatar}
                alt={`${memorial.petName}'s avatar`}
                className="absolute left-1/2 -translate-x-1/2 -top-16 w-32 h-32 rounded-full object-cover border-8 border-white bg-white shadow-lg"
              />
            )}
          <div className="text-center mb-8">
            <p className="mt-2 text-sm text-slate-500 font-serif">Memorial Code: <span className="font-bold text-slate-700">{memorial.slug}</span></p>
            <p className="mt-1 text-xs text-slate-400">Remember this code for easy access from any device.</p>
            {isOwner && (
              <Link to={`/edit/${memorial.slug}`} className="mt-4 inline-block bg-gray-200 text-slate-700 text-xs font-bold py-1 px-3 rounded-full hover:bg-gray-300 transition-colors">
                  Edit Memorial
              </Link>
            )}
          </div>

          <div className="prose prose-lg max-w-none text-slate-700 whitespace-pre-wrap font-sans text-center">
            <p>{memorial.memorialContent}</p>
          </div>

          {memorial.images && memorial.images.length > 0 && (
            <div className="mt-12">
              <h3 className="text-2xl font-serif font-bold text-center text-slate-800 mb-6">Cherished Moments</h3>
              <Carousel images={memorial.images} onImageClick={handleImageClick} />
            </div>
          )}
        </div>
      </div>
      
      <div className="text-center py-12 px-4 flex flex-col items-center space-y-4">
        <Link to="/create" className="bg-blue-400 text-white font-bold py-3 px-6 rounded-full hover:bg-blue-500 transition-colors duration-300">
          Create Another Memorial Page
        </Link>
        <a href="https://bobicare.com" target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white font-bold py-3 px-6 rounded-full hover:bg-green-600 transition-colors duration-300">
          Visit Our Store on Amazon
        </a>
        
        {/* Search Form */}
        <div className="mt-8 max-w-md w-full">
            <div className="bg-powder-pink/60 p-6 rounded-2xl shadow-lg">
                <form onSubmit={handleRecoverSubmit}>
                    <label htmlFor="recover-code-memory" className="font-serif text-slate-700">Have a memorial code?</label>
                    <div className="mt-2 flex space-x-2">
                        <input
                            id="recover-code-memory"
                            type="text"
                            value={recoverCode}
                            onChange={(e) => setRecoverCode(e.target.value)}
                            placeholder="e.g., lucky-88"
                            className="w-full px-4 py-2 border border-slate-300 rounded-full focus:ring-pink-400 focus:border-pink-400"
                            aria-label="Memorial Code Input"
                        />
                        <button type="submit" aria-label="Find memorial" className="bg-blue-300 text-white p-3 rounded-full hover:bg-blue-400 transition-colors shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </button>
                    </div>
                </form>
            </div>
        </div>
      </div>
      
      {/* Fullscreen Image Overlay */}
      {fullscreenImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen image view"
          className={`fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 transition-opacity duration-300 ${showOverlay ? 'opacity-100' : 'opacity-0'}`}
          onClick={closeFullscreen}
        >
          <img
            src={fullscreenImage}
            alt="Fullscreen view of cherished moment"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
          />
          <button
            onClick={closeFullscreen}
            className="absolute top-4 right-4 text-white text-5xl font-light hover:text-gray-300 transition-colors leading-none"
            aria-label="Close fullscreen view"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
};

export default MemoryPage;
