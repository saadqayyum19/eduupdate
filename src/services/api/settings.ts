import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { applyInstitutionSettings } from '@/lib/institution';
import { http } from '../http';
import { applyFeatures, type InstitutionFeatureMap } from '../institutionFeatures';

/**
 * Institution profile + system settings.
 *
 * `GET /settings/public` is the only settings call that works without a session: the login
 * screen, the setup wizard and the app shell all need the school name before signing in.
 * The full settings document (grade bands, fee defaults, SMTP, features) is admin-only.
 */

export interface PublicSettingsPayload {
  configured: boolean;
  institutionName: string;
  institutionType: 'school' | 'college' | 'university';
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  academicYearStart: string;
  academicYearEnd: string;
  term: string;
  currency: string;
  timezone: string;
  features: InstitutionFeatureMap;
}

export interface FullSettings {
  institution: {
    name: string;
    type: 'school' | 'college' | 'university';
    address: string;
    phone: string;
    email: string;
    logoUrl: string;
  };
  academicYearStart: string;
  academicYearEnd: string;
  term: string;
  currency: string;
  timezone: string;
  gradeBands: Array<{ grade: string; gpa: number; min: number; max: number }>;
  feeDefaults: { lateFeePercent: number; taxPercent: number };
  attendanceRules: { workingDays: string[]; lateThresholdMin: number; minAttendancePercent: number };
  smtp: { host: string; port: number; secure: boolean; user: string; from: string; hasPassword: boolean };
  features: InstitutionFeatureMap;
}

export const settingsKeys = {
  all: ['settings'] as const,
  public: () => [...settingsKeys.all, 'public'] as const,
  detail: () => [...settingsKeys.all, 'detail'] as const,
};

/** Loads the public settings and pushes them into the runtime stores. */
export async function fetchPublicSettings(): Promise<PublicSettingsPayload> {
  const { data } = await http.get<PublicSettingsPayload>('/settings/public');

  if (data.configured) {
    applyInstitutionSettings({
      institutionName: data.institutionName,
      institutionType: data.institutionType,
      address: data.address,
      phone: data.phone,
      email: data.email,
      logoUrl: data.logoUrl,
      academicYearStart: data.academicYearStart,
      academicYearEnd: data.academicYearEnd,
      term: data.term,
      currency: data.currency,
      timezone: data.timezone,
    });
  }

  applyFeatures(data.features);
  return data;
}

export async function fetchSettings(): Promise<FullSettings> {
  const { data } = await http.get<{ settings: FullSettings }>('/settings');
  return data.settings;
}

export async function updateSettings(input: Record<string, unknown>): Promise<void> {
  await http.patch('/settings', input);
}

export async function updateFeatures(patch: Partial<InstitutionFeatureMap>): Promise<InstitutionFeatureMap> {
  const { data } = await http.patch<{ features: InstitutionFeatureMap }>('/settings/features', patch);
  applyFeatures(data.features);
  return data.features;
}

/** Downloads the JSON backup produced by the API. */
export async function downloadBackup(): Promise<void> {
  const response = await http.get<Blob>('/settings/backup', { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `educore-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function wipeAllData(confirmName: string): Promise<void> {
  await http.post('/settings/wipe', { confirmName });
}

// ---------------------------------------------------------------------------- hooks

export function usePublicSettings() {
  return useQuery({ queryKey: settingsKeys.public(), queryFn: fetchPublicSettings, staleTime: 5 * 60_000 });
}

export function useSettings(enabled = true) {
  return useQuery({ queryKey: settingsKeys.detail(), queryFn: fetchSettings, enabled });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      // Refresh the runtime profile so the shell shows the new name immediately.
      void fetchPublicSettings();
    },
  });
}

export function useUpdateFeatures() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateFeatures,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.all }),
  });
}
