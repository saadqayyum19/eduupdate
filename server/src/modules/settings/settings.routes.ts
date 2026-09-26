import { Router } from 'express';
import { ApiError } from '../../lib/ApiError';
import { asyncHandler } from '../../lib/asyncHandler';
import { DEFAULT_FEATURES, FEATURE_KEYS, resolveFeatures } from '../../lib/features';
import { findSettings, FALLBACK_SETTINGS } from '../../lib/settings';
import { serialiseOne } from '../../lib/serialise';
import { authenticate } from '../../middleware/auth';
import { requireCapability } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { Announcement } from '../../models/Announcement';
import { Attendance } from '../../models/Attendance';
import { ClassRoom } from '../../models/ClassRoom';
import { FeePayment } from '../../models/FeePayment';
import { FeeStructure } from '../../models/FeeStructure';
import { Institution } from '../../models/Institution';
import { Mark } from '../../models/Mark';
import { Quiz } from '../../models/Quiz';
import { QuizSubmission } from '../../models/QuizSubmission';
import { RefreshToken } from '../../models/RefreshToken';
import { Setting } from '../../models/Setting';
import { Subject } from '../../models/Subject';
import { TimetableSlot } from '../../models/TimetableSlot';
import { User } from '../../models/User';
import { featurePatchSchema, settingsUpdateSchema, wipeSchema } from './settings.schema';

/* ------------------------------------------------------------------ public read */

/**
 * Public settings: what the login screen, the setup wizard and the shell need before
 * a session exists. Never includes SMTP credentials or any personal data.
 */
export const getPublicSettings = asyncHandler(async (_req, res) => {
  const institution = await Institution.findOne().sort({ createdAt: 1 }).lean();

  if (!institution) {
    res.json({
      configured: false,
      institutionName: '',
      institutionType: 'school',
      academicYearStart: '',
      academicYearEnd: '',
      term: FALLBACK_SETTINGS.term,
      currency: FALLBACK_SETTINGS.currency,
      timezone: FALLBACK_SETTINGS.timezone,
      features: DEFAULT_FEATURES,
    });
    return;
  }

  const settings = await findSettings();

  res.json({
    configured: true,
    institutionName: institution.name,
    institutionType: institution.type,
    address: institution.address ?? '',
    phone: institution.phone ?? '',
    email: institution.email ?? '',
    logoUrl: institution.logoUrl ?? '',
    academicYearStart: settings.academicYearStart,
    academicYearEnd: settings.academicYearEnd,
    term: settings.term,
    currency: settings.currency,
    timezone: settings.timezone,
    features: resolveFeatures(settings.features),
  });
});

/* ----------------------------------------------------------------- full settings */

export const getSettings = asyncHandler(async (_req, res) => {
  const [institution, setting] = await Promise.all([
    Institution.findOne().sort({ createdAt: 1 }).lean(),
    Setting.findOne().lean(),
  ]);

  if (!institution || !setting) {
    throw ApiError.badRequest('This installation has not been set up yet.');
  }

  res.json({
    settings: {
      institution: {
        name: institution.name,
        type: institution.type,
        address: institution.address ?? '',
        phone: institution.phone ?? '',
        email: institution.email ?? '',
        logoUrl: institution.logoUrl ?? '',
      },
      academicYearStart: setting.academicYearStart,
      academicYearEnd: setting.academicYearEnd,
      term: setting.term,
      currency: setting.currency,
      timezone: setting.timezone,
      gradeBands: setting.gradeBands,
      feeDefaults: setting.feeDefaults,
      attendanceRules: setting.attendanceRules,
      // The SMTP password is never sent back; only whether one is stored.
      smtp: {
        host: setting.smtp?.host ?? '',
        port: setting.smtp?.port ?? 587,
        secure: setting.smtp?.secure ?? false,
        user: setting.smtp?.user ?? '',
        from: setting.smtp?.from ?? '',
        hasPassword: Boolean(setting.smtp?.pass),
      },
      features: resolveFeatures(
        Object.fromEntries((setting.features as Map<string, boolean> | undefined)?.entries() ?? []),
      ),
    },
  });
});

export const patchSettings = asyncHandler(async (req, res) => {
  const input = req.body as Record<string, never>;

  const [institution, setting] = await Promise.all([Institution.findOne(), Setting.findOne()]);
  if (!institution || !setting) throw ApiError.badRequest('This installation has not been set up yet.');

  const institutionInput = (input as { institution?: Record<string, unknown> }).institution;
  if (institutionInput) Object.assign(institution, institutionInput);
  await institution.save();

  const { institution: _ignored, ...rest } = input as Record<string, unknown>;
  Object.assign(setting, rest);
  await setting.save();

  res.json({ ok: true });
});

export const patchFeatures = asyncHandler(async (req, res) => {
  const setting = await Setting.findOne();
  if (!setting) throw ApiError.badRequest('This installation has not been set up yet.');

  const current = resolveFeatures(Object.fromEntries((setting.features as Map<string, boolean>)?.entries() ?? []));
  const next = { ...current, ...(req.body as Record<string, boolean>) };

  setting.features = new Map(FEATURE_KEYS.map((key) => [key, next[key]])) as never;
  await setting.save();

  res.json({ features: next });
});

/* ---------------------------------------------------------------- backup + wipe */

/** Full JSON export of every collection (credentials excluded). */
export const exportBackup = asyncHandler(async (_req, res) => {
  const [
    institution,
    setting,
    users,
    classes,
    subjects,
    timetable,
    attendance,
    quizzes,
    submissions,
    marks,
    structures,
    payments,
    announcements,
  ] = await Promise.all([
    Institution.findOne().lean(),
    Setting.findOne().lean(),
    User.find().lean(),
    ClassRoom.find().lean(),
    Subject.find().lean(),
    TimetableSlot.find().lean(),
    Attendance.find().lean(),
    Quiz.find().lean(),
    QuizSubmission.find().lean(),
    Mark.find().lean(),
    FeeStructure.find().lean(),
    FeePayment.find().lean(),
    Announcement.find().lean(),
  ]);

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    institution: serialiseOne(institution),
    settings: serialiseOne(setting),
    users: users.map((user) => serialiseOne(user)),
    classes: classes.map((item) => serialiseOne(item)),
    subjects: subjects.map((item) => serialiseOne(item)),
    timetable: timetable.map((item) => serialiseOne(item)),
    attendance: attendance.map((item) => serialiseOne(item)),
    quizzes: quizzes.map((item) => serialiseOne(item)),
    quizSubmissions: submissions.map((item) => serialiseOne(item)),
    marks: marks.map((item) => serialiseOne(item)),
    feeStructures: structures.map((item) => serialiseOne(item)),
    feePayments: payments.map((item) => serialiseOne(item)),
    announcements: announcements.map((item) => serialiseOne(item)),
  };

  const stamp = new Date().toISOString().slice(0, 10);
  res
    .type('application/json')
    .setHeader('Content-Disposition', `attachment; filename="educore-backup-${stamp}.json"`)
    .send(JSON.stringify(payload, null, 2));
});

/**
 * Danger zone: deletes every school record. The institution profile, its settings and the
 * account that asked for the wipe are kept so the installation stays usable.
 */
export const wipeData = asyncHandler(async (req, res) => {
  const institution = await Institution.findOne().lean();
  const expected = (institution?.name ?? '').trim().toLowerCase();
  const typed = String((req.body as { confirmName: string }).confirmName).trim().toLowerCase();

  if (!expected || typed !== expected) {
    throw ApiError.badRequest('The name you typed does not match the institution name.');
  }

  const actorId = req.user!.id;

  const removed = await Promise.all([
    ClassRoom.deleteMany({}),
    Subject.deleteMany({}),
    TimetableSlot.deleteMany({}),
    Attendance.deleteMany({}),
    Quiz.deleteMany({}),
    QuizSubmission.deleteMany({}),
    Mark.deleteMany({}),
    FeeStructure.deleteMany({}),
    FeePayment.deleteMany({}),
    Announcement.deleteMany({}),
    RefreshToken.deleteMany({}),
    User.deleteMany({ _id: { $ne: actorId } }),
  ]);

  await Setting.updateOne({}, { $set: { features: DEFAULT_FEATURES } });

  res.json({
    ok: true,
    removed: {
      classes: removed[0].deletedCount,
      subjects: removed[1].deletedCount,
      timetable: removed[2].deletedCount,
      attendance: removed[3].deletedCount,
      quizzes: removed[4].deletedCount,
      submissions: removed[5].deletedCount,
      marks: removed[6].deletedCount,
      feeStructures: removed[7].deletedCount,
      feePayments: removed[8].deletedCount,
      announcements: removed[9].deletedCount,
      accounts: removed[11].deletedCount,
    },
  });
});

/* ---------------------------------------------------------------------- router */

export const settingsRouter = Router();

settingsRouter.get('/public', getPublicSettings);

settingsRouter.use(authenticate);
settingsRouter.get('/', requireCapability('settings.manage'), getSettings);
settingsRouter.patch('/', requireCapability('settings.manage'), validate({ body: settingsUpdateSchema }), patchSettings);
settingsRouter.patch(
  '/features',
  requireCapability('settings.manage'),
  validate({ body: featurePatchSchema }),
  patchFeatures,
);
settingsRouter.get('/backup', requireCapability('settings.manage'), exportBackup);
settingsRouter.post('/wipe', requireCapability('settings.manage'), validate({ body: wipeSchema }), wipeData);
