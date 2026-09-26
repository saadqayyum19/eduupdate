import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { GraduationCap, LogIn, Mail } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { loginFailure, loginStart } from '@/features/auth/authSlice';
import { beginSession } from '@/features/auth/session';
import { login } from '@/services/auth';
import { usePublicSettings } from '@/services/api';
import { APP_NAME } from '@/lib/constants';
import { academicYearLabel, useInstitution } from '@/lib/institution';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof schema>;

/** Split-screen login: brand panel on the left, credential form on the right. */
export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const institution = useInstitution();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [error, setError] = useState<string | null>(null);

  // Supplies the institution name and academic year for the brand panel.
  const { data: settings } = usePublicSettings();

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (settings && !settings.configured) navigate('/setup', { replace: true });
  }, [navigate, settings]);

  if (isAuthenticated) return <Navigate to={redirectTo} replace />;

  const onSubmit = async (values: LoginValues) => {
    setError(null);
    dispatch(loginStart());

    try {
      const session = await login(values.email, values.password);
      queryClient.clear();
      beginSession(dispatch, session);
      toast.success(`Welcome back, ${session.user.name.split(' ')[0]}!`);
      navigate(redirectTo, { replace: true });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Sign in failed. Please try again.';
      setError(message);
      dispatch(loginFailure(message));
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="relative hidden w-1/2 flex-col justify-between bg-primary-700 p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white/15">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold">{APP_NAME}</p>
            <p className="text-xs text-primary-100">{institution.name || 'Institution management'}</p>
          </div>
        </div>

        <div>
          <h1 className="max-w-md text-3xl font-semibold leading-snug">
            Run your institution on one clean, dependable system.
          </h1>
          <p className="mt-3 max-w-md text-sm text-primary-100">
            Admissions, attendance, timetable, exams, results and fees — with role-based access for every member of
            staff.
          </p>
        </div>

        <p className="text-xs text-primary-100">
          Academic year {academicYearLabel(institution)} · Fees in {institution.currency}
        </p>
      </div>

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
              <p className="text-xs text-slate-500">{institution.name}</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-slate-900">Sign in to your account</h2>
          <p className="mt-1 text-sm text-slate-500">Use the credentials provided by your administrator.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@school.example"
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
              {...register('password')}
            />

            {error && (
              <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="rounded text-sm font-medium text-primary-700 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" size="lg" fullWidth loading={isSubmitting} leftIcon={<LogIn className="h-4 w-4" />}>
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Accounts are created by your administrator. If you cannot sign in, ask them to reset your password.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
