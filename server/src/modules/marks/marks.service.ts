import { ApiError } from '../../lib/ApiError';
import { buildPdf, money } from '../../lib/pdf';
import { combineFilters, paginate, skipOf, sortOf } from '../../lib/pagination';
import { serialiseList, serialiseOne } from '../../lib/serialise';
import { gradeFor, findSettings } from '../../lib/settings';
import { resolveScope, scopedFilter } from '../../lib/scope';
import type { AuthUser } from '../../middleware/auth';
import { ClassRoom } from '../../models/ClassRoom';
import { Mark } from '../../models/Mark';
import { Subject } from '../../models/Subject';
import { User } from '../../models/User';
import type { MarkInput, MarksQuery } from './marks.schema';

const SORTABLE = { date: 'date', title: 'title', score: 'score', createdAt: 'createdAt' };

export async function listMarks(query: MarksQuery, user: AuthUser) {
  const scope = await resolveScope(user);

  const filters = combineFilters(
    scopedFilter(scope, 'classId', query.classId),
    scopedFilter(scope, 'studentId', query.studentId),
    query.subjectId ? { subjectId: query.subjectId } : undefined,
    query.examType ? { examType: query.examType } : undefined,
    query.title ? { title: query.title } : undefined,
  );

  const [items, total] = await Promise.all([
    Mark.find(filters)
      .sort(sortOf(query as never, SORTABLE, 'date'))
      .skip(skipOf(query as never))
      .limit(query.pageSize)
      .lean(),
    Mark.countDocuments(filters),
  ]);

  return paginate(serialiseList(items), total, query as never);
}

/** Upserts one record per student × subject × exam type × title. */
export async function saveMarks(inputs: MarkInput[], user: AuthUser): Promise<unknown[]> {
  const operations = inputs.map((input) => ({
    updateOne: {
      filter: {
        studentId: input.studentId,
        subjectId: input.subjectId,
        examType: input.examType,
        title: input.title,
      },
      update: { $set: { ...input, enteredBy: user.id } },
      upsert: true,
    },
  }));

  await Mark.bulkWrite(operations, { ordered: false });

  const saved = await Mark.find({
    studentId: { $in: [...new Set(inputs.map((input) => input.studentId))] },
    title: { $in: [...new Set(inputs.map((input) => input.title))] },
    examType: { $in: [...new Set(inputs.map((input) => input.examType))] },
  }).lean();

  return serialiseList(saved);
}

export async function deleteMark(id: string): Promise<void> {
  const mark = await Mark.findById(id).lean();
  if (!mark) throw ApiError.notFound('That result could not be found.');
  await Mark.deleteOne({ _id: id });
}

export interface RankedStudent {
  studentId: string;
  name: string;
  rollNo: string;
  obtained: number;
  total: number;
  percentage: number;
  grade: string;
  position: number;
}

async function rankingOf(classId: string): Promise<RankedStudent[]> {
  if (!classId) return [];

  const settings = await findSettings();
  const [students, marks] = await Promise.all([
    User.find({ role: 'student', classId }).select('name rollNo').lean(),
    Mark.find({ classId }).lean(),
  ]);

  return students
    .map((student) => {
      const own = marks.filter((mark) => mark.studentId === String(student._id));
      const obtained = own.reduce((sum, mark) => sum + mark.score, 0);
      const total = own.reduce((sum, mark) => sum + mark.total, 0);
      const percent = total ? Math.round((obtained / total) * 1000) / 10 : 0;
      return {
        studentId: String(student._id),
        name: student.name,
        rollNo: student.rollNo ?? '',
        obtained,
        total,
        percentage: percent,
        grade: percent ? gradeFor(percent, settings.gradeBands).grade : '—',
        position: 0,
      };
    })
    .sort((a, b) => b.percentage - a.percentage)
    .map((row, index) => ({ ...row, position: index + 1 }));
}

/** Class ranking view. */
export async function classRanking(classId: string): Promise<RankedStudent[]> {
  const classRoom = await ClassRoom.findById(classId).lean();
  if (!classRoom) throw ApiError.notFound('That class could not be found.');
  return rankingOf(classId);
}

export interface ReportCard {
  student: { id?: string; name?: string; rollNo?: string } & Record<string, unknown>;
  classRoom: { name?: string; section?: string } & Record<string, unknown>;
  rows: Array<{ subjectId: string; subjectName: string; obtained: number; total: number; percentage: number; grade: string }>;
  totalObtained: number;
  totalMax: number;
  percentage: number;
  grade: string;
  gpa: number;
  position: number;
  classSize: number;
}

/** Builds a printable result card: per-subject totals, overall grade and class position. */
export async function buildReportCard(studentId: string): Promise<ReportCard> {
  const student = await User.findById(studentId).lean();
  if (!student) throw ApiError.notFound('That student could not be found.');

  const settings = await findSettings();
  const classRoom = student.classId ? await ClassRoom.findById(student.classId).lean() : null;
  const subjects = await Subject.find({ _id: { $in: classRoom?.subjectIds ?? [] } }).lean();
  const marks = await Mark.find({ studentId }).lean();

  const rows = (classRoom?.subjectIds ?? [])
    .map((subjectId) => {
      const subjectMarks = marks.filter((mark) => mark.subjectId === subjectId);
      const obtained = subjectMarks.reduce((sum, mark) => sum + mark.score, 0);
      const total = subjectMarks.reduce((sum, mark) => sum + mark.total, 0);
      const percent = total ? Math.round((obtained / total) * 1000) / 10 : 0;
      return {
        subjectId,
        subjectName: subjects.find((subject) => String(subject._id) === subjectId)?.name ?? 'Subject',
        obtained,
        total,
        percentage: percent,
        grade: gradeFor(percent, settings.gradeBands).grade,
      };
    })
    .filter((row) => row.total > 0);

  const totalObtained = rows.reduce((sum, row) => sum + row.obtained, 0);
  const totalMax = rows.reduce((sum, row) => sum + row.total, 0);
  const percent = totalMax ? Math.round((totalObtained / totalMax) * 1000) / 10 : 0;
  const ranking = await rankingOf(student.classId ?? '');
  const position = ranking.findIndex((row) => row.studentId === studentId) + 1;

  const graded = gradeFor(percent, settings.gradeBands);

  return {
    student: serialiseOne(student),
    classRoom: serialiseOne(classRoom),
    rows,
    totalObtained,
    totalMax,
    percentage: percent,
    grade: graded.grade,
    gpa: graded.gpa,
    position: Math.max(1, position),
    classSize: student.classId ? await User.countDocuments({ role: 'student', classId: student.classId }) : 1,
  };
}

/** Result card as a downloadable PDF. */
export async function reportCardPdf(studentId: string, institutionName: string): Promise<Buffer> {
  const card = await buildReportCard(studentId);

  const lines = card.rows.flatMap((row) => [
    { text: `${row.subjectName}  ·  ${row.obtained}/${row.total}  ·  ${row.percentage}%  ·  Grade ${row.grade}`, size: 10 },
  ]);

  return buildPdf({
    title: 'Result card',
    subtitle: `${institutionName} · ${card.student.name ?? 'Student'}${
      card.classRoom?.name ? ` · ${card.classRoom.name} ${card.classRoom.section ?? ''}` : ''
    }`,
    lines: [
      { text: `Roll number: ${card.student.rollNo || '—'}`, bold: true, gap: 10 },
      { text: `Position ${card.position} of ${card.classSize}`, gap: 4 },
      ...lines,
      { text: '', gap: 10 },
      { text: `Total: ${card.totalObtained} / ${card.totalMax}`, bold: true, size: 12, gap: 10 },
      { text: `Percentage: ${card.percentage}%   Grade: ${card.grade}   GPA: ${card.gpa}`, bold: true, size: 12 },
      { text: '', gap: 16 },
      { text: 'Generated by EduCore Lite', size: 8 },
    ],
  });
}

export { money };
