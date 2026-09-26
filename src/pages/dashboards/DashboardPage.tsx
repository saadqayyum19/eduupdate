import { usePermissions } from '@/hooks/usePermissions';
import { AdminDashboard } from './AdminDashboard';
import { ParentDashboard } from './ParentDashboard';
import { PrincipalDashboard } from './PrincipalDashboard';
import { StudentDashboard } from './StudentDashboard';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { TeacherDashboard } from './TeacherDashboard';
import { TeacherInchargeDashboard } from './TeacherInchargeDashboard';

export { AdminDashboard, ParentDashboard, PrincipalDashboard, StudentDashboard, SuperAdminDashboard, TeacherDashboard, TeacherInchargeDashboard };

/**
 * `/dashboard` renders exactly one of the seven role dashboards.
 * Having one route keeps the sidebar simple while each role still gets a
 * purpose-built screen.
 */
export default function DashboardPage() {
  const { role } = usePermissions();

  switch (role) {
    case 'super_admin':
      return <SuperAdminDashboard />;
    case 'admin':
      return <AdminDashboard />;
    case 'principal':
      return <PrincipalDashboard />;
    case 'teacher_incharge':
      return <TeacherInchargeDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'student':
      return <StudentDashboard />;
    case 'parent':
      return <ParentDashboard />;
    default:
      return <AdminDashboard />;
  }
}
