
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMemorialsContext } from '../App';
import { Memorial } from '../types';
import { Carousel } from '../components/Carousel';
import { HeartIcon, PawPrintIcon } from '../components/ui';

const MemoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { getMemorialBySlug, loading } = useMemorialsContext();
  const navigate = useNavigate();
  const [memorial, setMemorial] = useState<Memorial | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchMemorial = async () => {
      if (slug) {
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
  }, [slug, getMemorialBySlug, navigate]);

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

  const coverImage = memorial.images && memorial.images.length > 0 ? memorial.images[0] : 'https://picsum.photos/1200/800?grayscale';

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
      <div className="container mx-auto max-w-3xl p-6 md:p-8 -mt-16 relative z-10">
        <div className="bg-white p-6 md:p-10 rounded-2xl shadow-2xl">
          <div className="text-center mb-8">
            <HeartIcon className="w-8 h-8 mx-auto text-pink-400" />
            <p className="mt-2 text-sm text-slate-500 font-serif">Memorial Code: <span className="font-bold text-slate-700">{memorial.slug}</span></p>
            <p className="mt-1 text-xs text-slate-400">Remember this code for easy access from any device.</p>
          </div>

          <div className="prose prose-lg max-w-none text-slate-700 whitespace-pre-wrap font-sans">
            <p>{memorial.memorialContent}</p>
          </div>

          {memorial.images && memorial.images.length > 0 && (
            <div className="mt-12">
              <h3 className="text-2xl font-serif font-bold text-center text-slate-800 mb-6">Cherished Moments</h3>
              <Carousel images={memorial.images} />
            </div>
          )}
        </div>
      </div>
      
      <div className="text-center py-12 px-4">
        <Link to="/create" className="bg-blue-400 text-white font-bold py-3 px-6 rounded-full hover:bg-blue-500 transition-colors duration-300">
          Create Another Memorial Page
        </Link>
      </div>
    </div>
  );
};

export default MemoryPage;
