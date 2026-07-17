import React from 'react';

/**
 * Generic Shimmering Div
 */
export const Skeleton = ({ className }) => {
  return (
    <div className={`bg-gray-200 dark:bg-slate-800 shimmer rounded-xl ${className}`} />
  );
};

/**
 * Circle Category Skeleton
 */
export const CategorySkeleton = () => {
  return (
    <div className="flex flex-col items-center gap-3">
      <Skeleton className="w-20 h-20 rounded-full" />
      <Skeleton className="w-16 h-4" />
    </div>
  );
};

/**
 * Product Card Grid Skeleton
 */
export const ProductCardSkeleton = () => {
  return (
    <div className="glass p-4 rounded-3xl border border-gray-100 dark:border-dark-border flex flex-col justify-between h-[310px] w-full">
      <div className="flex flex-col gap-3">
        {/* Image Box */}
        <Skeleton className="w-full h-36 rounded-2xl" />
        
        {/* Title */}
        <Skeleton className="w-3/4 h-5" />
        
        {/* Brand/Unit */}
        <Skeleton className="w-1/2 h-3" />
      </div>
      
      <div className="flex items-center justify-between mt-4">
        {/* Price info */}
        <div className="flex flex-col gap-1 w-1/3">
          <Skeleton className="w-full h-5" />
          <Skeleton className="w-1/2 h-3" />
        </div>
        {/* Add button */}
        <Skeleton className="w-20 h-9 rounded-2xl" />
      </div>
    </div>
  );
};

/**
 * Full Page Loader Spinner
 */
export const PageLoader = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-50/70 dark:bg-dark-bg/70 backdrop-blur-md">
      <div className="relative w-16 h-16">
        {/* Outermost Ring */}
        <div className="absolute inset-0 rounded-full border-4 border-primary-500/10 border-t-primary-500 animate-spin" />
        {/* Inner Pulse */}
        <div className="absolute inset-2 rounded-full bg-primary-100 dark:bg-primary-950/20 flex items-center justify-center animate-pulse">
          <div className="w-4 h-4 rounded-full bg-primary-500" />
        </div>
      </div>
      <h3 className="mt-4 font-sans font-semibold text-gray-800 dark:text-white tracking-wide">
        Grovio
      </h3>
      <p className="text-xs text-gray-500 dark:text-dark-muted mt-1">
        Delivering Smarter...
      </p>
    </div>
  );
};
