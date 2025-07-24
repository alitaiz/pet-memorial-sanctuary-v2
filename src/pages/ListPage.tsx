import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMemorialsContext } from '../App';
import { MemorialCard, PawPrintIcon } from '../components/ui';
import { Memorial } from '../types';

const ListPage = () => {
  const { getCreatedSlugs, getMemorialBySlug, deleteMemorial } = useMemorialsContext();
  const [memorials, setMemorials] = useState<Memorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMemorials = async () => {
      setLoading(true);
      setError('');
      const slugs = getCreatedSlugs();
      if (slugs.length > 0) {
        // Fetch all memorials in parallel
        const promises = slugs.map(slug => getMemorialBySlug(slug));
        const results = await Promise.all(promises);
        // Filter out any undefined results (if a memorial fetch failed)
        const fetchedMemorials = results.filter((m): m is Memorial => m !== undefined);
        setMemorials(fetchedMemorials.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
      setLoading(false);
    };

    fetchMemorials();
  // We want this to re-run if the context functions change, though they shouldn't.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const handleDelete = async (slug: string) => {
    setError('');
    // Add a confirmation dialog for a destructive action
    if (window.confirm("Are you sure you want to permanently delete this memorial? This will remove all data and photos forever and cannot be undone.")) {
      const result = await deleteMemorial(slug);
      if (result.success) {
        setMemorials(prev => prev.filter(m => m.slug !== slug));
      } else {
        setError(result.error || 'An unknown error occurred while deleting.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-baby-blue pt-24 pb-12">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl shadow-xl">
          <h1 className="text-3xl font-bold font-serif text-center text-slate-800">Your Memorials</h1>
          <p className="text-center text-slate-600 mt-2">These are the memorials you've created on this device.</p>
          
          {error && <p className="text-red-500 text-center mt-4 p-2 bg-red-100 rounded-md">{error}</p>}

          {loading ? (
             <div className="flex justify-center items-center py-10">
                <PawPrintIcon className="animate-spin w-10 h-10 text-pink-400"/>
                <p className="ml-4 font-serif text-slate-600">Loading your memories...</p>
             </div>
          ) : memorials.length > 0 ? (
            <div className="mt-8 space-y-4">
              {memorials.map(memorial => (
                <MemorialCard key={memorial.slug} memorial={memorial} onDelete={handleDelete} />
              ))}
            </div>
          ) : (
            <p className="text-center mt-8 text-slate-500">You haven't created any memorials on this device yet.</p>
          )}

          <div className="mt-8 text-center">
            <Link to="/create" className="bg-pink-400 text-white font-bold py-3 px-6 rounded-full hover:bg-pink-500 transition-transform duration-300 inline-block transform hover:scale-105">
              ➕ Create a New Memorial
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListPage;
