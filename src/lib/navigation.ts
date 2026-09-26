import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  ClipboardCheck,
  FileBadge,
  FileSpreadsheet,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  Megaphone,
  Network,
  School,
  Receipt,
  Settings2,
  ShieldCheck,
  UserRoundCog,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/types';
import type { Capability } from './permissions';
import type { InstitutionFeature, InstitutionFeatureMap } from '@/services/institutionFeatures';

export type NavSectionId =
  | 'overview'
  | 'admissions'
  | 'academics'
  | 'teaching'
  | 'community'
  | 'finance'
  | 'insights'
  | 'platform';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Capability required to see this item in the sidebar. */
  capability: Capability;
  /** Optional institution toggle required to expose this module. */
  feature?: InstitutionFeature;
  /** Highlight for exactly-matching routes only (e.g. /dashboard). */
  end?: boolean;
  description?: string;
}

export interface NavSection {
  id: NavSectionId;
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        label: 'Dashboard',
        to: '/dashboard',
        icon: LayoutDashboard,
        capability: 'dashboard.view',
        end: true,
      },
    ],
  },
  {
    id: 'admissions',
    label: 'Admissions & people',
    items: [
      { label: 'Students', to: '/students', icon: GraduationCap, capability: 'users.view' },
      { label: 'Teachers', to: '/teachers', icon: UserRoundCog, capability: 'users.view' },
      { label: 'Users', to: '/users', icon: Users, capability: 'users.view' },
    ],
  },
  {
    id: 'academics',
    label: 'Academics',
    items: [
      { label: 'Programs & departments', to: '/programs', icon: Network, capability: 'classes.view' },
      { label: 'Classes', to: '/classes', icon: School, capability: 'classes.view' },
      { label: 'Subjects', to: '/subjects', icon: BookOpen, capability: 'subjects.view' },
    ],
  },
  {
    id: 'teaching',
    label: 'Teaching & learning',
    items: [
      { label: 'Timetable', to: '/timetable', icon: CalendarDays, capability: 'timetable.view', feature: 'timetable' },
      { label: 'Attendance', to: '/attendance', icon: ClipboardCheck, capability: 'attendance.view', feature: 'attendance' },
      { label: 'Assignments', to: '/assignments', icon: ClipboardList, capability: 'quizzes.view', feature: 'assignments' },
      { label: 'Exams', to: '/exams', icon: FileBadge, capability: 'quizzes.view', feature: 'exams' },
      { label: 'Quizzes & tests', to: '/quizzes', icon: FileSpreadsheet, capability: 'quizzes.view', feature: 'quizzes' },
      { label: 'Marks & results', to: '/marks', icon: BarChart3, capability: 'marks.view', feature: 'marks' },
    ],
  },
  {
    id: 'community',
    label: 'Community',
    items: [
      { label: 'Announcements', to: '/announcements', icon: Megaphone, capability: 'announcements.view', feature: 'announcements' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { label: 'Fees', to: '/fees', icon: Wallet, capability: 'fees.view', feature: 'fees' },
      { label: 'Invoices', to: '/fees/invoices', icon: Receipt, capability: 'fees.view', feature: 'fees' },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    items: [
      { label: 'Reports', to: '/reports', icon: BarChart3, capability: 'reports.view', feature: 'reports' },
    ],
  },
  {
    id: 'platform',
    label: 'Platform admin',
    items: [
      { label: 'Institutions', to: '/admin/institutions', icon: Landmark, capability: 'institutions.manage' },
      { label: 'Feature access', to: '/admin/features', icon: Settings2, capability: 'institutions.manage' },
      { label: 'Role matrix', to: '/admin/roles', icon: ShieldCheck, capability: 'institutions.manage' },
      { label: 'Audit log', to: '/admin/audit', icon: ClipboardList, capability: 'audit.view' },
      { label: 'Global analytics', to: '/admin/analytics', icon: BarChart3, capability: 'institutions.manage' },
    ],
  },
];

/** Sidebar sections filtered by role capability — used by the AppShell. */
export function navigationFor(
  isAllowed: (capability: Capability) => boolean,
  features?: InstitutionFeatureMap,
): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      isAllowed(item.capability) && (!features || !item.feature || features[item.feature]),
    ),
  })).filter((section) => section.items.length > 0);
}

/** Minimum role needed to render a route (used by the route guards). */
export interface RouteRoleRule {
  path: string;
  capability: Capability;
  roles?: Role[];
}
