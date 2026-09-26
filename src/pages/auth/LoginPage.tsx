import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { GraduationCap, LogIn, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  authenticate,
  loginErrorMessage,
  loginFailure,
  loginStart,
  loginSuccess,
  switchRole,
} from '@/features/auth/authSlice';
import { APP_NAME, ROLE_LABELS, ROLE_ORDER, SCHOOL_NAME } from '@/lib/constants';
import { DEMO_PASSWORD } from '@/mocks/users';
import { sleep } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import type { Role } from '@/types';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginValues = z.infer<typeof schema>;

/** Split-screen login: brand story on the left, simple form on the right. */
export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'admin@educore.test', password: DEMO_PASSWORD },
  });

  // Already signed in? Never show the login form twice.
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const onSubmit = async (values: LoginValues) => {
    setError(null);
    dispatch(loginStart());
    await sleep(400); // pretend we are calling the JWT endpoint

    const result = authenticate(values.email, values.password);
    if (!result.ok) {
      const message = loginErrorMessage(result.reason);
      setError(message);
      dispatch(loginFailure(message));
      return;
    }

    // Drop any cached data from a previous session before showing the new one.
    queryClient.clear();
    dispatch(loginSuccess({ user: result.user, token: result.token }));
    toast.success(`Welcome back, ${result.user.name.split(' ')[0]}!`);
    navigate(redirectTo, { replace: true });
  };

  const quickLogin = async (role: Role) => {
    setValue('email', `${role}@educore.test`);
    queryClient.clear();
    dispatch(switchRole(role));
    toast.info(`Signed in as ${ROLE_LABELS[role]}`, 'Demo shortcut — no password needed.');
    await sleep(150);
    navigate('/dashboard');
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-primary-700 p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white/15">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold">{APP_NAME}</p>
            <p className="text-xs text-primary-100">{SCHOOL_NAME}</p>
          </div>
        </div>

        <div>
          <h1 className="max-w-md text-3xl font-semibold leading-snug">
            Simple school management that teachers actually enjoy using.
          </h1>
          <ul className="mt-8 space-y-3 text-sm text-primary-50">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" aria-hidden /> Attendance, marks, quizzes and fees in one place
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" aria-hidden /> Built for admins, teachers, students and parents
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" aria-hidden /> Nothing to install — works on any device
            </li>
          </ul>
        </div>

        <p className="text-xs text-primary-100">
          UI prototype • sample data only • the Node + Express + MongoDB API comes next
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center px-5 py-10 lg:w-1/2">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="w-full max-w-md"
        >
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-600 text-white">
              <GraduationCap className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">{APP_NAME}</p>
              <p className="text-xs text-slate-500">{SCHOOL_NAME}</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-slate-900">Sign in to your account</h2>
          <p className="mt-1 text-sm text-slate-500">
            Use a demo account below, or type any school email with the demo password.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@school.test"
              required
              leftIcon={<Mail className="h-4 w-4" aria-hidden />}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              error={errors.password?.message}
              hint={`Demo password: ${DEMO_PASSWORD}`}
              {...register('password')}
            />

            {error && (
              <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link to="/forgot-password" className="rounded text-sm font-medium text-primary-700 hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" size="lg" fullWidth loading={isSubmitting} leftIcon={<LogIn className="h-4 w-4" />}>
              Sign in
            </Button>
          </form>

          <div className="mt-8 rounded-md border border-slate-200 bg-white p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-primary-600" aria-hidden />
              Quick demo logins
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {ROLE_ORDER.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => void quickLogin(role)}
                  className="rounded-md border border-slate-200 px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:border-primary-300 hover:bg-primary-50"
                >
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
