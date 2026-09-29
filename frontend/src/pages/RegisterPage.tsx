import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheck, UserCheck, User, Landmark, Mail, Lock, Phone, MapPin, Award, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { authService } from '../services/api';

// Form Validation Schema using Zod with translation keys
const registerSchema = z
  .object({
    role: z.enum(['MIGRANT', 'VOLUNTEER', 'NGO']),
    fullName: z.string().min(3, 'auth.nameRequired'),
    email: z.string().email('auth.emailRequired'),
    phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'auth.phoneInvalid'),
    password: z.string().min(6, 'auth.passwordRequired'),
    confirmPassword: z.string().min(6, 'auth.passwordRequired'),
    city: z.string().min(2, 'auth.cityRequired'),
    ngoName: z.string().optional(),
    registrationNumber: z.string().optional(),
    ngoDarpanId: z.string().optional(),
    agreeToTerms: z.literal(true, {
      errorMap: () => ({ message: 'auth.termsRequired' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'auth.passwordsDoNotMatch',
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
      if (data.role === 'NGO') {
        return !!data.ngoName && data.ngoName.length > 2;
      }
      return true;
    },
    {
      message: 'auth.ngoNameRequired',
      path: ['ngoName'],
    }
  );

type RegisterFormValues = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeRole, setActiveRole] = useState<'MIGRANT' | 'VOLUNTEER' | 'NGO'>('MIGRANT');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'MIGRANT',
      agreeToTerms: undefined,
    },
  });

  const handleRoleChange = (role: 'MIGRANT' | 'VOLUNTEER' | 'NGO') => {
    setActiveRole(role);
    setValue('role', role);
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await authService.register({
        role: data.role,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        city: data.city,
        ngoName: data.ngoName,
        registrationNumber: data.registrationNumber,
        ngoDarpanId: data.ngoDarpanId,
      });
      setIsSubmitting(false);
      setSubmitSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      setIsSubmitting(false);
      setErrorMsg(error.response?.data?.error || t('errors.failedToSubmit', 'Registration failed. Please try again.'));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 pt-4 min-h-[calc(100vh-140px)] flex items-center justify-center">
      <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-forest-light/20 grid grid-cols-1 lg:grid-cols-12 w-full max-w-5xl">
        {/* LEFT PANEL - SVG nature illustration */}
        <div className="lg:col-span-5 bg-gradient-to-b from-primary/10 via-secondary/10 to-bg-nature p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-4 text-left z-10">
            <span className="text-primary font-bold text-xs uppercase tracking-widest font-display">
              {t('auth.joinCanopy', 'Join the Canopy')}
            </span>
            <h2 className="font-display font-bold text-3xl text-forest-dark leading-tight">
              {t('auth.registerTitle', 'Create Your Care Circle Account')}
            </h2>
            <p className="text-emerald-950/70 text-sm leading-relaxed">
              {t(
                'auth.registerSubtitle',
                'Become part of a decentralized, warm network of helpers, organizations, and citizens dedicated to community security.'
              )}
            </p>
          </div>

          {/* SVG Community Tree Illustration */}
          <div className="my-8 z-10 w-full aspect-[4/3] flex items-center justify-center">
            <svg viewBox="0 0 200 180" className="w-4/5 max-h-[220px]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="trunkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8D6E63" />
                  <stop offset="100%" stopColor="#5D4037" />
                </linearGradient>
                <linearGradient id="leafGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#81C784" />
                  <stop offset="100%" stopColor="#2E7D32" />
                </linearGradient>
              </defs>

              <circle cx="100" cy="130" r="28" fill="#A5D6A7" opacity="0.25" />
              <circle cx="100" cy="130" r="16" fill="#66BB6A" opacity="0.3" />

              <path
                d="M 98 150 L 98 100 Q 98 80 85 70 M 102 150 L 102 95 Q 102 75 115 65"
                stroke="url(#trunkGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />

              <path d="M 85 70 C 70 70 70 50 85 50 C 95 50 90 65 85 70 Z" fill="url(#leafGrad)" />
              <path d="M 115 65 C 130 65 130 45 115 45 C 105 45 110 60 115 65 Z" fill="url(#leafGrad)" />
              <path d="M 100 90 C 85 90 85 75 100 75 C 110 75 110 85 100 90 Z" fill="#66BB6A" />

              <path
                d="M 65 145 C 75 155 90 155 100 155"
                stroke="#2E7D32"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 135 145 C 125 155 110 155 100 155"
                stroke="#2E7D32"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="text-left space-y-3 z-10">
            <div className="flex items-center space-x-3 text-xs text-forest-dark/80">
              <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
              <span>{t('landing.trustDirectChat', 'Encrypted Credentials & Secure Access')}</span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-forest-dark/80">
              <UserCheck className="w-5 h-5 text-primary shrink-0" />
              <span>{t('landing.trustGovtVerified', 'Government verified organizations')}</span>
            </div>
          </div>

          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-accent/25 rounded-full blur-2xl" />
        </div>

        {/* RIGHT PANEL - Form */}
        <div className="lg:col-span-7 p-8 md:p-10 text-left flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex flex-col space-y-2">
              <h3 className="font-display font-bold text-2xl text-forest-dark">
                {t('navbar.getStarted', 'Register')}
              </h3>
              <p className="text-sm text-emerald-950/70">
                {t('auth.registerSubtitle', 'Set up your profile to request or provide assistance.')}
              </p>
            </div>

            {/* Role Selectors */}
            <div className="grid grid-cols-3 gap-2 bg-bg-nature p-1.5 rounded-2xl border border-forest-light/35">
              {(['MIGRANT', 'VOLUNTEER', 'NGO'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRoleChange(r)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold font-display transition-all duration-300 cursor-pointer ${
                    activeRole === r
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-forest-dark/70 hover:text-primary hover:bg-white/60'
                  }`}
                  aria-label={`Register as ${r}`}
                >
                  {r === 'MIGRANT'
                    ? t('roles.MIGRANT', 'Migrant')
                    : r === 'VOLUNTEER'
                    ? t('roles.VOLUNTEER', 'Volunteer')
                    : t('roles.NGO', 'NGO')}
                </button>
              ))}
            </div>

            {/* Submit Error Message */}
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-rose-50 border border-rose-300 text-rose-700 rounded-xl text-sm font-medium flex items-center space-x-2"
              >
                <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {/* Submit Success Message */}
            {submitSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-emerald-100 border border-emerald-300 text-forest-dark rounded-xl text-sm font-medium flex items-center space-x-2"
              >
                <ShieldCheck className="w-5 h-5 text-primary" />
                <span>{t('auth.registerSuccess', 'Account created successfully! Redirecting to login...')}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-forest-dark/80 block" htmlFor="fullName">
                  {t('auth.fullName', 'Full Name')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-dark/40" />
                  <input
                    id="fullName"
                    type="text"
                    {...register('fullName')}
                    placeholder={t('auth.fullName', 'Enter your full name')}
                    className="w-full pl-10 pr-4 py-2.5 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    aria-invalid={errors.fullName ? 'true' : 'false'}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-xs text-red-500 font-medium mt-0.5">
                    {t(errors.fullName.message as string, 'Full Name must be at least 3 characters')}
                  </p>
                )}
              </div>

              {/* Conditional NGO inputs */}
              {activeRole === 'NGO' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-forest-dark/80 block" htmlFor="ngoName">
                      {t('auth.ngoName', 'Organization Name')}
                    </label>
                    <div className="relative">
                      <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-dark/40" />
                      <input
                        id="ngoName"
                        type="text"
                        {...register('ngoName')}
                        placeholder={t('auth.ngoName', 'Enter official NGO name')}
                        className="w-full pl-10 pr-4 py-2.5 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                      />
                    </div>
                    {errors.ngoName && (
                      <p className="text-xs text-red-500 font-medium mt-0.5">
                        {t(errors.ngoName.message as string, 'NGO Name is required')}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-forest-dark/80 block" htmlFor="registrationNumber">
                        {t('auth.registrationNumber', 'Registration Number (NGO)')}
                      </label>
                      <div className="relative">
                        <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-dark/40" />
                        <input
                          id="registrationNumber"
                          type="text"
                          {...register('registrationNumber')}
                          placeholder="e.g. Reg-2024/99182"
                          className="w-full pl-10 pr-4 py-2.5 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-forest-dark/80 block" htmlFor="ngoDarpanId">
                        {t('auth.ngoDarpanId', 'NGO Darpan ID (Optional)')}
                      </label>
                      <div className="relative">
                        <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-dark/40" />
                        <input
                          id="ngoDarpanId"
                          type="text"
                          {...register('ngoDarpanId')}
                          placeholder="e.g. UP/2024/04128"
                          className="w-full pl-10 pr-4 py-2.5 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Email & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-forest-dark/80 block" htmlFor="email">
                    {t('auth.email', 'Email Address')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-dark/40" />
                    <input
                      id="email"
                      type="email"
                      {...register('email')}
                      placeholder="name@email.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                      aria-invalid={errors.email ? 'true' : 'false'}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-500 font-medium mt-0.5">
                      {t(errors.email.message as string, 'Valid email is required')}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-forest-dark/80 block" htmlFor="phone">
                    {t('auth.phone', 'Phone Number')}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-dark/40" />
                    <input
                      id="phone"
                      type="tel"
                      {...register('phone')}
                      placeholder={t('auth.phonePlaceholder', '9876543210')}
                      className="w-full pl-10 pr-4 py-2.5 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                      aria-invalid={errors.phone ? 'true' : 'false'}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-xs text-red-500 font-medium mt-0.5">
                      {t(errors.phone.message as string, 'Invalid phone number')}
                    </p>
                  )}
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-forest-dark/80 block" htmlFor="password">
                    {t('auth.password', 'Password')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-dark/40" />
                    <input
                      id="password"
                      type="password"
                      {...register('password')}
                      placeholder="••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                      aria-invalid={errors.password ? 'true' : 'false'}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-500 font-medium mt-0.5">
                      {t(errors.password.message as string, 'Password must be at least 6 characters')}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-forest-dark/80 block" htmlFor="confirmPassword">
                    {t('auth.confirmPassword', 'Confirm Password')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-dark/40" />
                    <input
                      id="confirmPassword"
                      type="password"
                      {...register('confirmPassword')}
                      placeholder="••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                      aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-500 font-medium mt-0.5">
                      {t(errors.confirmPassword.message as string, "Passwords don't match")}
                    </p>
                  )}
                </div>
              </div>

              {/* City Selection */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-forest-dark/80 block" htmlFor="city">
                  {t('auth.city', 'City')}
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-dark/40" />
                  <input
                    id="city"
                    type="text"
                    {...register('city')}
                    placeholder={t('auth.city', 'Enter your current city')}
                    className="w-full pl-10 pr-4 py-2.5 bg-bg-nature rounded-xl border border-forest-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    aria-invalid={errors.city ? 'true' : 'false'}
                  />
                </div>
                {errors.city && (
                  <p className="text-xs text-red-500 font-medium mt-0.5">
                    {t(errors.city.message as string, 'City is required')}
                  </p>
                )}
              </div>

              {/* Terms Checkbox */}
              <div className="space-y-1.5">
                <label className="flex items-start space-x-2 text-xs text-emerald-950/80 cursor-pointer" htmlFor="agreeToTerms">
                  <input
                    id="agreeToTerms"
                    type="checkbox"
                    {...register('agreeToTerms')}
                    className="mt-0.5 accent-primary w-4 h-4"
                  />
                  <span>
                    {t('auth.agreeToTerms', 'I agree to the terms and privacy conditions of the Sahay platform')}
                  </span>
                </label>
                {errors.agreeToTerms && (
                  <p className="text-xs text-red-500 font-medium mt-0.5">
                    {t(errors.agreeToTerms.message as string, 'You must agree to the terms')}
                  </p>
                )}
              </div>

              {/* Create Account Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-forest-dark disabled:bg-primary/50 text-white font-semibold py-3 rounded-xl shadow-md transition-all duration-300 flex items-center justify-center cursor-pointer"
              >
                {isSubmitting ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  t('navbar.getStarted', 'Create Account')
                )}
              </button>
            </form>
          </div>

          <div className="space-y-4 pt-4 border-t border-forest-light/20">
            <div className="text-center text-xs text-emerald-950/70">
              {t('auth.alreadyHaveAccount', 'Already have an account?')}{' '}
              <Link to="/login" className="text-primary hover:text-forest-dark font-semibold">
                {t('auth.loginNow', 'Login')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
