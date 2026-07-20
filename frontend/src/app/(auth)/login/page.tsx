'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Leaf, Lock, Mail, Loader2 } from 'lucide-react';

import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { loginSchema, type LoginFormData } from '@/lib/validators';
import { cn } from '@/lib/utils';

// ─── Login Page ───────────────────────────────────────────
export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // ─── Handle Login Submit ───────────────────────────────
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      await login(data.email, data.password);
      toast.success('Welcome back!', 'You have successfully logged in.');
      router.push(redirectTo);
    } catch (error: unknown) {
      const err = error as { message?: string; statusCode?: number };

      if (err?.statusCode === 401) {
        setError('password', {
          message: 'Invalid email or password. Please try again.',
        });
      } else if (err?.statusCode === 403) {
        toast.error(
          'Account deactivated',
          'Your account has been deactivated. Please contact your administrator.',
        );
      } else {
        toast.error(
          'Login failed',
          err?.message || 'An unexpected error occurred. Please try again.',
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060d18]">
      {/* ── Animated Background Orbs ───────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute h-[600px] w-[600px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(0,255,136,0.12) 0%, transparent 70%)',
            top: '-10%',
            left: '-10%',
          }}
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute h-[500px] w-[500px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(0,212,255,0.10) 0%, transparent 70%)',
            bottom: '-10%',
            right: '-10%',
          }}
          animate={{
            x: [0, -25, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
        />
        <motion.div
          className="absolute h-[400px] w-[400px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(123,47,255,0.08) 0%, transparent 70%)',
            top: '40%',
            right: '20%',
          }}
          animate={{
            x: [0, 15, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 4,
          }}
        />
      </div>

      {/* ── Login Card ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 mx-4 w-full max-w-md"
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            borderRadius: '24px',
            padding: '48px 40px',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* ── Logo & Branding ──────────────────────── */}
          <div className="mb-10 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: 0.2,
                type: 'spring',
                stiffness: 200,
              }}
              className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                boxShadow: '0 8px 30px rgba(0, 255, 136, 0.35)',
              }}
            >
              <Leaf size={28} color="#001a0e" strokeWidth={2.5} />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-1 text-2xl font-bold"
              style={{
                background:
                  'linear-gradient(135deg, #fff 0%, #00ff88 50%, #00d4ff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              AgroEthiopia MIS
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm"
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              Ethiopian Agriculture Management System
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="mt-3 flex items-center justify-center gap-2"
            >
              <div
                className="h-px flex-1"
                style={{ background: 'rgba(255,255,255,0.07)' }}
              />
              <span
                className="px-3 text-xs font-medium"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                Ministry of Agriculture
              </span>
              <div
                className="h-px flex-1"
                style={{ background: 'rgba(255,255,255,0.07)' }}
              />
            </motion.div>
          </div>

          {/* ── Login Form ───────────────────────────── */}
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
          >
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                Email Address
              </label>
              <div className="relative">
                <div
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  <Mail size={16} />
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="you@agroethiopia.gov.et"
                  autoComplete="email"
                  disabled={isLoading}
                  {...register('email')}
                  className={cn(
                    'w-full rounded-xl py-3 pl-10 pr-4 text-sm transition-all duration-200',
                    errors.email && 'input-error',
                  )}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: errors.email
                      ? '1px solid rgba(248,113,113,0.5)'
                      : '1px solid rgba(255,255,255,0.10)',
                    color: 'rgba(255,255,255,0.9)',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    if (!errors.email) {
                      e.target.style.borderColor = 'rgba(0,255,136,0.4)';
                      e.target.style.boxShadow =
                        '0 0 0 3px rgba(0,255,136,0.1)';
                    }
                  }}
                  onBlur={(e) => {
                    if (!errors.email) {
                      e.target.style.borderColor = 'rgba(255,255,255,0.10)';
                      e.target.style.boxShadow = 'none';
                    }
                  }}
                />
              </div>
              {errors.email && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 text-xs"
                  style={{ color: '#f87171' }}
                >
                  {errors.email.message}
                </motion.p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                Password
              </label>
              <div className="relative">
                <div
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  <Lock size={16} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  {...register('password')}
                  className={cn(
                    'w-full rounded-xl py-3 pl-10 pr-12 text-sm transition-all duration-200',
                  )}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: errors.password
                      ? '1px solid rgba(248,113,113,0.5)'
                      : '1px solid rgba(255,255,255,0.10)',
                    color: 'rgba(255,255,255,0.9)',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    if (!errors.password) {
                      e.target.style.borderColor = 'rgba(0,255,136,0.4)';
                      e.target.style.boxShadow =
                        '0 0 0 3px rgba(0,255,136,0.1)';
                    }
                  }}
                  onBlur={(e) => {
                    if (!errors.password) {
                      e.target.style.borderColor = 'rgba(255,255,255,0.10)';
                      e.target.style.boxShadow = 'none';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 text-xs"
                  style={{ color: '#f87171' }}
                >
                  {errors.password.message}
                </motion.p>
              )}
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.98 }}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200"
              style={{
                background: isLoading
                  ? 'rgba(0,255,136,0.5)'
                  : 'linear-gradient(135deg, #00ff88, #00d4ff)',
                color: '#001a0e',
                boxShadow: isLoading
                  ? 'none'
                  : '0 8px 30px rgba(0,255,136,0.35)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </motion.button>
          </motion.form>

          {/* ── Footer ───────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 pt-6 text-center"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Federal Democratic Republic of Ethiopia
            </p>
            <p
              className="mt-1 text-xs"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            >
              © {new Date().getFullYear()} AgroEthiopia MIS v1.0.0
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
