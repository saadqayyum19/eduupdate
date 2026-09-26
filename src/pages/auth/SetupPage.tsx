import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, GraduationCap, Rocket, UserRound } from 'lucide-react';
import { useAppDispatch } from '@/app/hooks';
import { beginSession } from '@/features/auth/session';
import { initializeSetup } from '@/services/auth';
import { usePublicSettings } from '@/services/api';
import { APP_NAME, CURRENCIES, TIMEZONES } from '@/lib/constants';
import { refreshAccessToken } from '@/services/http';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Stepper, type Step } from '@/components/ui/Stepper';
import { useToast } from '@/components/ui/Toast';

const currentYear = new Date().getFullYear();

const schema = z
  .object({
    institutionName: z.string().trim().min(2, 'Enter the institution name'),
    institutionType: z.enum(['school', 'college', 'university']),
    address: z.string().trim().max(300).default(''),
    phone: z.string().trim().max(40).default(''),
    email: z.string().trim().email('Enter a valid email address').or(z.literal('')).default(''),
    academicYearStart: z.string().trim().regex(/^\d{4}$/, 'Use a four digit year'),
    academicYearEnd: z.string().trim().regex(/^\d{4}$/, 'Use a four digit year'),
    currency: z.string().trim().length(3, 'Pick a currency'),
    timezone: z.string().trim().min(3, 'Pick a timezone'),
    adminName: z.string().trim().min(2, 'Enter your full name'),
    adminEmail: z.string().trim().email('Enter a valid email address'),
    adminPassword: z
      .string()
      .min(10, 'At least 10 characters')
      .regex(/[A-Z]/, 'Include an upper case letter')
      .regex(/[a-z]/, 'Include a lower case letter')
      .regex(/[0-9]/, 'Include a number'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.adminPassword === values.confirmPassword, {
    message: 'The two passwords do not match',
    path: ['confirmPassword'],
  });

type SetupValues = z.infer<typeof schema>;

const STEPS: Step[] = [
  { id: 'institution', label: 'Institution', description: 'Name, type and contact details' },
  { id: 'academic', label: 'Academic year', description: 'Year, currency and timezone' },
  { id: 'admin', label: 'Administrator', description: 'Your sign-in account' },
  { id: 'review', label: 'Review', description: 'Confirm and create' },
];

/** Fields validated before each step can advance. */
const STEP_FIELDS: Array<Array<keyof SetupValues>> = [
  ['institutionName', 'institutionType', 'address', 'phone', 'email'],
  ['academicYearStart', 'academicYearEnd', 'currency', 'timezone'],
  ['adminName', 'adminEmail', 'adminPassword', 'confirmPassword'],
  [],
];

export default function SetupPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { data: settings } = usePublicSettings();

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SetupValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      institutionName: '',
      institutionType: 'school',
      address: '',
      phone: '',
      email: '',
      academicYearStart: String(currentYear),
      academicYearEnd: String(currentYear + 1),
      currency: 'PKR',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Karachi',
      adminName: '',
      adminEmail: '',
      adminPassword: '',
      confirmPassword: '',
    },
  });

  // Once an account exists the wizard is closed for good.
  useEffect(() => {
    if (settings?.configured) navigate('/login', { replace: true });
  }, [navigate, settings]);

  if (settings?.configured) return <Navigate to="/login" replace />;

  const values = watch();

  const next = async () => {
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const onSubmit = async (input: SetupValues) => {
    setError(null);
    try {
      const session = await initializeSetup({
        institutionName: input.institutionName,
        institutionType: input.institutionType,
        address: input.address ?? '',
        phone: input.phone ?? '',
        email: input.email ?? '',
        academicYearStart: input.academicYearStart,
        academicYearEnd: input.academicYearEnd,
        currency: input.currency,
        timezone: input.timezone,
        adminName: input.adminName,
        adminEmail: input.adminEmail,
        adminPassword: input.adminPassword,
      });

      beginSession(dispatch, session);
      // Prime the runtime profile so the shell shows the new institution immediately.
      await refreshAccessToken();
      toast.success('Welcome aboard', `${input.institutionName} is ready to use.`);
      navigate('/dashboard', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Setup could not be completed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-600 text-white">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{APP_NAME} setup</p>
            <p className="text-sm text-slate-500">
              Welcome! Let&rsquo;s create your institution and the first administrator account.
            </p>
          </div>
        </div>

        <Stepper
          steps={STEPS}
          currentIndex={step}
          onStepClick={(index) => index <= step && setStep(index)}
          className="mb-6"
        />

        <Card className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {step === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Building2 className="h-4 w-4 text-primary-600" aria-hidden /> Institution details
                </div>
                <Input
                  label="Institution name"
                  required
                  placeholder="e.g. Greenfield Public School"
                  error={errors.institutionName?.message}
                  {...register('institutionName')}
                />
                <Select
                  label="Institution type"
                  required
                  options={[
                    { label: 'School', value: 'school' },
                    { label: 'College', value: 'college' },
                    { label: 'University', value: 'university' },
                  ]}
                  error={errors.institutionType?.message}
                  {...register('institutionType')}
                />
                <Textarea
                  label="Address"
                  rows={2}
                  placeholder="Street, city, country"
                  error={errors.address?.message}
                  {...register('address')}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Phone"
                    placeholder="+92 300 0000000"
                    error={errors.phone?.message}
                    {...register('phone')}
                  />
                  <Input
                    label="Institution email"
                    type="email"
                    placeholder="office@school.example"
                    error={errors.email?.message}
                    {...register('email')}
                  />
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <CheckCircle2 className="h-4 w-4 text-primary-600" aria-hidden /> Academic year &amp; locale
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Academic year starts"
                    required
                    placeholder="2025"
                    error={errors.academicYearStart?.message}
                    {...register('academicYearStart')}
                  />
                  <Input
                    label="Academic year ends"
                    required
                    placeholder="2026"
                    error={errors.academicYearEnd?.message}
                    {...register('academicYearEnd')}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Currency"
                    required
                    options={CURRENCIES.map((code) => ({ label: code, value: code }))}
                    error={errors.currency?.message}
                    {...register('currency')}
                  />
                  <Select
                    label="Timezone"
                    required
                    options={TIMEZONES.map((zone) => ({ label: zone, value: zone }))}
                    error={errors.timezone?.message}
                    {...register('timezone')}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Fees, receipts and reports use this currency. The timezone drives attendance and timetable dates.
                </p>
              </motion.div>
            )}
            {step === 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <UserRound className="h-4 w-4 text-primary-600" aria-hidden /> Administrator account
                </div>
                <Input
                  label="Your full name"
                  required
                  placeholder="e.g. Ayesha Khan"
                  error={errors.adminName?.message}
                  {...register('adminName')}
                />
                <Input
                  label="Sign-in email"
                  type="email"
                  required
                  placeholder="you@school.example"
                  error={errors.adminEmail?.message}
                  {...register('adminEmail')}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    required
                    error={errors.adminPassword?.message}
                    {...register('adminPassword')}
                  />
                  <Input
                    label="Confirm password"
                    type="password"
                    autoComplete="new-password"
                    required
                    error={errors.confirmPassword?.message}
                    {...register('confirmPassword')}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Minimum 10 characters with an upper case letter, a lower case letter and a number.
                </p>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Rocket className="h-4 w-4 text-primary-600" aria-hidden /> Review
                </div>
                <dl className="divide-y divide-slate-100 rounded-md border border-slate-200">
                  {[
                    ['Institution', values.institutionName || '—'],
                    ['Type', values.institutionType],
                    ['Academic year', `${values.academicYearStart} – ${values.academicYearEnd}`],
                    ['Currency', values.currency],
                    ['Timezone', values.timezone],
                    ['Administrator', `${values.adminName} (${values.adminEmail})`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                      <dt className="text-slate-500">{label}</dt>
                      <dd className="text-right font-medium text-slate-800">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-xs text-slate-500">
                  Everything else — classes, subjects, staff, students and fees — is created by you after signing in.
                </p>
              </motion.div>
            )}

            {error && (
              <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <Button
                variant="outline"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={step === 0}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Back
              </Button>

              {step < STEPS.length - 1 ? (
                <Button onClick={() => void next()} rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Continue
                </Button>
              ) : (
                <Button type="submit" loading={isSubmitting} leftIcon={<Rocket className="h-4 w-4" />}>
                  Create my institution
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

