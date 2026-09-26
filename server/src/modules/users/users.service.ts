import { ApiError } from '../../lib/ApiError';
import { generatePassword, hashPassword, verifyPassword } from '../../lib/password';
import { sendMail } from '../../lib/mailer';
import { combineFilters, paginate, searchOr, skipOf, sortOf } from '../../lib/pagination';
import { serialiseList, serialiseOne } from '../../lib/serialise';
import { fallbackStaffId, purgeUserReferences, reconcileClass } from '../../lib/graph';
import { ClassRoom } from '../../models/ClassRoom';
import { User, type Role } from '../../models/User';
import type { ProfileInput, UserCreateInput, UserQuery, UserUpdateInput } from './users.schema';

const AVATAR_COLORS = [
  '#2563eb', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#6366f1',
];

function colourFor(email: string): string {
  let hash = 0;
  for (let index = 0; index < email.length; index += 1) {
    hash = (hash * 31 + email.charCodeAt(index)) % 100_000;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const SORTABLE: Record<string, string> = {
  name: 'name',
  email: 'email',
  role: 'role',
  status: 'status',
  joinedAt: 'joinedAt',
  createdAt: 'createdAt',
};

/** Paginated, filterable, searchable account list. */
export async function listUsers(query: UserQuery) {
  const search = searchOr(['name', 'email', 'rollNo', 'registrationNo', 'designation'], query.search);

  const filters = combineFilters(
    query.role ? { role: query.role } : undefined,
    query.status ? { status: query.status } : undefined,
    query.classId ? { classId: query.classId } : undefined,
    search ? { $or: search } : undefined,
  );

  const [items, total] = await Promise.all([
    User.find(filters).sort(sortOf(query, SORTABLE, 'name')).skip(skipOf(query)).limit(query.pageSize).lean(),
    User.countDocuments(filters),
  ]);

  return paginate(serialiseList(items), total, query);
}

export async function getUser(id: string): Promise<unknown> {
  const user = await User.findById(id).lean();
  if (!user) throw ApiError.notFound('That account could not be found.');
  return serialiseOne(user);
}

/**
 * Keeps the class / subject / family graph symmetrical after a user is created or edited:
 * students belong to one class, teachers are listed on the classes they teach and
 * parents are linked to their children in both directions.
 */
async function applyMemberships(user: {
  id: string;
  role: Role;
  classId?: string | null;
  classIds?: string[];
  childIds?: string[];
}): Promise<void> {
  const { id, role } = user;

  if (role === 'student') {
    await ClassRoom.updateMany({ studentIds: id, _id: { $ne: user.classId ?? null } }, { $pull: { studentIds: id } });
    if (user.classId) {
      await ClassRoom.updateOne({ _id: user.classId }, { $addToSet: { studentIds: id } });
      await reconcileClass(user.classId);
    }
    return;
  }

  if (role === 'teacher' || role === 'teacher_incharge') {
    const assigned = user.classIds ?? [];
    const current = await ClassRoom.find({ teacherIds: id }).select('_id').lean();
    const stale = current.map((classRoom) => String(classRoom._id)).filter((classId) => !assigned.includes(classId));

    if (stale.length) await ClassRoom.updateMany({ _id: { $in: stale } }, { $pull: { teacherIds: id } });
    for (const classId of assigned) {
      await ClassRoom.updateOne({ _id: classId }, { $addToSet: { teacherIds: id } });
    }
    for (const classId of [...new Set([...assigned, ...stale])]) {
      await reconcileClass(classId);
    }
    return;
  }

  if (role === 'parent') {
    const childIds = user.childIds ?? [];
    await User.updateMany({ childIds: id }, { $pull: { childIds: id } });
    await User.updateMany({ parentIds: id }, { $pull: { parentIds: id } });
    if (childIds.length) {
      await User.updateMany({ _id: { $in: childIds } }, { $addToSet: { parentIds: id } });
    }
  }
}

export interface CreateUserResult {
  user: unknown;
  /** Only returned when the API generated the password, so the admin can hand it over. */
  temporaryPassword?: string;
  invited: boolean;
}

export async function createUser(input: UserCreateInput, actorId: string): Promise<CreateUserResult> {
  const existing = await User.findOne({ email: input.email }).lean();
  if (existing) throw ApiError.conflict('An account with that email address already exists.');

  const generatedPassword = input.password ? undefined : generatePassword();
  const password = input.password ?? generatedPassword ?? generatePassword();

  const created = await User.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    role: input.role,
    status: input.status,
    avatarColor: colourFor(input.email),
    joinedAt: new Date().toISOString().slice(0, 10),
    designation: input.designation,
    classIds: input.classIds,
    subjectIds: input.subjectIds,
    classId: input.classId ?? null,
    rollNo: input.rollNo,
    registrationNo: input.registrationNo,
    fatherName: input.fatherName,
    cnic: input.cnic,
    bform: input.bform,
    dob: input.dob,
    address: input.address,
    photoUrl: input.photoUrl,
    parentIds: input.parentIds,
    childIds: input.childIds,
    passwordHash: await hashPassword(password),
    mustChangePassword: Boolean(generatedPassword),
    createdBy: actorId,
  });

  await applyMemberships({
    id: String(created._id),
    role: created.role,
    classId: created.classId,
    classIds: created.classIds,
    childIds: created.childIds,
  });

  if (input.sendInvite) {
    await sendMail({
      to: created.email,
      subject: 'Your EduCore Lite account',
      text: [
        `Hello ${created.name},`,
        '',
        `An account has been created for you as ${created.role}.`,
        'Sign in with the temporary password below and change it straight away.',
        '',
        `Temporary password: ${password}`,
      ].join('\n'),
    });
  }

  return {
    user: serialiseOne(await User.findById(created._id).lean()),
    temporaryPassword: generatedPassword,
    invited: input.sendInvite,
  };
}

export async function updateUser(id: string, input: UserUpdateInput): Promise<unknown> {
  const account = await User.findById(id).select('+passwordHash');
  if (!account) throw ApiError.notFound('That account could not be found.');

  if (input.email && input.email !== account.email) {
    const clash = await User.findOne({ email: input.email, _id: { $ne: id } }).lean();
    if (clash) throw ApiError.conflict('An account with that email address already exists.');
    account.email = input.email;
    account.avatarColor = colourFor(input.email);
  }

  if (input.name !== undefined) account.name = input.name;
  if (input.phone !== undefined) account.phone = input.phone;
  if (input.role !== undefined) account.role = input.role;
  if (input.status !== undefined) account.status = input.status;
  if (input.designation !== undefined) account.designation = input.designation;
  if (input.classIds !== undefined) account.classIds = input.classIds;
  if (input.subjectIds !== undefined) account.subjectIds = input.subjectIds;
  if (input.classId !== undefined) account.classId = input.classId;
  if (input.rollNo !== undefined) account.rollNo = input.rollNo;
  if (input.registrationNo !== undefined) account.registrationNo = input.registrationNo;
  if (input.fatherName !== undefined) account.fatherName = input.fatherName;
  if (input.cnic !== undefined) account.cnic = input.cnic;
  if (input.bform !== undefined) account.bform = input.bform;
  if (input.dob !== undefined) account.dob = input.dob;
  if (input.address !== undefined) account.address = input.address;
  if (input.photoUrl !== undefined) account.photoUrl = input.photoUrl;
  if (input.parentIds !== undefined) account.parentIds = input.parentIds;
  if (input.childIds !== undefined) account.childIds = input.childIds;

  if (input.password) {
    account.passwordHash = await hashPassword(input.password);
    account.mustChangePassword = false;
    account.lockedUntil = null;
    account.failedLoginAttempts = 0;
  }

  await account.save();

  // Rebuild membership links from scratch so a role change cannot leave stale rows behind.
  await ClassRoom.updateMany({ teacherIds: id }, { $pull: { teacherIds: id } });
  await ClassRoom.updateMany({ studentIds: id }, { $pull: { studentIds: id } });
  await applyMemberships({
    id,
    role: account.role,
    classId: account.classId,
    classIds: account.classIds,
    childIds: account.childIds,
  });

  return serialiseOne(await User.findById(id).lean());
}

export async function deleteUser(id: string, actorId: string): Promise<void> {
  if (id === actorId) {
    throw ApiError.badRequest('You cannot delete the account you are signed in with.');
  }

  const account = await User.findById(id).lean();
  if (!account) throw ApiError.notFound('That account could not be found.');

  if ((await User.countDocuments()) <= 1) {
    throw ApiError.badRequest('The last account cannot be deleted — the installation would become inaccessible.');
  }

  await User.deleteOne({ _id: id });
  await purgeUserReferences(id, await fallbackStaffId());
}

export async function updateOwnProfile(id: string, input: ProfileInput): Promise<unknown> {
  const account = await User.findById(id);
  if (!account) throw ApiError.notFound('That account could not be found.');

  if (input.name !== undefined) account.name = input.name;
  if (input.phone !== undefined) account.phone = input.phone;
  if (input.address !== undefined) account.address = input.address;
  if (input.photoUrl !== undefined) account.photoUrl = input.photoUrl;

  await account.save();
  return serialiseOne(account.toObject());
}

export async function changeOwnPassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
  const account = await User.findById(id).select('+passwordHash');
  if (!account) throw ApiError.notFound('That account could not be found.');

  const matches = await verifyPassword(currentPassword, account.passwordHash);
  if (!matches) throw ApiError.badRequest('Your current password is not correct.');

  account.passwordHash = await hashPassword(newPassword);
  account.mustChangePassword = false;
  await account.save();

  const { RefreshToken } = await import('../../models/RefreshToken');
  await RefreshToken.updateMany({ userId: id, revokedAt: null }, { $set: { revokedAt: new Date() } });
}
