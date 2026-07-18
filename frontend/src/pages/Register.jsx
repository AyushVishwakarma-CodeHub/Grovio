import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { User, Mail, Phone, Lock, UserPlus, ShieldAlert, AlertCircle } from 'lucide-react';
import { registerUser } from '../store/authSlice.js';
import { toast } from 'react-toastify';

export const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);
  
  // Custom state for selecting role visually
  const [selectedRole, setSelectedRole] = useState('customer');

  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm({
    defaultValues: { name: '', email: '', phone: '', password: '' }
  });

  const onSubmit = async (data) => {
    const registrationDetails = {
      ...data,
      role: selectedRole
    };

    const result = await dispatch(registerUser(registrationDetails));
    if (registerUser.fulfilled.match(result)) {
      toast.success(`Account created! Welcome to Grovio, ${registrationDetails.name}!`);
      
      // Route based on role
      if (selectedRole === 'customer') {
        navigate('/');
      } else if (selectedRole === 'delivery_partner') {
        navigate('/delivery');
      } else {
        navigate('/admin');
      }
    } else {
      toast.error(result.payload || 'Registration failed. Email or Phone might be in use.');
    }
  };

  const rolesList = [
    { id: 'customer', title: 'Customer', desc: 'Shop & order groceries' },
    { id: 'delivery_partner', title: 'Rider', desc: 'Accept orders & deliver' },
    { id: 'store_manager', title: 'Manager', desc: 'Manage stock & catalog' }
  ];

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />

      <div className="max-w-lg w-full glass p-8 sm:p-10 rounded-[32px] border border-gray-100 dark:border-dark-border shadow-xl relative z-10 bg-white dark:bg-dark-card">
        
        {/* Logo Section */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center">
            <span className="text-3xl font-extrabold text-primary-500 font-sans">
              Grovio
            </span>
            <span className="text-[10px] font-bold text-gray-500 dark:text-dark-muted uppercase tracking-widest mt-0.5">
              Fresh Groceries. Delivered Smarter.
            </span>
          </Link>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-6">
            Create Account
          </h2>
          <p className="text-xs text-gray-500 dark:text-dark-muted mt-1.5">
            Register to start ordering or managing groceries.
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-xl text-xs font-bold border border-red-200/30">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* User Name input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-dark-text uppercase tracking-wide">
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="John Doe"
                {...register('name', { required: 'Full name is required', minLength: { value: 2, message: 'Name must be at least 2 characters' } })}
                className="w-full py-2.5 pl-11 pr-4 text-sm rounded-2xl border border-gray-200 dark:border-dark-border bg-gray-50/50 dark:bg-slate-900/30 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all shadow-inner"
              />
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            {errors.name && (
              <span className="text-[10px] font-bold text-red-500 pl-1">{errors.name.message}</span>
            )}
          </div>

          {/* Grid: Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Email input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-dark-text uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="name@example.com"
                  {...register('email', { 
                    required: 'Email address is required',
                    pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
                  })}
                  className="w-full py-2.5 pl-11 pr-4 text-sm rounded-2xl border border-gray-200 dark:border-dark-border bg-gray-50/50 dark:bg-slate-900/30 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all shadow-inner"
                />
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              {errors.email && (
                <span className="text-[10px] font-bold text-red-500 pl-1">{errors.email.message}</span>
              )}
            </div>

            {/* Phone input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-dark-text uppercase tracking-wide">
                Phone Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="9999999999"
                  {...register('phone', { required: 'Phone number is required' })}
                  className="w-full py-2.5 pl-11 pr-4 text-sm rounded-2xl border border-gray-200 dark:border-dark-border bg-gray-50/50 dark:bg-slate-900/30 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all shadow-inner"
                />
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              {errors.phone && (
                <span className="text-[10px] font-bold text-red-500 pl-1">{errors.phone.message}</span>
              )}
            </div>
          </div>

          {/* Password input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-dark-text uppercase tracking-wide">
              Create Password
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="••••••••"
                {...register('password', { 
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Password must be at least 6 characters' }
                })}
                className="w-full py-2.5 pl-11 pr-4 text-sm rounded-2xl border border-gray-200 dark:border-dark-border bg-gray-50/50 dark:bg-slate-900/30 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all shadow-inner"
              />
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            {errors.password && (
              <span className="text-[10px] font-bold text-red-500 pl-1">{errors.password.message}</span>
            )}
          </div>

          {/* Role selector panel */}
          <div className="flex flex-col gap-2 mt-4">
            <label className="text-xs font-bold text-gray-700 dark:text-dark-text uppercase tracking-wide">
              Select Your Role
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {rolesList.map((role) => {
                const isActive = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRole(role.id)}
                    className={`p-2.5 rounded-2xl border text-left transition-all duration-300 transform active:scale-95 ${
                      isActive
                        ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20 text-primary-500 shadow-sm font-bold ring-2 ring-primary-500/10'
                        : 'border-gray-200 dark:border-dark-border bg-gray-50/50 dark:bg-slate-900/20 hover:bg-gray-100/50 text-gray-600 dark:text-dark-text'
                    }`}
                  >
                    <p className="text-xs font-bold">{role.title}</p>
                    <p className="text-[9px] opacity-75 mt-0.5 leading-tight">{role.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Security note when registering as Admin/Manager */}
          {selectedRole !== 'customer' && (
            <div className="flex items-center gap-1.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-500 text-[10px] font-bold border border-amber-200/50">
              <ShieldAlert size={14} className="flex-shrink-0" />
              <span>Note: Administrative roles grant direct catalog, stock control, and metrics dashboards privileges.</span>
            </div>
          )}

          {/* Register Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-2xl font-bold bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center gap-2 shadow-glow hover:shadow-lg transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            <UserPlus size={18} />
            {loading ? 'Creating Account...' : 'Register Now'}
          </button>

        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800/50 text-center text-xs text-gray-500 dark:text-dark-muted font-medium">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-500 font-bold hover:underline">
            Sign In
          </Link>
        </div>

      </div>
    </div>
  );
};
export default Register;
