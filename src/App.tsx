
import React, { createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, Outlet, useLocation } from 'react-router-dom';
import { useMemorials } from './hooks/useMemorials';
import { Memorial, CreatedMemorialInfo, MemorialUpdatePayload } from './types';
import StartPage from './pages/StartPage';
import CreatePage from './pages/CreatePage';
import MemoryPage from './pages/MemoryPage';
import ListPage from './pages/ListPage';
import RecoverPage from './pages/RecoverPage';
import { HeartIcon } from './components/ui';


interface MemorialsContextType {
  loading: boolean;
  addMemorial: (memorialData: { petName: string; shortMessage: string; memorialContent: string; images: string[]; slug?: string; }) => Promise<{ success: boolean; error?: string; slug?: string }>;
  getMemorialBySlug: (slug: string) => Promise<Omit<Memorial, 'editKey'> | undefined>;
  deleteMemorial: (slug: string, editKey: string) => Promise<{ success: boolean; error?: string }>;
  updateMemorial: (slug: string, editKey: string, data: MemorialUpdatePayload) => Promise<{ success: boolean; error?: string; }>;
  generateSlug: (petName: string) => string;
  getAllSlugs: () => string[];
  getCreatedMemorials: () => CreatedMemorialInfo[];
  removeVisitedSlug: (slug: string) => void;
}

const MemorialsContext = createContext<MemorialsContextType | undefined>(undefined);

export const useMemorialsContext = () => {
  const context = useContext(MemorialsContext);
  if (!context) {
    throw new Error('useMemorialsContext must be used within a MemorialsProvider');
  }
  return context;
};

const MemorialsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const memorialsData = useMemorials();
  return (
    <MemorialsContext.Provider value={memorialsData}>
      {children}
    </MemorialsContext.Provider>
  );
};

const Header = () => {
    const location = useLocation();
    const isHomePage = location.pathname === '/';

    return (
        <header className={`fixed top-0 left-0 right-0 z-10 transition-all duration-300 ${isHomePage ? 'bg-transparent' : 'bg-white/50 backdrop-blur-sm shadow-sm'}`}>
            <nav className="container mx-auto px-6 py-3 flex justify-center items-center">
                <Link to="/" className="flex items-center space-x-3 text-slate-700 group">
                    <HeartIcon className="w-6 h-6 text-pink-400 transition-transform duration-300 group-hover:scale-110" />
                    <span className="font-serif text-xl font-bold group-hover:text-pink-500 transition-colors">Pet Memorials</span>
                    <HeartIcon className="w-6 h-6 text-pink-400 transition-transform duration-300 group-hover:scale-110" />
                </Link>
            </nav>
        </header>
    );
};

const AppLayout: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow">
                <Outlet />
            </main>
            <footer className="text-center py-4 text-slate-500 text-sm">
                <p>Created with love for our furry friends. 🕊️</p>
            </footer>
        </div>
    );
};

const NotFoundPage = () => (
    <div className="min-h-screen flex items-center justify-center text-center px-4 pt-20">
        <div>
            <h1 className="text-4xl font-bold font-serif text-slate-700">404 - Page Not Found</h1>
            <p className="mt-4 text-lg text-slate-600">The page you are looking for does not exist.</p>
            <Link to="/" className="mt-8 inline-block bg-pink-400 text-white font-bold py-2 px-4 rounded-full hover:bg-pink-500 transition-colors duration-300">
                Return Home
            </Link>
        </div>
    </div>
);

function App() {
  return (
    <MemorialsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<StartPage />} />
            <Route path="create" element={<CreatePage />} />
            <Route path="edit/:slug" element={<CreatePage />} />
            <Route path="memory/:slug" element={<MemoryPage />} />
            <Route path="list" element={<ListPage />} />
            <Route path="recover" element={<RecoverPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </MemorialsProvider>
  );
}

export default App;
