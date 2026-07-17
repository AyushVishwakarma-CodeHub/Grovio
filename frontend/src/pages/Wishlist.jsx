import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Heart, ShoppingCart, Trash2, ArrowLeft, PackageOpen } from 'lucide-react';
import {
  fetchWishlist,
  clearWishlistAsync,
  toggleWishlistItem,
  selectWishlistItems
} from '../store/wishlistSlice.js';
import { guestAddToCart, syncAddToCart } from '../store/cartSlice.js';
import { toast } from 'react-toastify';

export const Wishlist = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const items = useSelector(selectWishlistItems);
  const { loading } = useSelector((state) => state.wishlist);

  useEffect(() => {
    if (isAuthenticated) dispatch(fetchWishlist());
    else navigate('/login');
  }, [isAuthenticated]);

  const handleRemove = async (productId, name) => {
    await dispatch(toggleWishlistItem(productId));
    await dispatch(fetchWishlist()); // refresh full objects
    toast.info(`${name} removed from wishlist`);
  };

  const handleMoveToCart = (product) => {
    if (isAuthenticated) {
      dispatch(syncAddToCart({ productId: product._id, quantity: 1 }));
    } else {
      dispatch(guestAddToCart({ product, quantity: 1 }));
    }
    toast.success(`${product.name} added to cart!`);
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear your entire wishlist?')) return;
    await dispatch(clearWishlistAsync());
    toast.info('Wishlist cleared');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <Heart size={24} className="text-red-500 fill-red-500" />
              My Wishlist
            </h1>
            <p className="text-sm text-gray-500 dark:text-dark-muted mt-0.5">
              {items.length} {items.length === 1 ? 'item' : 'items'} saved
            </p>
          </div>
        </div>
        {items.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-semibold transition-colors px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <Trash2 size={14} /> Clear All
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-56 rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center">
            <PackageOpen size={36} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your wishlist is empty</h2>
          <p className="text-gray-500 dark:text-dark-muted text-sm max-w-xs">
            Save your favourite products here and come back to them anytime.
          </p>
          <Link
            to="/"
            className="mt-2 px-6 py-3 rounded-2xl bg-primary-500 text-white font-bold text-sm hover:bg-primary-600 shadow-glow transition-all"
          >
            Browse Products
          </Link>
        </div>
      )}

      {/* Wishlist Grid */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((product) => (
            <div
              key={product._id}
              className="group bg-white dark:bg-dark-card rounded-3xl border border-gray-100 dark:border-dark-border p-3.5 flex flex-col hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative"
            >
              {/* Remove from wishlist */}
              <button
                onClick={() => handleRemove(product._id, product.name)}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-500 hover:bg-red-100 transition-colors"
                aria-label="Remove from wishlist"
              >
                <Heart size={14} className="fill-red-500" />
              </button>

              {/* Product image */}
              <Link to={`/product/${product.slug}`} className="block">
                <div className="w-full h-32 rounded-2xl bg-gray-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden mb-3 border border-gray-100 dark:border-slate-800">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Product info */}
                {product.brand && (
                  <p className="text-[10px] font-bold text-primary-500 uppercase tracking-widest">{product.brand}</p>
                )}
                <h3 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 mt-0.5 leading-snug">
                  {product.name}
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">{product.unit}</p>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-extrabold text-gray-900 dark:text-white">
                    ₹{product.discountPrice || product.price}
                  </span>
                  {product.discountPrice && (
                    <span className="text-[10px] text-gray-400 line-through">₹{product.price}</span>
                  )}
                </div>
              </Link>

              {/* Move to Cart */}
              <button
                onClick={() => handleMoveToCart(product)}
                disabled={product.stock <= 0}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-2xl text-xs font-bold bg-primary-50 dark:bg-primary-950/20 text-primary-600 border border-primary-200 dark:border-primary-900 hover:bg-primary-500 hover:text-white hover:border-transparent hover:shadow-glow disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ShoppingCart size={12} />
                {product.stock <= 0 ? 'Out of Stock' : 'Move to Cart'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
