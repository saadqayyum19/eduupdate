import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth, RequireCapability, RequireFeature } from '@/components/guards/Guards';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const DashboardPage = lazy(() => import('@/pages/dashboards/DashboardPage'));
const UsersPage = lazy(() => import('@/pages/users/UsersPage'));
const ClassesPage = lazy(() => import('@/pages/classes/ClassesPage'));
const ClassWizardPage = lazy(() => import('@/pages/classes/ClassWizardPage'));
const ClassDetailPage = lazy(() => import('@/pages/classes/ClassDetailPage'));
const SubjectsPage = lazy(() => import('@/pages/subjects/SubjectsPage'));
const TimetablePage = lazy(() => import('@/pages/timetable/TimetablePage'));
const AttendancePage = lazy(() => import('@/pages/attendance/AttendancePage'));
const QuizzesPage = lazy(() => import('@/pages/quizzes/QuizzesPage'));
const StudentsPage = lazy(() => import('@/pages/students/StudentsPage'));
const StudentWizardPage = lazy(() => import('@/pages/students/StudentsPage').then((module) => ({ default: module.StudentWizardPage })));
const StudentDetailPage = lazy(() => import('@/pages/students/StudentsPage').then((module) => ({ default: module.StudentDetailPage })));
const TeachersPage = lazy(() => import('@/pages/modules/WorkspacePages').then((module) => ({ default: module.TeachersPage })));
const TeacherDetailPage = lazy(() => import('@/pages/modules/WorkspacePages').then((module) => ({ default: module.TeacherDetailPage })));
const ProgramsPage = lazy(() => import('@/pages/modules/WorkspacePages').then((module) => ({ default: module.ProgramsPage })));
const ExamsPage = lazy(() => import('@/pages/modules/WorkspacePages').then((module) => ({ default: module.ExamsPage })));
const AssignmentsPage = lazy(() => import('@/pages/modules/WorkspacePages').then((module) => ({ default: module.AssignmentsPage })));
const FeesPage = lazy(() => import('@/pages/modules/WorkspacePages').then((module) => ({ default: module.FeesPage })));
const AnnouncementsPage = lazy(() => import('@/pages/modules/WorkspacePages').then((module) => ({ default: module.AnnouncementsPage })));
const ReportsPage = lazy(() => import('@/pages/modules/WorkspacePages').then((module) => ({ default: module.ReportsPage })));
const MarksPage = lazy(() => import('@/pages/modules/WorkspacePages').then((module) => ({ default: module.MarksPage })));
const InstitutionsPage = lazy(() => import('@/pages/modules/WorkspacePages').then((module) => ({ default: module.InstitutionsPage })));
const FeaturesAdminPage = lazy(() => import('@/pages/modules/WorkspacePages').then((module) => ({ default: module.FeaturesAdminPage })));
const RolesAdminPage = lazy(() => import('@/pages/modules/WorkspacePages').then((module) => ({ default: module.RolesAdminPage })));
const AuditAdminPage = lazy(() => import('@/pages/modules/WorkspacePages').then((module) => ({ default: module.AuditAdminPage })));
const AdminAnalyticsPage = lazy(() => import('@/pages/modules/WorkspacePages').then((module) => ({ default: module.AdminAnalyticsPage })));

function RouteLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8" role="status" aria-label="Loading page">
      <span className="sr-only">Loading page</span>
      <div aria-hidden="true" className="animate-pulse space-y-5">
        <div className="h-8 w-56 rounded-md bg-slate-200" />
        <div className="h-28 rounded-md bg-slate-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-32 rounded-md bg-slate-100" />
          <div className="h-32 rounded-md bg-slate-100" />
          <div className="h-32 rounded-md bg-slate-100" />
        </div>
      </div>
    </main>
  );
}

/** Friendly catch-all for unknown URLs inside the app shell. */
function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <EmptyState
      icon={<Compass className="h-6 w-6" aria-hidden />}
      title="Page not found"
      description="That page does not exist — it may have been moved or the link is out of date."
      action={<Button onClick={() => navigate('/dashboard')}>Back to dashboard</Button>}
    />
  );
}

/**
 * Application route table.
 *
 * - Public routes (login, forgot password) sit outside the shell.
 * - Everything else renders inside `RequireAuth` → `AppShell` (sidebar + topbar).
 * - Each module route is wrapped in `RequireCapability` using the same
 *   capability as its sidebar entry, so deep links behave like the menu.
 */
export default function App() {
  return (
    <Suspense fallback={<RouteLoading />}>
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Authenticated shell */}
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        <Route path="/teachers" element={<RequireCapability capability="users.view"><TeachersPage /></RequireCapability>} />
        <Route path="/teachers/:teacherId" element={<RequireCapability capability="users.view"><TeacherDetailPage /></RequireCapability>} />
        <Route path="/programs" element={<RequireCapability capability="classes.view"><ProgramsPage /></RequireCapability>} />
        <Route path="/exams" element={<RequireFeature feature="exams"><RequireCapability capability="quizzes.view"><ExamsPage /></RequireCapability></RequireFeature>} />
        <Route path="/assignments" element={<RequireFeature feature="assignments"><RequireCapability capability="quizzes.view"><AssignmentsPage /></RequireCapability></RequireFeature>} />
        <Route path="/fees" element={<RequireFeature feature="fees"><RequireCapability capability="fees.view"><FeesPage /></RequireCapability></RequireFeature>} />
        <Route path="/fees/invoices" element={<RequireFeature feature="fees"><RequireCapability capability="fees.view"><FeesPage /></RequireCapability></RequireFeature>} />
        <Route path="/announcements" element={<RequireFeature feature="announcements"><RequireCapability capability="announcements.view"><AnnouncementsPage /></RequireCapability></RequireFeature>} />
        <Route path="/reports" element={<RequireFeature feature="reports"><RequireCapability capability="reports.view"><ReportsPage /></RequireCapability></RequireFeature>} />
        <Route path="/marks" element={<RequireFeature feature="marks"><RequireCapability capability="marks.view"><MarksPage /></RequireCapability></RequireFeature>} />

        <Route path="/admin/institutions" element={<RequireCapability capability="institutions.manage"><InstitutionsPage /></RequireCapability>} />
        <Route path="/admin/features" element={<RequireCapability capability="institutions.manage"><FeaturesAdminPage /></RequireCapability>} />
        <Route path="/admin/roles" element={<RequireCapability capability="institutions.manage"><RolesAdminPage /></RequireCapability>} />
        <Route path="/admin/audit" element={<RequireCapability capability="audit.view"><AuditAdminPage /></RequireCapability>} />
        <Route path="/admin/analytics" element={<RequireCapability capability="institutions.manage"><AdminAnalyticsPage /></RequireCapability>} />

        <Route
          path="/students"
          element={
            <RequireCapability capability="users.view">
              <StudentsPage />
            </RequireCapability>
          }
        />
        <Route
          path="/students/new"
          element={
            <RequireCapability capability="users.manage">
              <StudentWizardPage />
            </RequireCapability>
          }
        />
        <Route
          path="/students/:studentId/edit"
          element={
            <RequireCapability capability="users.manage">
              <StudentWizardPage />
            </RequireCapability>
          }
        />
        <Route
          path="/students/:studentId"
          element={
            <RequireCapability capability="users.view">
              <StudentDetailPage />
            </RequireCapability>
          }
        />

        <Route
          path="/users"
          element={
            <RequireCapability capability="users.view">
              <UsersPage />
            </RequireCapability>
          }
        />

        <Route
          path="/classes"
          element={
            <RequireCapability capability="classes.view">
              <ClassesPage />
            </RequireCapability>
          }
        />
        <Route
          path="/classes/new"
          element={
            <RequireCapability capability="classes.manage">
              <ClassWizardPage />
            </RequireCapability>
          }
        />
        <Route
          path="/classes/:classId"
          element={
            <RequireCapability capability="classes.view">
              <ClassDetailPage />
            </RequireCapability>
          }
        />

        <Route
          path="/subjects"
          element={
            <RequireCapability capability="subjects.view">
              <SubjectsPage />
            </RequireCapability>
          }
        />
        <Route
          path="/timetable"
          element={
            <RequireFeature feature="timetable">
              <RequireCapability capability="timetable.view"><TimetablePage /></RequireCapability>
            </RequireFeature>
          }
        />
        <Route
          path="/attendance"
          element={
            <RequireFeature feature="attendance">
              <RequireCapability capability="attendance.view"><AttendancePage /></RequireCapability>
            </RequireFeature>
          }
        />

        <Route
          path="/quizzes"
          element={
            <RequireFeature feature="quizzes">
              <RequireCapability capability="quizzes.view"><QuizzesPage /></RequireCapability>
            </RequireFeature>
          }
        />
        {/* Dashboard "Create quiz" links land here and open the create modal. */}
        <Route
          path="/quizzes/new"
          element={
            <RequireFeature feature="quizzes">
              <RequireCapability capability="quizzes.manage"><QuizzesPage autoCreate /></RequireCapability>
            </RequireFeature>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </Suspense>
  );
}
