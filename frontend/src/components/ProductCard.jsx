import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Plus, Minus, ShoppingCart, Heart } from 'lucide-react';
import { 
  guestAddToCart, guestRemoveFromCart, 
  syncAddToCart, syncRemoveFromCart, 
  selectCartItems 
} from '../store/cartSlice.js';
import { toggleWishlistItem, selectIsWishlisted } from '../store/wishlistSlice.js';
import { toast } from 'react-toastify';

export const ProductCard = ({ product }) => {
  const dispatch = useDispatch();
  const cartItems = useSelector(selectCartItems);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const isWishlisted = useSelector(selectIsWishlisted(product._id));

  // Find if product is already in cart
  const cartItem = cartItems.find(item => item.product._id === product._id);
  const quantityInCart = cartItem ? cartItem.quantity : 0;

  // Calculate discount percentage
  let discountPercentage = 0;
  if (product.discountPrice && product.price > 0) {
    discountPercentage = Math.round(
      ((product.price - product.discountPrice) / product.price) * 100
    );
  }

  const handleQuantityChange = (newQty) => {
    if (newQty < 1) {
      if (isAuthenticated) {
        dispatch(syncRemoveFromCart(product._id));
      } else {
        dispatch(guestRemoveFromCart(product._id));
      }
      toast.info('Item removed from cart');
      return;
    }

    if (newQty > product.stock) {
      toast.warning(`Only ${product.stock} units available in stock.`);
      return;
    }

    if (isAuthenticated) {
      dispatch(syncAddToCart({ productId: product._id, quantity: newQty }));
    } else {
      dispatch(guestAddToCart({ product, quantity: newQty }));
    }
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (product.stock <= 0) {
      toast.error('Product is out of stock!');
      return;
    }

    handleQuantityChange(1);
    toast.success(`${product.name} added to cart!`);
  };

  const handleWishlistToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.info('Please login to save items to wishlist');
      return;
    }
    dispatch(toggleWishlistItem(product._id));
    toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist ❤️');
  };

  return (
    <div className="glass group rounded-3xl border border-gray-100 dark:border-dark-border p-3.5 sm:p-4 flex flex-col justify-between h-[340px] hover:shadow-lg dark:hover:shadow-slate-900/50 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden bg-white dark:bg-dark-card">
      
      {/* Discount Badge */}
      {discountPercentage > 0 && (
        <div className="absolute top-3 left-3 bg-red-500 text-white font-sans font-bold text-[10px] tracking-wide uppercase px-2 py-0.5 rounded-full z-10 animate-pulse">
          {discountPercentage}% OFF
        </div>
      )}

      {/* Wishlist Heart Button */}
      <button
        onClick={handleWishlistToggle}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-xl bg-white/80 dark:bg-dark-card/80 backdrop-blur-sm hover:scale-110 transition-all duration-200 shadow-sm"
        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart
          size={14}
          className={isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-400'}
        />
      </button>

      {/* Brand & Image Link */}
      <Link to={`/product/${product.slug}`} className="flex flex-col gap-2 cursor-pointer flex-1">
        {/* Product Image */}
        <div className="w-full h-36 rounded-2xl overflow-hidden bg-white flex items-center justify-center relative border border-gray-100 dark:border-slate-800">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            onLoad={(e) => {
              e.currentTarget.style.opacity = 1;
              const loader = e.currentTarget.parentElement?.querySelector('.image-skeleton-loader');
              if (loader) loader.style.display = 'none';
            }}
            className="h-full w-full object-contain p-2 group-hover:scale-105 transition-all duration-300 opacity-0"
          />
          <div className="image-skeleton-loader absolute inset-0 bg-gray-50 dark:bg-slate-800 animate-pulse flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>

        {/* Product Information */}
        <div className="flex flex-col mt-1">
          {product.brand && (
            <span className="text-[10px] font-bold text-primary-500 uppercase tracking-widest leading-none">
              {product.brand}
            </span>
          )}
          <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white line-clamp-2 mt-1 leading-snug">
            {product.name}
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-dark-muted font-medium mt-1">
            {product.unit}
          </p>
        </div>
      </Link>

      {/* Pricing and Action row */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100/50 dark:border-slate-800">
        <div className="flex flex-col leading-none">
          {product.discountPrice ? (
            <>
              <span className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white">
                ₹{product.discountPrice}
              </span>
              <span className="text-[10px] sm:text-xs text-gray-400 line-through mt-0.5">
                ₹{product.price}
              </span>
            </>
          ) : (
            <span className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white">
              ₹{product.price}
            </span>
          )}
        </div>

        {/* Cart buttons: Add or Quantity Counter */}
        {product.stock <= 0 ? (
          <button
            disabled
            className="py-1.5 px-3 rounded-xl border border-gray-200 dark:border-slate-800 text-[10px] font-extrabold text-gray-400 dark:text-dark-muted cursor-not-allowed bg-gray-50 dark:bg-slate-900"
          >
            Out of Stock
          </button>
        ) : quantityInCart > 0 ? (
          <div className="flex items-center gap-1.5 bg-primary-100 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-900/50 rounded-2xl p-1 shadow-sm">
            <button
              onClick={() => handleQuantityChange(quantityInCart - 1)}
              className="w-7 h-7 rounded-xl bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-slate-850 flex items-center justify-center text-primary-500 transition-colors"
            >
              <Minus size={12} />
            </button>
            <span className="text-xs font-bold w-6 text-center text-gray-900 dark:text-white">
              {quantityInCart}
            </span>
            <button
              onClick={() => handleQuantityChange(quantityInCart + 1)}
              className="w-7 h-7 rounded-xl bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-slate-850 flex items-center justify-center text-primary-500 transition-colors"
            >
              <Plus size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleAddToCart}
            className="flex items-center gap-1 py-1.5 px-3.5 rounded-2xl text-xs font-bold border border-primary-200 hover:border-transparent dark:border-primary-900 bg-primary-50 hover:bg-primary-500 dark:bg-primary-950/20 text-primary-600 hover:text-white hover:shadow-glow transition-all duration-300"
          >
            <ShoppingCart size={12} />
            ADD
          </button>
        )}
      </div>

    </div>
  );
};
export default ProductCard;
