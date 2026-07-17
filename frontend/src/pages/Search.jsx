import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Search as SearchIcon, Filter, AlertCircle } from 'lucide-react';
import { fetchProducts, setFilter } from '../store/productSlice.js';
import ProductCard from '../components/ProductCard.jsx';
import { ProductCardSkeleton } from '../components/LoadingSkeleton.jsx';

export const Search = () => {
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  
  const queryParam = searchParams.get('q') || '';
  const { products, filters, pagination, loading } = useSelector((state) => state.products);

  const [inputVal, setInputVal] = useState(queryParam);

  // Trigger search fetch whenever search keyword changes
  useEffect(() => {
    setInputVal(queryParam);
    const params = {
      search: queryParam,
      page: pagination.page,
      limit: pagination.limit,
      sortBy: filters.sortBy
    };
    dispatch(fetchProducts(params));
  }, [dispatch, queryParam, pagination.page, pagination.limit, filters.sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (inputVal.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(inputVal.trim())}`;
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-16">
      
      {/* Search Header Form */}
      <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 rounded-3xl shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-2xl mx-auto">
          <input
            type="text"
            placeholder="Search for fresh grocery items..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="w-full py-3.5 pl-12 pr-4 text-sm rounded-2xl border border-gray-200 dark:border-dark-border bg-gray-50/50 dark:bg-slate-900/30 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-inner"
          />
          <SearchIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <button
            type="submit"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 py-1.5 px-4 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            Search
          </button>
        </form>
      </div>

      {/* Main Results Listing */}
      <div className="flex flex-col gap-4">
        <h2 className="text-base text-gray-500 dark:text-dark-muted font-bold">
          {queryParam 
            ? `Showing search results for "${queryParam}"` 
            : 'Explore all catalog items'}
        </h2>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-dark-card rounded-3xl border border-gray-100 dark:border-dark-border flex flex-col items-center justify-center p-8">
            <AlertCircle size={40} className="text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              No Items Found
            </h3>
            <p className="text-sm text-gray-500 dark:text-dark-muted max-w-sm">
              We couldn't find any products matching "{queryParam}". Try checking spelling or using basic keywords.
            </p>
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
export default Search;
