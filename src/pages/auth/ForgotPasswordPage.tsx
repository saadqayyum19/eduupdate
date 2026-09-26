import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, GraduationCap, MailCheck, Send } from 'lucide-react';
import { requestPasswordReset } from '@/services/auth';
import { APP_NAME } from '@/lib/constants';
import { useInstitution } from '@/lib/institution';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

type ForgotValues = z.infer<typeof schema>;

/** Requests a reset link. The response never reveals whether the address exists. */
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const institution = useInstitution();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const onSubmit = async (values: ForgotValues) => {
    setError(null);
    try {
      await requestPasswordReset(values.email);
      setSentTo(values.email);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send the reset link. Please try again.');
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
            <p className="text-xs text-slate-500">{institution.name || 'Password help'}</p>
          </div>
        </div>

        {sentTo ? (
          <div className="text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <MailCheck className="h-6 w-6" aria-hidden />
            </span>
            <h1 className="text-lg font-semibold text-slate-900">Check your email</h1>
            <p className="mt-1 text-sm text-slate-500">
              If an account exists for <span className="font-medium text-slate-700">{sentTo}</span>, a password reset
              link has been sent. The link expires in 60 minutes.
            </p>
            <Button className="mt-6" variant="outline" onClick={() => setSentTo(null)}>
              Use a different email
            </Button>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back to sign in
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-slate-900">Forgot your password?</h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter the email address on your account and we will send you a reset link.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
              <Input
                label="Email address"
                type="email"
                autoComplete="email"
                placeholder="you@school.example"
                required
                leftIcon={<MailCheck className="h-4 w-4" aria-hidden />}
                error={errors.email?.message}
                {...register('email')}
              />

              {error && (
                <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" fullWidth loading={isSubmitting} leftIcon={<Send className="h-4 w-4" />}>
                Send reset link
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
