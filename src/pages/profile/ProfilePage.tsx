import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, Save, ShieldCheck, UserRound } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAppDispatch } from '@/app/hooks';
import { updateProfile } from '@/features/auth/authSlice';
import { changeMyPassword } from '@/services/auth';
import { useUpdateMyProfile } from '@/services/api';
import { ROLE_LABELS } from '@/lib/constants';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(120),
  phone: z.string().trim().max(40).default(''),
  address: z.string().trim().max(300).default(''),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(10, 'At least 10 characters')
      .regex(/[A-Z]/, 'Include an upper case letter')
      .regex(/[a-z]/, 'Include a lower case letter')
      .regex(/[0-9]/, 'Include a number'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'The two passwords do not match',
    path: ['confirmPassword'],
  });

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

/** Self-service profile: contact details and password. Works for every role. */
export default function ProfilePage() {
  const { user } = usePermissions();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const updateProfileMutation = useUpdateMyProfile();
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      address: user?.address ?? '',
    },
  });

  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  if (!user) return null;

  const saveProfile = async (values: ProfileValues) => {
    const updated = await updateProfileMutation.mutateAsync(values);
    dispatch(updateProfile(updated));
    toast.success('Profile updated');
  };

  const savePassword = async (values: PasswordValues) => {
    setPasswordError(null);
    try {
      await changeMyPassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      passwordForm.reset();
      toast.success('Password changed', 'Other devices have been signed out.');
      navigate('/dashboard');
    } catch (caught) {
      setPasswordError(caught instanceof Error ? caught.message : 'Could not change your password.');
    }
  };

  return (
    <div>
      <PageHeader
        title="My profile"
        description="Your account details and password."
        icon={<UserRound className="h-5 w-5" />}
        crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'My profile' }]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center py-2 text-center">
            <Avatar name={user.name} color={user.avatarColor} />
            <p className="mt-3 text-base font-semibold text-slate-900">{user.name}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
            <div className="mt-3 flex items-center gap-2">
              <Badge>{ROLE_LABELS[user.role]}</Badge>
              <Badge tone={user.status === 'active' ? 'success' : 'neutral'}>{user.status}</Badge>
            </div>
            {user.designation && <p className="mt-2 text-xs text-slate-500">{user.designation}</p>}
            <p className="mt-4 text-xs text-slate-400">Joined {user.joinedAt}</p>
          </div>
        </Card>
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Contact details" subtitle="Shown to staff who need to reach you." />
            <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4" noValidate>
              <Input
                label="Full name"
                required
                error={profileForm.formState.errors.name?.message}
                {...profileForm.register('name')}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Phone"
                  error={profileForm.formState.errors.phone?.message}
                  {...profileForm.register('phone')}
                />
                <Input label="Email" value={user.email} readOnly disabled />
              </div>
              <Input
                label="Address"
                error={profileForm.formState.errors.address?.message}
                {...profileForm.register('address')}
              />
              <div className="flex justify-end">
                <Button type="submit" loading={updateProfileMutation.isPending} leftIcon={<Save className="h-4 w-4" />}>
                  Save changes
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader title="Change password" subtitle="Signing in elsewhere will require the new password." />
            <form onSubmit={passwordForm.handleSubmit(savePassword)} className="space-y-4" noValidate>
              <Input
                label="Current password"
                type="password"
                autoComplete="current-password"
                required
                leftIcon={<KeyRound className="h-4 w-4" aria-hidden />}
                error={passwordForm.formState.errors.currentPassword?.message}
                {...passwordForm.register('currentPassword')}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  required
                  error={passwordForm.formState.errors.newPassword?.message}
                  {...passwordForm.register('newPassword')}
                />
                <Input
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                  required
                  error={passwordForm.formState.errors.confirmPassword?.message}
                  {...passwordForm.register('confirmPassword')}
                />
              </div>

              {passwordError && (
                <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {passwordError}
                </p>
              )}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  loading={passwordForm.formState.isSubmitting}
                  leftIcon={<ShieldCheck className="h-4 w-4" />}
                >
                  Update password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
