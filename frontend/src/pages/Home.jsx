import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { ShoppingBag, Flame, Sparkles, Filter, ChevronDown } from 'lucide-react';
import { 
  fetchProducts, fetchCategories, fetchFeaturedProducts,
  setFilter, resetFilters 
} from '../store/productSlice.js';
import CategoryList from '../components/CategoryList.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { ProductCardSkeleton } from '../components/LoadingSkeleton.jsx';

export const Home = () => {
  const dispatch = useDispatch();
  const { slug } = useParams();
  
  const { 
    products, categories, featuredProducts, filters, pagination, loading, categoriesLoading 
  } = useSelector((state) => state.products);

  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  // Sync URL slug parameter with Redux category filter
  useEffect(() => {
    dispatch(setFilter({ category: slug || '' }));
  }, [dispatch, slug]);

  // Load categories and initial products list on mount
  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchFeaturedProducts());
  }, [dispatch]);

  // Load products whenever active filters or page changes
  useEffect(() => {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      category: filters.category,
      sortBy: filters.sortBy,
      inStock: filters.inStock ? 'true' : undefined
    };
    dispatch(fetchProducts(params));
  }, [dispatch, filters.category, filters.sortBy, filters.inStock, pagination.page, pagination.limit]);

  const handleCategorySelect = (categorySlug) => {
    dispatch(setFilter({ category: categorySlug }));
  };

  const handleSortSelect = (sortVal) => {
    dispatch(setFilter({ sortBy: sortVal }));
    setSortDropdownOpen(false);
  };

  const activeSortLabel = () => {
    switch (filters.sortBy) {
      case 'price_asc': return 'Price: Low to High';
      case 'price_desc': return 'Price: High to Low';
      case 'discount_desc': return 'Best Offers';
      case 'newest':
      default: return 'Newest First';
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-16">
      
      {/* 1. Grovio Brand Tagline Promo Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-green-500 via-primary-500 to-emerald-600 text-white p-6 sm:p-10 shadow-lg select-none">
        {/* Glow Spheres */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -translate-y-12 translate-x-12" />
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-emerald-400/20 rounded-full blur-xl translate-y-12" />
        
        {/* Realistic Grocery Image (Right Side) */}
        <div className="absolute right-0 bottom-0 h-full w-1/2 z-0 hidden sm:flex justify-end items-end pointer-events-none">
          <img 
            src="https://freepngimg.com/thumb/grocery/54006-2-grocery-photos-free-download-image.png" 
            alt="Fresh Groceries" 
            className="h-[140%] object-contain object-bottom origin-bottom-right translate-x-4 translate-y-8 drop-shadow-2xl"
          />
        </div>
        
        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 border border-white/10">
            <Sparkles size={12} />
            Smart Delivery System
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-sans">
            Grovio
          </h1>
          <p className="text-lg sm:text-xl font-medium opacity-90 mt-2 font-sans">
            Fresh Groceries. Delivered Smarter.
          </p>
          <p className="text-xs sm:text-sm mt-4 opacity-80 max-w-sm leading-relaxed">
            Order milk, fresh produce, vegetables, chips and beverages. Get them sorted, packed and delivered in 10 minutes flat.
          </p>
          <div className="flex gap-3 mt-6">
            <div className="bg-white text-primary-600 font-extrabold px-4 py-2 rounded-xl text-xs shadow-sm">
              Use Code: GROVIO50 (Save ₹50)
            </div>
          </div>
        </div>
      </div>

      {/* 2. Shop Categories (Horizontal Circle Chips) */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5 font-sans">
          Shop by Category
        </h2>
        <CategoryList
          categories={categories}
          loading={categoriesLoading}
          activeCategory={filters.category}
          onCategorySelect={handleCategorySelect}
        />
      </div>

      {/* 3. Featured Deals (Only show if there are discounted products) */}
      {featuredProducts.length > 0 && !filters.category && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Flame className="text-red-500 fill-red-500 animate-pulse" size={20} />
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white font-sans">
              Hot Offers & Discounts
            </h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {featuredProducts.slice(0, 5).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </div>
      )}

      {/* 4. Main Products Catalog Grid */}
      <div className="flex flex-col gap-4 border-t border-gray-100 dark:border-slate-800/50 pt-8 mt-4">
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5 font-sans">
            <ShoppingBag size={20} className="text-primary-500" />
            {filters.category 
              ? categories.find(c => c.slug === filters.category)?.name 
              : 'All Grocery Items'}
          </h2>

          {/* Filtering & Sorting Controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            
            {/* Stock filter toggle */}
            <button
              onClick={() => dispatch(setFilter({ inStock: !filters.inStock }))}
              className={`px-3 py-2 text-xs rounded-xl font-semibold border transition-all ${
                filters.inStock 
                  ? 'bg-primary-50 border-primary-200 text-primary-600 dark:bg-primary-950/20 dark:border-primary-900'
                  : 'bg-white border-gray-200 text-gray-600 dark:bg-dark-card dark:border-dark-border dark:text-dark-text hover:bg-gray-50'
              }`}
            >
              In Stock Only
            </button>

            {/* Sorting Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl font-semibold border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-600 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Filter size={12} />
                <span>{activeSortLabel()}</span>
                <ChevronDown size={12} />
              </button>

              {sortDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSortDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border py-1.5 z-20">
                    {['newest', 'price_asc', 'price_desc', 'discount_desc'].map((option) => (
                      <button
                        key={option}
                        onClick={() => handleSortSelect(option)}
                        className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors font-medium ${
                          filters.sortBy === option 
                            ? 'text-primary-500 font-bold' 
                            : 'text-gray-700 dark:text-dark-text'
                        }`}
                      >
                        {option === 'newest' && 'Newest First'}
                        {option === 'price_asc' && 'Price: Low to High'}
                        {option === 'price_desc' && 'Price: High to Low'}
                        {option === 'discount_desc' && 'Best Offers'}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

          </div>
        </div>

        {/* Catalog Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 dark:bg-slate-900/10 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800">
            <p className="text-gray-500 dark:text-dark-muted font-medium text-sm">
              No products found matching these filters.
            </p>
            <button
              onClick={() => dispatch(resetFilters())}
              className="mt-4 text-xs font-bold text-primary-500 hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}

      </div>

    </div>
  );
};
export default Home;
