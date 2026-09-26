import { ApiError } from '../../lib/ApiError';
import { DEFAULT_FEATURES } from '../../lib/features';
import { hashPassword } from '../../lib/password';
import { serialiseOne } from '../../lib/serialise';
import { cookieOptions, createRefreshToken, signAccessToken } from '../../lib/tokens';
import { Institution } from '../../models/Institution';
import { Setting } from '../../models/Setting';
import { RefreshToken } from '../../models/RefreshToken';
import { User } from '../../models/User';
import type { SetupInput } from './setup.schema';

/**
 * One-time first-run bootstrap.
 *
 * The database is completely empty on a fresh install — no seed users, no demo classes.
 * This is the only code path that creates the first account. It refuses to run twice.
 */

export async function setupStatus(): Promise<{ needsSetup: boolean }> {
  const userCount = await User.estimatedDocumentCount();
  return { needsSetup: userCount === 0 };
}

export interface SetupResult {
  user: unknown;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  cookie: ReturnType<typeof cookieOptions>;
}

export async function initialiseSetup(
  input: SetupInput,
  context: { ip: string; userAgent: string },
): Promise<SetupResult> {
  if ((await User.estimatedDocumentCount()) > 0) {
    throw ApiError.forbidden('This installation has already been set up. Sign in instead.');
  }

  const existingEmail = await User.findOne({ email: input.adminEmail }).lean();
  if (existingEmail) throw ApiError.conflict('An account with that email address already exists.');

  let institutionId: string | null = null;

  try {
    const institution = await Institution.create({
      name: input.institutionName,
      type: input.institutionType,
      address: input.address,
      phone: input.phone,
      email: input.email,
    });
    institutionId = String(institution._id);

    await Setting.create({
      institutionId,
      academicYearStart: input.academicYearStart,
      academicYearEnd: input.academicYearEnd,
      currency: input.currency,
      timezone: input.timezone,
      features: DEFAULT_FEATURES,
    });

    const admin = await User.create({
      institutionId,
      name: input.adminName,
      email: input.adminEmail,
      role: 'admin',
      status: 'active',
      avatarColor: '#2563eb',
      designation: 'Administrator',
      passwordHash: await hashPassword(input.adminPassword),
    });

    const accessToken = signAccessToken({
      sub: String(admin._id),
      role: admin.role,
      email: admin.email,
    });

    const refresh = createRefreshToken();
    await RefreshToken.create({
      userId: String(admin._id),
      tokenHash: refresh.hash,
      expiresAt: refresh.expiresAt,
      userAgent: context.userAgent,
      ip: context.ip,
    });

    return {
      user: serialiseOne(admin.toObject()),
      accessToken,
      refreshToken: refresh.token,
      refreshExpiresAt: refresh.expiresAt,
      cookie: cookieOptions(refresh.expiresAt),
    };
  } catch (error) {
    // Leave the database empty again so the owner can retry the wizard.
    await User.deleteMany({ email: input.adminEmail });
    if (institutionId) {
      await Setting.deleteMany({ institutionId });
      await Institution.deleteMany({ _id: institutionId });
    }
    throw error;
  }
}
