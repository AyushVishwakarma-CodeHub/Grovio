import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CategorySkeleton } from './LoadingSkeleton.jsx';

export const CategoryList = ({ categories, loading, activeCategory, onCategorySelect }) => {
  const navigate = useNavigate();

  const handleCategoryClick = (category) => {
    if (onCategorySelect) {
      onCategorySelect(category.slug);
    } else {
      navigate(`/category/${category.slug}`);
    }
  };

  if (loading) {
    return (
      <div className="flex gap-6 overflow-x-auto pb-4 justify-start sm:justify-center scrollbar-thin">
        {Array.from({ length: 6 }).map((_, i) => (
          <CategorySkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 justify-start sm:justify-start scrollbar-thin">
      {/* "All" Category Chip */}
      {onCategorySelect && (
        <button
          onClick={() => onCategorySelect('')}
          className="flex flex-col items-center gap-2 group flex-shrink-0"
        >
          <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
            activeCategory === '' 
              ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20 scale-105 shadow-md' 
              : 'border-transparent bg-gray-100 dark:bg-slate-800 group-hover:scale-105'
          }`}>
            <span className={`text-xs sm:text-sm font-bold transition-colors ${
              activeCategory === '' ? 'text-primary-500' : 'text-gray-600 dark:text-dark-text'
            }`}>
              All Items
            </span>
          </div>
          <span className={`text-xs font-bold transition-colors ${
            activeCategory === '' ? 'text-primary-500' : 'text-gray-500 dark:text-dark-muted'
          }`}>
            Shop All
          </span>
        </button>
      )}

      {categories.map((category) => {
        const isSelected = activeCategory === category.slug;
        return (
          <button
            key={category._id}
            onClick={() => handleCategoryClick(category)}
            className="flex flex-col items-center gap-2 group flex-shrink-0 cursor-pointer"
          >
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 transition-all duration-300 ${
              isSelected 
                ? 'border-primary-500 scale-105 shadow-md ring-4 ring-primary-500/10' 
                : 'border-transparent bg-white dark:bg-dark-card group-hover:scale-105 border-gray-100 dark:border-dark-border'
            }`}>
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            <span className={`text-[10px] sm:text-xs font-bold text-center max-w-[96px] line-clamp-2 leading-tight transition-colors ${
              isSelected ? 'text-primary-500' : 'text-gray-500 dark:text-dark-muted group-hover:text-primary-500'
            }`}>
              {category.name}
            </span>
          </button>
        );
      })}
    </div>
  );
};
export default CategoryList;
