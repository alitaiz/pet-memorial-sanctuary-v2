
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useMemorialsContext } from '../App';
import { MemorialCard, PawPrintIcon } from '../components/ui';
import { MemorialSummary, CreatedMemorialInfo } from '../types';

const ListPage = () => {
  const { getAllSlugs, deleteMemorial, getCreatedMemorials, removeVisitedSlug, getMemorialSummaries } = useMemorialsContext();
  const [memorials, setMemorials] = useState<MemorialSummary[]>([]);
  const [createdMemorials, setCreatedMemorials] = useState<CreatedMemorialInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMemorials = useCallback(async () => {
    setLoading(true);
    setError('');
    const slugs = getAllSlugs();
    const created = getCreatedMemorials();
    setCreatedMemorials(created);

    if (slugs.length > 0) {
      const fetchedMemorials = await getMemorialSummaries(slugs);
      // Sort on the client side after fetching
      setMemorials(fetchedMemorials.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } else {
      setMemorials([]);
    }
    setLoading(false);
  }, [getAllSlugs, getCreatedMemorials, getMemorialSummaries]);

  useEffect(() => {
    loadMemorials();
  }, [loadMemorials]);
  
  const handleDelete = async (slug: string) => {
    setError('');
    const ownedMemorial = createdMemorials.find(cm => cm.slug === slug);

    if (ownedMemorial) {
      // User is the owner: permanent deletion
      if (window.confirm("Are you sure you want to permanently delete this memorial? This will remove all data and photos forever and cannot be undone.")) {
        const result = await deleteMemorial(slug, ownedMemorial.editKey);
        if (result.success) {
          // Refresh the list from source of truth
          loadMemorials();
        } else {
          setError(result.error || 'An unknown error occurred while deleting.');
        }
      }
    } else {
      // User is a visitor: remove from local list
      if (window.confirm("Are you sure you want to remove this memorial from your list? This will not delete the original page.")) {
        removeVisitedSlug(slug);
        // Refresh the list from source of truth
        loadMemorials();
      }
    }
  };

  return (
    <div className="min-h-screen bg-baby-blue pt-24 pb-12">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl shadow-xl">
          <h1 className="text-3xl font-bold font-serif text-center text-slate-800">Your Memorials</h1>
          <p className="text-center text-slate-600 mt-2">A list of memorials you have created or visited.</p>
          
          {error && <p className="text-red-500 text-center mt-4 p-2 bg-red-100 rounded-md">{error}</p>}

          {loading ? (
             <div className="flex justify-center items-center py-10">
                <PawPrintIcon className="animate-spin w-10 h-10 text-pink-400"/>
                <p className="ml-4 font-serif text-slate-600">Loading your memories...</p>
             </div>
          ) : memorials.length > 0 ? (
            <div className="mt-8 space-y-4">
              {memorials.map(memorial => {
                const isOwner = createdMemorials.some(cm => cm.slug === memorial.slug);
                return <MemorialCard key={memorial.slug} memorial={memorial} onDelete={handleDelete} isOwner={isOwner} />
              })}
            </div>
          ) : (
            <p className="text-center mt-8 text-slate-500">You haven't created or visited any memorials on this device yet.</p>
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
