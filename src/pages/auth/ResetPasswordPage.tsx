import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, GraduationCap, KeyRound, ShieldCheck } from 'lucide-react';
import { resetPassword } from '@/services/auth';
import { APP_NAME } from '@/lib/constants';
import { useInstitution } from '@/lib/institution';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

/** Mirrors the server policy: 10+ characters with upper, lower and a digit. */
const schema = z
  .object({
    password: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .regex(/[A-Z]/, 'Include an upper case letter')
      .regex(/[a-z]/, 'Include a lower case letter')
      .regex(/[0-9]/, 'Include a number'),
    confirm: z.string().min(1, 'Confirm your new password'),
  })
  .refine((values) => values.password === values.confirm, {
    message: 'The two passwords do not match',
    path: ['confirm'],
  });

type ResetValues = z.infer<typeof schema>;

/** Consumes the one-time token from the reset email and sets a new password. */
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const institution = useInstitution();
  const [error, setError] = useState<string | null>(null);
  const token = params.get('token') ?? '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: ResetValues) => {
    setError(null);
    try {
      await resetPassword({ token, password: values.password });
      toast.success('Password updated', 'Sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That reset link could not be used.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-card"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-600 text-white">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{APP_NAME}</p>
            <p className="text-xs text-slate-500">{institution.name || 'Choose a new password'}</p>
          </div>
        </div>

        {!token ? (
          <div className="text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <KeyRound className="h-6 w-6" aria-hidden />
            </span>
            <h1 className="text-lg font-semibold text-slate-900">This link is incomplete</h1>
            <p className="mt-1 text-sm text-slate-500">
              Open the reset link from your email again, or request a fresh one.
            </p>
            <Button className="mt-6" onClick={() => navigate('/forgot-password')}>
              Request a new link
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-slate-900">Choose a new password</h1>
            <p className="mt-1 text-sm text-slate-500">
              At least 10 characters with an upper case letter, a lower case letter and a number.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
              <Input
                label="New password"
                type="password"
                autoComplete="new-password"
                required
                error={errors.password?.message}
                {...register('password')}
              />

              <Input
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                required
                error={errors.confirm?.message}
                {...register('confirm')}
              />

              {error && (
                <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                fullWidth
                loading={isSubmitting}
                leftIcon={<ShieldCheck className="h-4 w-4" />}
              >
                Update password
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back to sign in
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
