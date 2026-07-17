import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft } from 'lucide-react';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg px-4 relative overflow-hidden transition-colors duration-300">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-primary-300/10 dark:bg-primary-500/5 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-green-300/10 dark:bg-green-500/5 blur-3xl" />
      
      <div className="max-w-md w-full glass p-10 rounded-3xl shadow-xl text-center border border-gray-100 dark:border-dark-border relative z-10">
        <h1 className="text-9xl font-extrabold text-primary-500 font-sans tracking-tight mb-2 drop-shadow-md">
          404
        </h1>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Page Not Found
        </h2>
        
        <p className="text-gray-600 dark:text-dark-muted mb-8 text-sm leading-relaxed">
          The page you are looking for doesn't exist, has been removed, or has been temporarily renamed.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-medium text-white bg-primary-500 hover:bg-primary-600 shadow-glow hover:shadow-lg transition-all duration-300 transform active:scale-95"
          >
            <ShoppingBag size={18} />
            Shop Groceries
          </button>
          
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-medium text-gray-700 dark:text-dark-text bg-white dark:bg-dark-card hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-dark-border transition-all duration-300 transform active:scale-95"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};
export default NotFound;
