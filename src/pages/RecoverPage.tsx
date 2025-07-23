
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMemorialsContext } from '../App';

const RecoverPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getMemorialBySlug } = useMemorialsContext();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const notfound = searchParams.get('notfound');
    const slug = searchParams.get('slug');
    if (notfound) {
      if (slug) {
        setError(`We couldn't find a memorial with the code "${slug}". Please check it or create a new one.`);
      } else {
        setError("We couldn't find that memory. Please check the code or create a new one.");
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setError('Please enter a memorial code.');
      return;
    }

    setIsLoading(true);
    const memorial = await getMemorialBySlug(trimmedCode);
    setIsLoading(false);

    if (memorial) {
      navigate(`/memory/${trimmedCode}`);
    } else {
      setError(`Memorial with code "${trimmedCode}" not found. Please check the code and try again.`);
    }
  };

  return (
    <div className="min-h-screen bg-light-beige flex items-center justify-center pt-20 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl shadow-xl text-center">
          <h1 className="text-2xl font-bold font-serif text-slate-800">Find a Memorial</h1>
          <p className="text-slate-600 mt-2">Enter the memorial code to revisit a tribute.</p>
          <form onSubmit={handleSubmit} className="mt-6">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter code, e.g., lucky-88"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-pink-500 focus:border-pink-500"
              aria-label="Memorial Code"
              disabled={isLoading}
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <button type="submit" className="w-full mt-4 bg-blue-400 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-500 transition-colors duration-300 disabled:bg-slate-400" disabled={isLoading}>
              {isLoading ? 'Searching...' : 'Find Page'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RecoverPage;
