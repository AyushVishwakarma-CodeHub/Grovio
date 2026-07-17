import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  ArrowLeft, ShoppingCart, ShieldCheck, 
  Truck, CornerDownLeft, Plus, Minus, AlertCircle,
  Star, Heart, Send, MessageSquare
} from 'lucide-react';
import { 
  fetchProductBySlug, fetchProducts, clearSelectedProduct 
} from '../store/productSlice.js';
import { 
  guestAddToCart, guestRemoveFromCart, 
  syncAddToCart, syncRemoveFromCart, 
  selectCartItems 
} from '../store/cartSlice.js';
import { toggleWishlistItem, selectIsWishlisted } from '../store/wishlistSlice.js';
import ProductCard from '../components/ProductCard.jsx';
import { PageLoader } from '../components/LoadingSkeleton.jsx';
import { toast } from 'react-toastify';
import api from '../utils/axios.js';

// ── Star Rating Display Helper ──
const StarRating = ({ rating = 0, size = 14, interactive = false, onRate }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <button
        key={s}
        type="button"
        onClick={() => interactive && onRate && onRate(s)}
        className={`${
          interactive ? 'cursor-pointer hover:scale-125 transition-transform' : 'cursor-default'
        }`}
        aria-label={`${s} star`}
      >
        <Star
          size={size}
          className={s <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-slate-600'}
        />
      </button>
    ))}
  </div>
);

export const ProductDetails = () => {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { selectedProduct, products, loading, error } = useSelector((state) => state.products);
  const cartItems = useSelector(selectCartItems);
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const isWishlisted = useSelector(selectedProduct ? selectIsWishlisted(selectedProduct._id) : () => false);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  // Load product details on mount
  useEffect(() => {
    dispatch(fetchProductBySlug(slug));
    return () => {
      dispatch(clearSelectedProduct());
    };
  }, [dispatch, slug]);

  // Load similar products in the same category
  useEffect(() => {
    if (selectedProduct?.category?._id) {
      dispatch(fetchProducts({ 
        category: selectedProduct.category._id,
        limit: 5
      }));
      loadReviews(selectedProduct._id);
    }
  }, [dispatch, selectedProduct]);

  const loadReviews = async (productId) => {
    try {
      setReviewsLoading(true);
      const res = await api.get(`/reviews/product/${productId}`);
      setReviews(res.data.data.reviews);
    } catch (e) {
      // silently fail
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) { toast.info('Please login to write a review'); return; }
    if (userRating === 0) { toast.warning('Please select a star rating'); return; }
    try {
      setSubmittingReview(true);
      await api.post(`/reviews/${selectedProduct._id}`, {
        rating: userRating,
        title: reviewTitle,
        comment: reviewComment
      });
      toast.success('Review submitted! Thank you 🙏');
      setUserRating(0); setReviewTitle(''); setReviewComment('');
      loadReviews(selectedProduct._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleWishlistToggle = () => {
    if (!isAuthenticated) { toast.info('Please login to add to wishlist'); return; }
    dispatch(toggleWishlistItem(selectedProduct._id));
    toast.success(isWishlisted ? 'Removed from wishlist' : 'Saved to wishlist ❤️');
  };

  if (loading && !selectedProduct) {
    return <PageLoader />;
  }

  if (error || !selectedProduct) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Product Not Found</h2>
        <p className="text-gray-500 dark:text-dark-muted mb-6">{error || 'The requested product could not be loaded.'}</p>
        <button
          onClick={() => navigate('/')}
          className="py-2.5 px-5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-semibold"
        >
          Back to Shop
        </button>
      </div>
    );
  }

  // Cart quantity check
  const cartItem = cartItems.find(item => item.product._id === selectedProduct._id);
  const quantityInCart = cartItem ? cartItem.quantity : 0;

  // Discount calculations
  let discountPercentage = 0;
  if (selectedProduct.discountPrice && selectedProduct.price > 0) {
    discountPercentage = Math.round(
      ((selectedProduct.price - selectedProduct.discountPrice) / selectedProduct.price) * 100
    );
  }

  const handleQuantityChange = (newQty) => {
    if (newQty < 1) {
      if (isAuthenticated) {
        dispatch(syncRemoveFromCart(selectedProduct._id));
      } else {
        dispatch(guestRemoveFromCart(selectedProduct._id));
      }
      toast.info('Item removed from cart');
      return;
    }

    if (newQty > selectedProduct.stock) {
      toast.warning(`Only ${selectedProduct.stock} units available in stock.`);
      return;
    }

    if (isAuthenticated) {
      dispatch(syncAddToCart({ productId: selectedProduct._id, quantity: newQty }));
    } else {
      dispatch(guestAddToCart({ product: selectedProduct, quantity: newQty }));
    }
  };

  const handleAddToCart = () => {
    if (selectedProduct.stock <= 0) {
      toast.error('Product is out of stock!');
      return;
    }
    handleQuantityChange(1);
    toast.success(`${selectedProduct.name} added to cart!`);
  };

  // Filter out the current product from recommendations list
  const recommendations = products.filter(p => p._id !== selectedProduct._id).slice(0, 4);

  return (
    <div className="flex flex-col gap-12 pb-16">
      
      {/* Back Button */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-primary-500 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Catalog
        </button>
      </div>

      {/* Main Product Info Block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 bg-white dark:bg-dark-card p-6 sm:p-10 rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm">
        
        {/* Left Side: Product Image */}
        <div className="w-full aspect-square rounded-2xl overflow-hidden bg-white flex items-center justify-center border border-gray-200/50 dark:border-slate-800 relative p-4">
          <img
            src={selectedProduct.image}
            alt={selectedProduct.name}
            loading="lazy"
            onLoad={(e) => {
              e.currentTarget.style.opacity = 1;
              const loader = e.currentTarget.parentElement?.querySelector('.image-detail-loader');
              if (loader) loader.style.display = 'none';
            }}
            className="w-full h-full object-contain max-h-[450px] opacity-0 transition-opacity duration-300"
          />
          <div className="image-detail-loader absolute inset-0 bg-gray-50 dark:bg-slate-800 animate-pulse flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
          {discountPercentage > 0 && (
            <div className="absolute top-4 left-4 bg-red-500 text-white font-sans font-bold text-xs tracking-wider uppercase px-3 py-1 rounded-full shadow-sm animate-pulse">
              Save {discountPercentage}%
            </div>
          )}
        </div>

        {/* Right Side: Product Meta & Purchase Panel */}
        <div className="flex flex-col justify-between py-2">
          <div className="flex flex-col">
            {selectedProduct.brand && (
              <span className="text-xs font-bold text-primary-500 uppercase tracking-widest leading-none">
                {selectedProduct.brand}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mt-2 leading-tight font-sans">
              {selectedProduct.name}
            </h1>
            <p className="text-sm font-semibold text-gray-500 dark:text-dark-muted mt-2">
              Pack Size: {selectedProduct.unit}
            </p>

            <div className="flex items-baseline gap-3 mt-6 border-b border-gray-100 dark:border-slate-800/50 pb-6">
              {selectedProduct.discountPrice ? (
                <>
                  <span className="text-3xl font-black text-gray-900 dark:text-white">
                    ₹{selectedProduct.discountPrice}
                  </span>
                  <span className="text-base text-gray-400 line-through">
                    ₹{selectedProduct.price}
                  </span>
                </>
              ) : (
                <span className="text-3xl font-black text-gray-900 dark:text-white">
                  ₹{selectedProduct.price}
                </span>
              )}
            </div>

            {/* Product description */}
            <div className="mt-6 flex flex-col gap-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Product Details
              </h3>
              <p className="text-sm text-gray-600 dark:text-dark-text leading-relaxed">
                {selectedProduct.description}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-6">
            
            {/* Stock Warning/Alert */}
            {selectedProduct.stock <= 0 ? (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-xl text-xs font-bold border border-red-200/50">
                <AlertCircle size={16} />
                <span>Currently out of stock. Check back later!</span>
              </div>
            ) : selectedProduct.stock <= selectedProduct.lowStockThreshold ? (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 rounded-xl text-xs font-bold border border-yellow-200/50">
                <AlertCircle size={16} />
                <span>Only {selectedProduct.stock} left in stock. Order quickly!</span>
              </div>
            ) : null}

            {/* Purchase CTA controls */}
            <div className="flex items-center gap-4">
              {selectedProduct.stock <= 0 ? (
                <button
                  disabled
                  className="flex-1 py-4 px-6 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-400 font-bold border border-gray-200 dark:border-slate-850 cursor-not-allowed text-center"
                >
                  Out of Stock
                </button>
              ) : quantityInCart > 0 ? (
                <div className="flex items-center gap-4 bg-primary-100 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-900/50 rounded-2xl p-1.5 shadow-sm max-w-[180px] w-full">
                  <button
                    onClick={() => handleQuantityChange(quantityInCart - 1)}
                    className="w-10 h-10 rounded-xl bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-slate-850 flex items-center justify-center text-primary-500 font-bold transition-all transform active:scale-90"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-base font-extrabold w-12 text-center text-gray-900 dark:text-white">
                    {quantityInCart}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(quantityInCart + 1)}
                    className="w-10 h-10 rounded-xl bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-slate-850 flex items-center justify-center text-primary-500 font-bold transition-all transform active:scale-90"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-4 px-6 rounded-2xl font-bold bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center gap-2 shadow-glow hover:shadow-lg transition-all duration-300 transform active:scale-95"
                >
                  <ShoppingCart size={18} />
                  Add to Shopping Cart
                </button>
              )}
            </div>

            {/* Quick trust assurances */}
            <div className="grid grid-cols-3 gap-3 border-t border-gray-100 dark:border-slate-800/50 pt-6 mt-2 text-[10px] text-gray-500 dark:text-dark-muted font-semibold uppercase tracking-wider text-center">
              <div className="flex flex-col items-center gap-1.5">
                <Truck size={16} className="text-primary-500" />
                <span>10 Min Delivery</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <CornerDownLeft size={16} className="text-primary-500" />
                <span>Easy Returns</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <ShieldCheck size={16} className="text-primary-500" />
                <span>100% Clean Sourced</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Similar products recommendations grid */}
      {recommendations.length > 0 && (
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white font-sans">
            Customers Also Bought
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {recommendations.map((prod) => (
              <ProductCard key={prod._id} product={prod} />
            ))}
          </div>
        </div>
      )}

      {/* ── Reviews & Ratings Section ── */}
      <div className="mt-10 bg-white dark:bg-dark-card rounded-3xl border border-gray-100 dark:border-dark-border p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare size={20} className="text-primary-500" />
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Reviews & Ratings</h2>
          <span className="text-sm text-gray-500 dark:text-dark-muted">({reviews.length})</span>
          {reviews.length > 0 && (
            <div className="flex items-center gap-1.5 ml-auto">
              <StarRating rating={reviews.reduce((a, r) => a + r.rating, 0) / reviews.length} size={16} />
              <span className="text-sm font-bold text-gray-700 dark:text-dark-text">
                {(reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Write Review Form */}
        <div className="mb-8 p-5 bg-gray-50 dark:bg-slate-900/40 rounded-2xl border border-gray-100 dark:border-dark-border">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Write a Review</h3>
          {!isAuthenticated ? (
            <p className="text-sm text-gray-500 dark:text-dark-muted">
              <Link to="/login" className="text-primary-500 font-semibold hover:underline">Login</Link> to write a review.
            </p>
          ) : (
            <form onSubmit={handleSubmitReview} className="flex flex-col gap-3">
              {/* Star Picker */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600 dark:text-dark-text">Your Rating:</span>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setUserRating(s)}
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="hover:scale-125 transition-transform"
                    >
                      <Star
                        size={22}
                        className={s <= (hoverRating || userRating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300 dark:text-slate-600'}
                      />
                    </button>
                  ))}
                  {userRating > 0 && (
                    <span className="ml-2 text-xs font-semibold text-yellow-500">
                      {['','Poor','Fair','Good','Very Good','Excellent'][userRating]}
                    </span>
                  )}
                </div>
              </div>

              <input
                type="text"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="Review title (optional)"
                className="w-full px-4 py-2.5 text-sm rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              />
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your experience with this product..."
                rows={3}
                className="w-full px-4 py-2.5 text-sm rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all resize-none"
              />
              <button
                type="submit"
                disabled={submittingReview || userRating === 0}
                className="self-end flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <Send size={14} />
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          )}
        </div>

        {/* Reviews List */}
        {reviewsLoading && (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse" />)}
          </div>
        )}

        {!reviewsLoading && reviews.length === 0 && (
          <div className="text-center py-10 text-gray-400 dark:text-dark-muted">
            <Star size={32} className="mx-auto mb-2 text-gray-300 dark:text-slate-600" />
            <p className="text-sm">No reviews yet — be the first to review!</p>
          </div>
        )}

        {!reviewsLoading && reviews.length > 0 && (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r._id} className="flex gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-dark-border">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {r.user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{r.user?.name || 'User'}</p>
                    <p className="text-[11px] text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <StarRating rating={r.rating} size={13} />
                  {r.title && <p className="text-sm font-semibold text-gray-800 dark:text-white mt-1.5">{r.title}</p>}
                  {r.comment && <p className="text-sm text-gray-600 dark:text-dark-muted mt-0.5 leading-relaxed">{r.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
export default ProductDetails;
