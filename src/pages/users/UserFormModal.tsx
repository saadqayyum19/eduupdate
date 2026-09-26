import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Role, User } from '@/types';
import { useClasses, useCreateUser, useUpdateUser, useUsers, type UserInput } from '@/services/api';
import { ROLE_LABELS } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

const STAFF_ROLES: Role[] = ['super_admin', 'admin', 'principal', 'teacher_incharge', 'teacher'];

const schema = z
  .object({
    name: z.string().min(2, 'Enter the full name'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    phone: z.string().optional(),
    role: z.enum(['super_admin', 'admin', 'principal', 'teacher_incharge', 'teacher', 'student', 'parent']),
    status: z.enum(['active', 'inactive']),
    designation: z.string().optional(),
    classId: z.string().optional(),
    rollNo: z.string().optional(),
    registrationNo: z.string().optional(),
    fatherName: z.string().optional(),
    cnic: z.string().optional(),
    bform: z.string().optional(),
    dob: z.string().optional(),
    address: z.string().optional(),
    photoUrl: z.string().url('Enter a valid photo URL').or(z.literal('')).optional(),
    childId: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.role === 'student' && !values.classId) {
      ctx.addIssue({ code: 'custom', path: ['classId'], message: 'Pick the class for this student' });
    }
    if (values.role === 'parent' && !values.childId) {
      ctx.addIssue({ code: 'custom', path: ['childId'], message: 'Link a child to this parent account' });
    }
  });

type UserFormValues = z.infer<typeof schema>;

/** Add / edit any user (admin, principal, teacher, student or parent) in one form. */
export function UserFormModal({
  open,
  onClose,
  user,
  lockedRole,
}: {
  open: boolean;
  onClose: () => void;
  user?: User | null;
  /** When opened from a role tab, the role is preselected. */
  lockedRole?: Role;
}) {
  const { data: classes = [] } = useClasses();
  const { data: students = [] } = useUsers({ role: 'student' });
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: lockedRole ?? 'student', status: 'active' },
  });

  const role = watch('role');

  useEffect(() => {
    if (!open) return;
    reset({
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      role: user?.role ?? lockedRole ?? 'student',
      status: user?.status ?? 'active',
      designation: user?.designation ?? '',
      classId: user?.classId ?? '',
      rollNo: user?.rollNo ?? '',
      registrationNo: user?.registrationNo ?? '',
      fatherName: user?.fatherName ?? '',
      cnic: user?.cnic ?? '',
      bform: user?.bform ?? '',
      dob: user?.dob ?? '',
      address: user?.address ?? '',
      photoUrl: user?.photoUrl ?? '',
      childId: user?.childIds?.[0] ?? '',
    });
  }, [lockedRole, open, reset, user]);

  const onSubmit = async (values: UserFormValues) => {
    const isStaff = STAFF_ROLES.includes(values.role);
    const input: UserInput = {
      name: values.name,
      email: values.email,
      phone: values.phone,
      role: values.role,
      status: values.status,
      designation: isStaff ? values.designation : undefined,
      classId: values.role === 'student' ? values.classId : undefined,
      rollNo: values.role === 'student' ? values.rollNo : undefined,
      registrationNo: values.role === 'student' ? values.registrationNo : undefined,
      fatherName: values.role === 'student' ? values.fatherName : undefined,
      cnic: values.role === 'student' ? values.cnic : undefined,
      bform: values.role === 'student' ? values.bform : undefined,
      dob: values.role === 'student' ? values.dob : undefined,
      address: values.role === 'student' ? values.address : undefined,
      photoUrl: values.role === 'student' ? values.photoUrl : undefined,
      childIds: values.role === 'parent' && values.childId ? [values.childId] : [],
    };

    try {
      if (user) {
        await updateUser.mutateAsync({ id: user.id, input });
        toast.success('User updated', `${values.name}'s details were saved.`);
      } else {
        await createUser.mutateAsync(input);
        toast.success('User added', `${values.name} can now sign in.`);
      }
      onClose();
    } catch (error) {
      toast.error('Could not save user', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? `Edit ${user.name}` : 'Add a new user'}
      description="Accounts are created instantly in this demo — no email confirmation needed."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={createUser.isPending || updateUser.isPending}>
            {user ? 'Save changes' : 'Add user'}
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Input label="Full name" required error={errors.name?.message} {...register('name')} />
        <Input label="Email" type="email" required error={errors.email?.message} {...register('email')} />
        <Input label="Phone" placeholder="+91 98110 00000" {...register('phone')} />
        <Select
          label="Role"
          required
          disabled={Boolean(lockedRole)}
          options={(Object.keys(ROLE_LABELS) as Role[]).map((value) => ({ label: ROLE_LABELS[value], value }))}
          {...register('role')}
        />

        {STAFF_ROLES.includes(role) && (
          <Input
            label="Designation"
            placeholder="e.g. Mathematics Teacher"
            containerClassName="sm:col-span-2"
            {...register('designation')}
          />
        )}

        {role === 'student' && (
          <>
            <Select
              label="Class"
              required
              placeholder="Select class"
              options={classes.map((classRoom) => ({
                label: `${classRoom.name} — ${classRoom.section}`,
                value: classRoom.id,
              }))}
              error={errors.classId?.message}
              {...register('classId')}
            />
            <Input label="Roll number" placeholder="10A-05" {...register('rollNo')} />
            <Input label="Registration number" {...register('registrationNo')} />
            <Input label="Father's name" {...register('fatherName')} />
            <Input label="CNIC" placeholder="XXXXX-XXXXXXX-X" {...register('cnic')} />
            <Input label="B-form number" {...register('bform')} />
            <Input label="Date of birth" type="date" {...register('dob')} />
            <Input label="Address" containerClassName="sm:col-span-2" {...register('address')} />
            <Input
              label="Photo URL"
              type="url"
              error={errors.photoUrl?.message}
              containerClassName="sm:col-span-2"
              {...register('photoUrl')}
            />
          </>
        )}

        {role === 'parent' && (
          <Select
            label="Child"
            required
            placeholder="Select student"
            containerClassName="sm:col-span-2"
            options={students.map((student) => ({
              label: `${student.name} (${student.rollNo ?? 'no roll no.'})`,
              value: student.id,
            }))}
            error={errors.childId?.message}
            {...register('childId')}
          />
        )}

        <Select
          label="Account status"
          options={[
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
          ]}
          {...register('status')}
        />
      </form>

    </Modal>
  );
}
