import { Router, type Request, type Response, type NextFunction } from 'express';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { User } from '../models/User';
import { ClassRoom } from '../models/ClassRoom';
import { Institution } from '../models/Institution';
import { ApiError } from '../utils/ApiError';
import { protect, requireAnyCapability, requireCapability } from '../middleware/auth';
import { requireFeature } from '../middleware/features';

export const documentsRouter = Router();
documentsRouter.use(protect, requireFeature('reports'));

function tenantFilter(req: Request): Record<string, unknown> {
  if (req.auth!.role === 'super_admin') {
    return req.query.institutionId ? { institutionId: String(req.query.institutionId) } : {};
  }
  return { institutionId: req.auth!.inst };
}

function pdfColor(hex: string) {
  const normalized = /^#[\da-f]{6}$/i.test(hex) ? hex.slice(1) : '2563eb';
  return rgb(
    Number.parseInt(normalized.slice(0, 2), 16) / 255,
    Number.parseInt(normalized.slice(2, 4), 16) / 255,
    Number.parseInt(normalized.slice(4, 6), 16) / 255,
  );
}

function printable(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, '?');
}

async function sendPdf(res: Response, bytes: Uint8Array, filename: string): Promise<void> {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(Buffer.from(bytes));
}

async function findStudent(req: Request, studentId: string) {
  const student = await User.findOne({ _id: studentId, role: 'student', ...tenantFilter(req) }).lean();
  if (!student) throw ApiError.notFound('Student not found in this institution');

  if (req.auth!.role === 'student' && String(student._id) !== req.auth!.sub) {
    throw ApiError.forbidden('Not your student record');
  }
  if (req.auth!.role === 'parent') {
    const parent = await User.findById(req.auth!.sub).select('childIds').lean();
    if (!(parent?.childIds ?? []).map(String).includes(String(student._id))) {
      throw ApiError.forbidden('Not your child');
    }
  }
  return student;
}

/** GET /api/v1/documents/students/:studentId/id-card */
documentsRouter.get(
  '/students/:studentId/id-card',
  requireAnyCapability(['users.view', 'marks.viewOwn', 'fees.viewOwn']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const student = await findStudent(req, req.params.studentId);
      const [institution, classRoom] = await Promise.all([
        Institution.findById(student.institutionId).select('name primaryColor academicYear').lean(),
        student.classId ? ClassRoom.findOne({ _id: student.classId, ...tenantFilter(req) }).select('name section').lean() : null,
      ]);
      const pdf = await PDFDocument.create();
      const page = pdf.addPage([360, 220]);
      const regular = await pdf.embedFont(StandardFonts.Helvetica);
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
      const primary = pdfColor(institution?.primaryColor ?? '#2563eb');
      page.drawRectangle({ x: 0, y: 150, width: 360, height: 70, color: primary });
      page.drawText(printable(institution?.name ?? 'EduCore'), { x: 18, y: 190, size: 13, font: bold, color: rgb(1, 1, 1) });
      page.drawText('STUDENT IDENTIFICATION', { x: 18, y: 169, size: 8, font: regular, color: rgb(1, 1, 1) });
      page.drawCircle({ x: 42, y: 111, size: 22, color: primary });
      page.drawText(printable(student.name.slice(0, 1).toUpperCase()), {
        x: 37, y: 106, size: 14, font: bold, color: rgb(1, 1, 1),
      });
      page.drawText(printable(student.name), { x: 76, y: 127, size: 13, font: bold, color: rgb(0.12, 0.18, 0.28) });
      page.drawText(printable(`Father: ${student.fatherName || '-'}`), { x: 76, y: 108, size: 9, font: regular });
      page.drawText(printable(`Class: ${classRoom ? `${classRoom.name} - ${classRoom.section}` : '-'}`), { x: 76, y: 91, size: 9, font: regular });
      page.drawText(printable(`Roll: ${student.rollNo || '-'}   Reg: ${student.registrationNo || '-'}`), {
        x: 18, y: 60, size: 9, font: regular,
      });
      page.drawText(printable(`Academic year: ${institution?.academicYear || '-'}`), { x: 18, y: 42, size: 9, font: regular });
      page.drawLine({ start: { x: 18, y: 28 }, end: { x: 342, y: 28 }, thickness: 0.6, color: primary });

      const fileId = String(student.rollNo || student._id).replace(/[^\w-]/g, '_');
      await sendPdf(res, await pdf.save(), `id-card-${fileId}.pdf`);
    } catch (error) {
      next(error);
    }
  },
);

/** GET /api/v1/documents/students/:studentId/certificate?title=... */
documentsRouter.get(
  '/students/:studentId/certificate',
  requireCapability('reports.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const student = await findStudent(req, req.params.studentId);
      const [institution, classRoom] = await Promise.all([
        Institution.findById(student.institutionId).select('name primaryColor').lean(),
        student.classId ? ClassRoom.findOne({ _id: student.classId, ...tenantFilter(req) }).select('name section').lean() : null,
      ]);
      const title = String(req.query.title ?? 'Certificate of Completion').trim().slice(0, 80);
      const pdf = await PDFDocument.create();
      const page = pdf.addPage([842, 595]);
      const regular = await pdf.embedFont(StandardFonts.Helvetica);
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
      const primary = pdfColor(institution?.primaryColor ?? '#2563eb');
      page.drawRectangle({ x: 22, y: 22, width: 798, height: 551, borderColor: primary, borderWidth: 2 });
      page.drawText(printable(institution?.name ?? 'EduCore'), {
        x: 70, y: 500, size: 21, font: bold, color: primary,
      });
      page.drawText('CERTIFICATE', { x: 70, y: 430, size: 30, font: bold, color: rgb(0.12, 0.18, 0.28) });
      page.drawText(printable(title.toUpperCase()), { x: 70, y: 385, size: 14, font: bold, color: primary });
      page.drawText('This is to certify that', { x: 70, y: 335, size: 12, font: regular });
      page.drawText(printable(student.name), { x: 70, y: 292, size: 24, font: bold, color: rgb(0.12, 0.18, 0.28) });
      page.drawText(printable(`Registration number: ${student.registrationNo || '-'}`), { x: 70, y: 255, size: 11, font: regular });
      page.drawText(printable(`Class: ${classRoom ? `${classRoom.name} - ${classRoom.section}` : '-'}`), { x: 70, y: 232, size: 11, font: regular });
      page.drawText(`Issued ${new Date().toISOString().slice(0, 10)}`, { x: 70, y: 160, size: 10, font: regular });
      page.drawLine({ start: { x: 580, y: 125 }, end: { x: 760, y: 125 }, thickness: 0.8, color: primary });
      page.drawText('Authorized signature', { x: 610, y: 105, size: 9, font: regular });

      const fileId = String(student.registrationNo || student._id).replace(/[^\w-]/g, '_');
      await sendPdf(res, await pdf.save(), `certificate-${fileId}.pdf`);
    } catch (error) {
      next(error);
    }
  },
);