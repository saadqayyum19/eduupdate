import { Router, type Request, type Response, type NextFunction } from 'express';
import { User } from '../models/User';
import { ClassRoom } from '../models/ClassRoom';
import { Subject } from '../models/Subject';
import { Institution } from '../models/Institution';
import { ok } from '../utils/response';
import { protect } from '../middleware/auth';

export const searchRouter = Router();
searchRouter.use(protect);

interface SearchHit {
  id: string;
  label: string;
  hint: string;
  group: 'People' | 'Classes' | 'Subjects' | 'Institutions';
  to: string;
}

/**
 * GET /api/v1/search?q= — global search, **scoped by the caller's role**:
 * - students/parents: pages only (no people/class directories)
 * - teachers: people limited to their classes; classes limited to their own
 * - admins+: full people/class/subject directories in their institution
 */
searchRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (q.length < 2) {
      ok(res, { results: [] as SearchHit[] });
      return;
    }
    const regex = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    const auth = req.auth!;
    const results: SearchHit[] = [];

    const canViewUsers = ['super_admin', 'admin', 'principal'].includes(auth.role);
    const canViewClasses = !['student', 'parent'].includes(auth.role);
    const canViewSubjects = !['student', 'parent'].includes(auth.role);

    if (canViewUsers) {
      const filter: Record<string, unknown> = {
        $or: [{ name: regex }, { email: regex }, { registrationNo: regex }, { rollNo: regex }],
      };
      if (auth.role !== 'super_admin' && auth.inst) filter.institutionId = auth.inst;
      const users = await User.find(filter).limit(5).lean();
      users.forEach((user) => {
        results.push({
          id: String(user._id),
          label: user.name,
          hint: `${user.role.replace('_', ' ')}${user.rollNo ? ` • ${user.rollNo}` : ''}`,
          group: 'People',
          to: '/users',
        });
      });
    }

    if (canViewClasses) {
      const filter: Record<string, unknown> = { $or: [{ name: regex }, { section: regex }, { room: regex }] };
      if (auth.inst && auth.role !== 'super_admin') filter.institutionId = auth.inst;
      if (auth.role === 'teacher' || auth.role === 'teacher_incharge') {
        const teacher = await User.findById(auth.sub).lean();
        filter._id = { $in: (teacher?.classIds ?? []) };
      }
      const classes = await ClassRoom.find(filter).limit(5).lean();
      classes.forEach((classRoom) => {
        results.push({
          id: String(classRoom._id),
          label: `${classRoom.name} — ${classRoom.section}`,
          hint: classRoom.room || 'Class',
          group: 'Classes',
          to: `/classes/${classRoom._id}`,
        });
      });
    }

    if (canViewSubjects) {
      const filter: Record<string, unknown> = { $or: [{ name: regex }, { code: regex }] };
      if (auth.inst && auth.role !== 'super_admin') filter.institutionId = auth.inst;
      const subjects = await Subject.find(filter).limit(5).lean();
      subjects.forEach((subject) => {
        results.push({
          id: String(subject._id),
          label: subject.name,
          hint: subject.code,
          group: 'Subjects',
          to: '/subjects',
        });
      });
    }

    // Super admin also searches institutions.
    if (auth.role === 'super_admin') {
      const institutions = await Institution.find({ name: regex }).limit(3).lean();
      institutions.forEach((inst) => {
        results.push({
          id: String(inst._id),
          label: inst.name,
          hint: `${inst.type} institution`,
          group: 'Institutions',
          to: `/institutions/${inst._id}`,
        });
      });
    }

    ok(res, { results });
  } catch (error) {
    next(error);
  }
});
