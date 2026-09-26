import { ApiError } from './ApiError';
import { Institution } from '../models/Institution';
import { Setting, type GradeBand } from '../models/Setting';

/**
 * Single access point for institution + system settings.
 * Modules read their constants from here so nothing is hard-coded.
 */

export interface ResolvedSettings {
  academicYearStart: string;
  academicYearEnd: string;
  term: string;
  currency: string;
  timezone: string;
  gradeBands: GradeBand[];
  feeDefaults: { lateFeePercent: number; taxPercent: number };
  attendanceRules: { workingDays: string[]; lateThresholdMin: number; minAttendancePercent: number };
  features: Record<string, boolean>;
}

export const FALLBACK_SETTINGS: ResolvedSettings = {
  academicYearStart: '',
  academicYearEnd: '',
  term: 'Term 1',
  currency: 'PKR',
  timezone: 'Asia/Karachi',
  gradeBands: [],
  feeDefaults: { lateFeePercent: 0, taxPercent: 0 },
  attendanceRules: { workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], lateThresholdMin: 10, minAttendancePercent: 75 },
  features: {},
};

export async function institutionExists(): Promise<boolean> {
  return (await Institution.estimatedDocumentCount()) > 0;
}

export async function getInstitutionId(): Promise<string> {
  const institution = await Institution.findOne().sort({ createdAt: 1 }).lean();
  if (!institution) throw ApiError.badRequest('This installation has not been set up yet. Run the setup wizard first.');
  return String(institution._id);
}

export async function findSettings(): Promise<ResolvedSettings> {
  const setting = await Setting.findOne().lean();
  if (!setting) return FALLBACK_SETTINGS;

  return {
    academicYearStart: setting.academicYearStart ?? '',
    academicYearEnd: setting.academicYearEnd ?? '',
    term: setting.term ?? FALLBACK_SETTINGS.term,
    currency: setting.currency ?? FALLBACK_SETTINGS.currency,
    timezone: setting.timezone ?? FALLBACK_SETTINGS.timezone,
    gradeBands: (setting.gradeBands ?? []) as GradeBand[],
    feeDefaults: {
      lateFeePercent: setting.feeDefaults?.lateFeePercent ?? 0,
      taxPercent: setting.feeDefaults?.taxPercent ?? 0,
    },
    attendanceRules: {
      workingDays: setting.attendanceRules?.workingDays ?? FALLBACK_SETTINGS.attendanceRules.workingDays,
      lateThresholdMin: setting.attendanceRules?.lateThresholdMin ?? FALLBACK_SETTINGS.attendanceRules.lateThresholdMin,
      minAttendancePercent:
        setting.attendanceRules?.minAttendancePercent ?? FALLBACK_SETTINGS.attendanceRules.minAttendancePercent,
    },
    features: Object.fromEntries((setting.features as Map<string, boolean> | undefined)?.entries() ?? []),
  };
}

/** Grade band lookup used by marks, report cards and dashboard aggregates. */
export function gradeFor(percent: number, bands: GradeBand[]): { grade: string; gpa: number } {
  const match = bands.find((band) => percent >= band.min && percent <= band.max);
  if (match) return { grade: match.grade, gpa: match.gpa };
  if (percent >= 90) return { grade: 'A+', gpa: 4 };
  if (percent >= 80) return { grade: 'A', gpa: 3.7 };
  if (percent >= 70) return { grade: 'B', gpa: 3.3 };
  if (percent >= 60) return { grade: 'C', gpa: 2.7 };
  if (percent >= 50) return { grade: 'D', gpa: 2 };
  if (percent >= 40) return { grade: 'E', gpa: 1 };
  return { grade: 'F', gpa: 0 };
}
