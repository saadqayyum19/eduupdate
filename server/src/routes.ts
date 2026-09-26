import { Router, type Express } from 'express';
import { apiLimiter, authLimiter } from './middleware/rateLimit';
import { announcementsRouter } from './modules/announcements/announcements.routes';
import { attendanceRouter } from './modules/attendance/attendance.routes';
import { authRouter } from './modules/auth/auth.routes';
import { classesRouter } from './modules/classes/classes.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { feesRouter } from './modules/fees/fees.routes';
import { marksRouter } from './modules/marks/marks.routes';
import { quizzesRouter } from './modules/quizzes/quizzes.routes';
import { reportsRouter } from './modules/reports/reports.routes';
import { settingsRouter } from './modules/settings/settings.routes';
import { setupRouter } from './modules/setup/setup.routes';
import { subjectsRouter } from './modules/subjects/subjects.routes';
import { timetableRouter } from './modules/timetable/timetable.routes';
import { usersRouter } from './modules/users/users.routes';

/** Authenticated feature modules, all behind the per-user rate limit. */
export const apiRouter = Router();

apiRouter.use('/users', usersRouter);
apiRouter.use('/classes', classesRouter);
apiRouter.use('/subjects', subjectsRouter);
apiRouter.use('/timetable', timetableRouter);
apiRouter.use('/attendance', attendanceRouter);
apiRouter.use('/quizzes', quizzesRouter);
apiRouter.use('/marks', marksRouter);
apiRouter.use('/fees', feesRouter);
apiRouter.use('/announcements', announcementsRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/reports', reportsRouter);

/** Mounts every module. Auth + setup get the stricter per-IP limiter. */
export function mountApi(app: Express): void {
  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/setup', authLimiter, setupRouter);
  app.use('/api', apiLimiter, apiRouter);
}
