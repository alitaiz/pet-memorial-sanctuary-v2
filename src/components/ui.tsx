
import React from 'react';
import { Link } from 'react-router-dom';
import { Memorial } from '../types';

export const PawPrintIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 12c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zm-7 0c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zm3.5-7c-1.38 0-2.5-1.12-2.5-2.5S10.62 2 12 2s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM12 20c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5S13.38 20 12 20z"/>
    <path d="M16.5 11.5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-9 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM12 5.5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
    <path d="M11.21 15.69c.39.39 1.02.39 1.41 0l2.12-2.12c.39-.39.39-1.02 0-1.41s-1.02-.39-1.41 0L12 13.59l-1.32-1.32c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l2.12 2.12z" transform="translate(0, 3)"/>
  </svg>
);


export const HeartIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
);

export const SparkleIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M10.868 2.884c.321.64.321 1.415 0 2.055l-1.128 2.257a1.437 1.437 0 00-2.483 0L6.132 4.94c-.321-.64-.321-1.415 0-2.055a.75.75 0 011.242 0L8.5 4.5l1.128-2.257a.75.75 0 011.242 0zM8.5 9.75a.75.75 0 01.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75h-.008a.75.75 0 01-.75-.75v-.008a.75.75 0 01.75-.75h.008a.75.75 0 01.75-.75v-.008a.75.75 0 01-.75-.75zM13.632 7.194c.321-.64.97-.838 1.53-.438l1.128.818c.56.4.758 1.19.437 1.75l-1.128 2.257a1.437 1.437 0 01-2.483 0L12.003 9.32a.75.75 0 011.242-.614l.387.278.387-.775zM2.868 7.194c.56.4.362 1.19-.2 1.53l-1.128.818c-.56.401-.758 1.19-.437 1.75l1.128 2.257a1.437 1.437 0 002.483 0L5.997 11.29a.75.75 0 00-1.242-.614l-.387.278-.387-.775c-.321-.64-.97-.838-1.53-.438z" clipRule="evenodd" />
    </svg>
);

export const LoadingSpinner = () => (
    <div className="flex justify-center items-center space-x-2">
        <HeartIcon className="animate-pulse text-pink-400 w-8 h-8" />
        <p className="font-serif text-slate-600">Creating with love...</p>
    </div>
);

export const Toast = ({ message, show, onDismiss }: { message: string, show: boolean, onDismiss: () => void }) => {
    if (!show) return null;
    return (
        <div className="fixed bottom-5 right-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg flex items-center transition-opacity duration-300">
            <span>{message} 🕊️</span>
            <button onClick={onDismiss} className="ml-4 text-xl font-bold">&times;</button>
        </div>
    );
};

interface MemorialCardProps {
  memorial: Memorial;
  onDelete: (slug: string) => void;
}

export const MemorialCard = ({ memorial, onDelete }: MemorialCardProps) => (
  <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl shadow-md flex items-center justify-between transition-transform duration-300 hover:scale-105 hover:shadow-lg">
    <div className="flex items-center space-x-4">
      <div className="bg-powder-pink rounded-full p-2">
        <PawPrintIcon className="w-6 h-6 text-pink-400" />
      </div>
      <div>
        <p className="font-serif font-bold text-slate-800">{memorial.petName}</p>
        <p className="text-sm text-slate-500">Code: {memorial.slug}</p>
      </div>
    </div>
    <div className="flex items-center space-x-2">
      <Link to={`/memory/${memorial.slug}`} className="bg-blue-300 text-white px-3 py-1 rounded-full text-sm font-semibold hover:bg-blue-400 transition-colors">
        Visit
      </Link>
      <button onClick={() => onDelete(memorial.slug)} className="text-red-400 hover:text-red-600 transition-colors p-1">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </button>
    </div>
  </div>
);
