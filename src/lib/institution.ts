import { useSyncExternalStore } from 'react';

/**
 * Institution profile + academic year, loaded from `GET /api/settings`.
 *
 * Nothing here is hard-coded: the school name, academic year, currency and timezone all come
 * from the database (written by the one-time setup wizard and editable in Settings).
 */

export type InstitutionType = 'school' | 'college' | 'university';

export interface InstitutionProfile {
  name: string;
  type: InstitutionType;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  academicYearStart: string;
  academicYearEnd: string;
  term: string;
  currency: string;
  timezone: string;
  /** True once the profile has been fetched from the API. */
  loaded: boolean;
}

const EMPTY: InstitutionProfile = {
  name: '',
  type: 'school',
  address: '',
  phone: '',
  email: '',
  logoUrl: '',
  academicYearStart: '',
  academicYearEnd: '',
  term: '',
  currency: 'PKR',
  timezone: 'Asia/Karachi',
  loaded: false,
};

export interface PublicSettings {
  institutionName: string;
  institutionType: InstitutionType;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  academicYearStart: string;
  academicYearEnd: string;
  term?: string;
  currency: string;
  timezone: string;
}

let profile: InstitutionProfile = { ...EMPTY };
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getInstitution(): InstitutionProfile {
  return profile;
}

export function applyInstitutionSettings(settings: PublicSettings): InstitutionProfile {
  profile = {
    name: settings.institutionName ?? '',
    type: settings.institutionType ?? 'school',
    address: settings.address ?? '',
    phone: settings.phone ?? '',
    email: settings.email ?? '',
    logoUrl: settings.logoUrl ?? '',
    academicYearStart: settings.academicYearStart ?? '',
    academicYearEnd: settings.academicYearEnd ?? '',
    term: settings.term ?? '',
    currency: settings.currency ?? 'PKR',
    timezone: settings.timezone ?? 'Asia/Karachi',
    loaded: true,
  };
  emit();
  return profile;
}

export function resetInstitution(): void {
  profile = { ...EMPTY };
  emit();
}

export function subscribeInstitution(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React binding — re-renders when the institution profile changes. */
export function useInstitution(): InstitutionProfile {
  return useSyncExternalStore(subscribeInstitution, getInstitution, getInstitution);
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  PKR: 'Rs',
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED',
  SAR: 'SAR',
  AUD: 'A$',
  CAD: 'C$',
  MYR: 'RM',
  NGN: '₦',
  KES: 'KSh',
  BDT: '৳',
  LKR: 'Rs',
};

export function currencySymbol(code: string | undefined): string {
  const key = (code ?? profile.currency ?? 'PKR').toUpperCase();
  return CURRENCY_SYMBOLS[key] ?? key;
}

/** "2025 – 2026" or an em dash while the settings are still loading. */
export function academicYearLabel(source: InstitutionProfile = profile): string {
  if (!source.academicYearStart || !source.academicYearEnd) return '—';
  return `${source.academicYearStart} – ${source.academicYearEnd}`;
}
