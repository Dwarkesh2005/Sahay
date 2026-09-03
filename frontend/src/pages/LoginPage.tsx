import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, LogIn, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const { login } = useAuth();

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await login(data.email, data.password);
      setIsSubmitting(false);
      // Get user from localStorage to determine redirect
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        if (userData.role === 'ADMIN') navigate('/admin');
        else if (userData.role === 'NGO') navigate('/ngo-portal');
        else navigate('/dashboard');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      setIsSubmitting(false);
      setErrorMsg(error.response?.data?.error || 'Invalid email or password.');
    }
  };

  return (
    <div
      className="relative min-h-[calc(100vh-140px)] flex items-center justify-center rounded-3xl overflow-hidden mx-4 my-2 bg-gradient-to-br from-primary/5 via-bg-nature to-secondary/10"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-forest-dark/5 to-primary/5" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md p-8 rounded-3xl glass-panel shadow-2xl border border-white/30 text-left mx-4"
      >
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-display font-bold text-3xl text-forest-dark">Welcome Back</h2>
            <p className="text-sm text-emerald-950/70">Connecting you back to the community.</p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-forest-dark/80 block" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-dark/40" />
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="test@sahay.org"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/70 rounded-xl border border-forest-light/60 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  aria-invalid={errors.email ? 'true' : 'false'}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 font-medium mt-0.5">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-forest-dark/80 block" htmlFor="password">
                  Password
                </label>
                <a href="#" className="text-xs text-primary hover:text-forest-dark font-medium">
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-dark/40" />
                <input
                  id="password"
                  type="password"
                  {...register('password')}
                  placeholder="password"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/70 rounded-xl border border-forest-light/60 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  aria-invalid={errors.password ? 'true' : 'false'}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 font-medium mt-0.5">{errors.password.message}</p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <label className="flex items-center space-x-2 text-xs text-emerald-950/80 cursor-pointer" htmlFor="rememberMe">
                <input
                  id="rememberMe"
                  type="checkbox"
                  {...register('rememberMe')}
                  className="accent-primary w-4 h-4"
                />
                <span>Remember me on this device</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-forest-dark disabled:bg-primary/50 text-white font-semibold py-3 rounded-xl shadow-md transition-all duration-300 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </>
              )}
            </button>
          </form>

          {/* Social Logins */}
          <div className="space-y-4 pt-4 border-t border-forest-light/20">
            <button
              type="button"
              className="w-full flex items-center justify-center space-x-2.5 py-2.5 bg-white/70 border border-forest-light/50 hover:bg-white rounded-xl transition-all font-medium text-xs text-forest-dark"
              aria-label="Login with Google"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.48 14.99 1 12 1 7.35 1 3.4 3.65 1.5 7.5l3.85 2.99C6.28 7.37 8.93 5.04 12 5.04z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.28 1.48-1.11 2.73-2.37 3.58l3.69 2.87c2.16-1.99 3.71-4.92 3.71-8.6z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.35 10.49c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29L1.5 2.92C.54 4.84 0 7 0 9.3s.54 4.46 1.5 6.38l3.85-2.99z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.69-2.87c-1.02.69-2.33 1.1-4.27 1.1-3.07 0-5.72-2.33-6.65-5.45L1.5 15.86C3.4 19.7 7.35 22.35 12 22.35z"
                />
              </svg>
              <span>Login with Google</span>
            </button>

            <div className="text-center text-xs text-emerald-950/75">
              New to Sahay?{' '}
              <Link to="/register" className="text-primary hover:text-forest-dark font-semibold">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
