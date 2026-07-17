import React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Mail, Lock, LogIn, Sparkles, AlertCircle } from 'lucide-react';
import { loginUser } from '../store/authSlice.js';
import { toast } from 'react-toastify';

export const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error } = useSelector((state) => state.auth);

  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm({
    defaultValues: { email: '', password: '' }
  });

  // Check where we redirected from
  const from = location.state?.from?.pathname || '/';

  const onSubmit = async (data) => {
    const result = await dispatch(loginUser(data));
    if (loginUser.fulfilled.match(result)) {
      toast.success('Welcome back to Grovio!');
      navigate(from, { replace: true });
    } else {
      toast.error(result.payload || 'Login failed. Please check credentials.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-1/4 left-1/4 w-60 h-60 rounded-full bg-primary-500/5 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-emerald-500/5 blur-3xl" />
      
      <div className="max-w-md w-full glass p-8 rounded-[32px] border border-gray-100 dark:border-dark-border shadow-xl relative z-10 bg-white dark:bg-dark-card">
        
        {/* Logo and Tagline */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center">
            <span className="text-3xl font-extrabold tracking-tight text-primary-500 font-sans">
              Grovio
            </span>
            <span className="text-[10px] font-bold text-gray-500 dark:text-dark-muted uppercase tracking-widest mt-0.5">
              Fresh Groceries. Delivered Smarter.
            </span>
          </Link>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-6">
            Sign In
          </h2>
          <p className="text-xs text-gray-500 dark:text-dark-muted mt-1.5">
            Log in to manage orders and checkout.
          </p>
        </div>

        {/* Global Error Notice */}
        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-xl text-xs font-bold border border-red-200/30">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Email input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-dark-text uppercase tracking-wide">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                placeholder="you@example.com"
                {...register('email', { 
                  required: 'Email address is required',
                  pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
                })}
                className="w-full py-3 pl-11 pr-4 text-sm rounded-2xl border border-gray-200 dark:border-dark-border bg-gray-50/50 dark:bg-slate-900/30 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all shadow-inner"
              />
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            {errors.email && (
              <span className="text-[10px] font-bold text-red-500 pl-1">{errors.email.message}</span>
            )}
          </div>

          {/* Password input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-700 dark:text-dark-text uppercase tracking-wide">
                Password
              </label>
            </div>
            <div className="relative">
              <input
                type="password"
                placeholder="••••••••"
                {...register('password', { 
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Password must be at least 6 characters' }
                })}
                className="w-full py-3 pl-11 pr-4 text-sm rounded-2xl border border-gray-200 dark:border-dark-border bg-gray-50/50 dark:bg-slate-900/30 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all shadow-inner"
              />
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            {errors.password && (
              <span className="text-[10px] font-bold text-red-500 pl-1">{errors.password.message}</span>
            )}
          </div>

          {/* Action trigger button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-2xl font-bold bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center gap-2 shadow-glow hover:shadow-lg transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            <LogIn size={18} />
            {loading ? 'Logging in...' : 'Sign In'}
          </button>

        </form>

        {/* Toggle sign-up option */}
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800/50 text-center text-xs text-gray-500 dark:text-dark-muted font-medium">
          New to Grovio?{' '}
          <Link to="/register" className="text-primary-500 font-bold hover:underline">
            Create an Account
          </Link>
        </div>

      </div>
    </div>
  );
};
export default Login;
