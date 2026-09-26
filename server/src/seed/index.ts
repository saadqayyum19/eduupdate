import bcrypt from 'bcryptjs';
import { connectDb, disconnectDb } from '../config/db';
import { Institution } from '../models/Institution';
import { User } from '../models/User';
import { Program } from '../models/Program';
import { ClassRoom } from '../models/ClassRoom';
import { Subject } from '../models/Subject';
import { TimetableSlot } from '../models/TimetableSlot';
import { TeacherAssignment } from '../models/TeacherAssignment';
import { Attendance } from '../models/Attendance';
import { Mark } from '../models/Mark';
import { FeeStructure, FeeInvoice } from '../models/Fee';
import { Announcement } from '../models/Announcement';
import { Quiz, QuizSubmission } from '../models/Quiz';
import { Assignment, AssignmentSubmission } from '../models/Assignment';
import {
  INSTITUTION, SEED_PASSWORD, STAFF, TEACHERS, PROGRAMS, SUBJECTS,
  STUDENT_NAMES, PARENT_NAMES, FATHER_NAMES, DAYS,
} from './data';

/** Deterministic pseudo-random so reseeds look identical. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20250925);
const pick = <T>(items: T[]): T => items[Math.floor(rand() * items.length)];
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

async function seed(): Promise<void> {
  await connectDb();
  console.log('Seeding EduCore (TEVTA Gujranwala style)…');

  // Wipe everything first — idempotent reseeds.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const collections: import('mongoose').Model<any>[] = [TeacherAssignment, TimetableSlot, Attendance, Mark, FeeInvoice, FeeStructure,
    AssignmentSubmission, Assignment, Announcement, QuizSubmission, Quiz, ClassRoom, Subject, Program, User, Institution];
  await Promise.all(collections.map((model) => model.deleteMany({})));

  // --- institution ---------------------------------------------------------
  const institution = await Institution.create({
    ...INSTITUTION,
    features: {
      fees: true, transport: false, hostel: false, library: true, assignments: true,
      quizzes: true, analytics: true, chat: true, announcements: true,
      attendance: true, timetable: true, marks: true, reports: true,
    },
  });
  const instId = institution._id;
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626',
    '#db2777', '#4f46e5', '#0d9488', '#ca8a04', '#9333ea', '#0284c7'];
  const color = (i: number) => AVATAR_COLORS[i % AVATAR_COLORS.length];

  // --- staff ---------------------------------------------------------------
  const users: InstanceType<typeof User>[] = [];
  for (const [i, staff] of STAFF.entries()) {
    users.push(await User.create({
      name: staff.name, email: staff.email, passwordHash, role: staff.role,
      designation: staff.designation, avatarColor: color(i),
      institutionId: staff.role === 'super_admin' ? null : instId,
      phone: `+92 300 ${1000000 + i}`,
    }));
  }

  const teachers: InstanceType<typeof User>[] = [];
  for (const [i, name] of TEACHERS.entries()) {
    teachers.push(await User.create({
      name,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@educore.test`,
      passwordHash, role: 'teacher', designation: 'Technical Teacher',
      avatarColor: color(i + 7), institutionId: instId,
      phone: `+92 301 ${2000000 + i}`,
    }));
  }
  // Incharges are also teachers with assignments.
  const incharges = users.filter((u) => u.role === 'teacher_incharge');
  const allTeachers = [...incharges, ...teachers];

  // --- programs ------------------------------------------------------------
  const programs: InstanceType<typeof Program>[] = [];
  for (const p of PROGRAMS) {
    programs.push(await Program.create({
      institutionId: instId, name: p.name, code: p.code, type: 'college',
      level: p.level, department:
        p.code.startsWith('CIT') ? 'Computer & Information Technology' :
        p.code === 'DAE-FT' ? 'Footwear Technology' :
        p.code === 'DAE-LT' ? 'Leather Technology' : 'Short Courses',
      durationYears: p.years, semestersPerYear: 2, totalCreditHours: p.credits,
    }));
  }

  // --- classes: 3 programs × 3 years + 3 special batches = 12 --------------
  interface SeededClass {
    doc: InstanceType<typeof ClassRoom>;
    programCode: string;
    subjects: InstanceType<typeof Subject>[];
  }
  const classes: SeededClass[] = [];
  const programByCode = Object.fromEntries(programs.map((p) => [p.code, p]));

  for (const p of PROGRAMS.filter((x) => x.code.startsWith('DAE'))) {
    for (let year = 1; year <= 3; year += 1) {
      const doc = await ClassRoom.create({
        institutionId: instId, programId: programByCode[p.code]._id,
        name: `${p.code} — Year ${year}`, section: 'A', year, semester: year * 2 - 1,
        room: `Room ${100 + classes.length}`, teacherIds: [], studentIds: [], subjectIds: [],
      });
      classes.push({ doc, programCode: p.code, subjects: [] });
    }
  }
  for (const p of PROGRAMS.filter((x) => x.code.startsWith('SC-'))) {
    const doc = await ClassRoom.create({
      institutionId: instId, programId: programByCode[p.code]._id,
      name: `${p.code} — Batch 1`, section: 'A', year: 1, semester: 1,
      room: `Lab ${classes.length - 8}`, teacherIds: [], studentIds: [], subjectIds: [],
    });
    classes.push({ doc, programCode: p.code, subjects: [] });
  }

  // --- subjects: shared per program, attached to that program's 3 classes ---
  const subjectByProgram = new Map<string, InstanceType<typeof Subject>[]>();
  for (const p of PROGRAMS) {
    const created: InstanceType<typeof Subject>[] = [];
    const ownClasses = classes.filter((c) => c.programCode === p.code);
    for (const [i, s] of SUBJECTS[p.code].entries()) {
      const doc = await Subject.create({
        institutionId: instId, programId: programByCode[p.code]._id,
        name: s.name, code: s.code, creditHours: s.credits,
        classIds: ownClasses.map((c) => c.doc._id),
        color: ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706'][i % 5],
      });
      created.push(doc);
      for (const cls of ownClasses) cls.doc.subjectIds.push(doc._id);
      await Promise.all(ownClasses.map((c) => c.doc.save()));
    }
    subjectByProgram.set(p.code, created);
  }

  // --- students: 40 spread across the 12 classes ---------------------------
  const students: InstanceType<typeof User>[] = [];
  for (const [i, name] of STUDENT_NAMES.entries()) {
    const cls = classes[i % classes.length];
    const rollNo = `${cls.doc.name.replace(/\D+/g, '').slice(0, 3) || 'B'}-${String((i % 14) + 1).padStart(2, '0')}`;
    const student = await User.create({
      name, email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@student.educore.test`,
      passwordHash, role: 'student', avatarColor: color(i + 3), institutionId: instId,
      classId: cls.doc._id, rollNo,
      registrationNo: `TEVTA-GRA-${2025}${String(i + 1).padStart(4, '0')}`,
      fatherName: FATHER_NAMES[i],
      cnic: `${int(31000, 38999)}-${int(1000000, 9999999)}-${int(1, 9)}`,
      dob: `200${int(5, 9)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
      address: `${pick(['Gujranwala', 'Wazirabad', 'Gujrat', 'Sialkot', 'Sheikhupura'])}, Punjab`,
      parentIds: [],
    });
    cls.doc.studentIds.push(student._id);
    await cls.doc.save();
    students.push(student);
  }

  // --- parents: 6 linked to the first 6 students ---------------------------
  const parents: InstanceType<typeof User>[] = [];
  for (const [i, name] of PARENT_NAMES.entries()) {
    const child = students[i];
    const parent = await User.create({
      name, email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@family.educore.test`,
      passwordHash, role: 'parent', avatarColor: color(i + 1), institutionId: instId,
      phone: `+92 322 ${3000000 + i}`, childIds: [child._id],
    });
    child.parentIds = [parent._id];
    await child.save();
    parents.push(parent);
  }

  // --- teacher incharge + teacher assignments -------------------------------
  for (const cls of classes) {
    const programTeachers = allTeachers.filter((_, idx) => idx % classes.length === classes.indexOf(cls));
    const incharge = programTeachers[0] ?? allTeachers[0];
    cls.doc.inchargeId = incharge._id;
    cls.doc.teacherIds = programTeachers.map((t) => t._id);
    await cls.doc.save();
    for (const teacher of programTeachers) {
      if (!teacher.classIds.some((id) => String(id) === String(cls.doc._id))) {
        teacher.classIds.push(cls.doc._id);
      }
      await teacher.save();
    }
  }

  // --- timetable: 1 week, period-wise grid per class ------------------------
  const slotDocs: Array<Record<string, unknown>> = [];
  for (const cls of classes) {
    const subjects = subjectByProgram.get(cls.programCode) ?? [];
    const teacherPool = cls.doc.teacherIds;
    for (const [d, day] of DAYS.entries()) {
      for (let period = 1; period <= 6; period += 1) {
        const subject = subjects[(d * 6 + period) % subjects.length];
        const teacherId = teacherPool[(d + period) % Math.max(1, teacherPool.length)];
        if (!subject || !teacherId) continue;
        slotDocs.push({
          institutionId: instId, classId: cls.doc._id, day, period,
          subjectId: subject._id, teacherId, room: cls.doc.room,
        });
      }
    }
  }
  await TimetableSlot.insertMany(slotDocs);
  await TeacherAssignment.insertMany(
    slotDocs.map(({ institutionId, classId, day, period, subjectId, teacherId }) => ({
      institutionId,
      classId,
      day,
      period,
      subjectId,
      teacherId,
    })),
  );

  // --- attendance: 1 week (Mon–Sat, ~6 days) --------------------------------
  const weekDays = [6, 5, 4, 3, 2, 1].map(isoDaysAgo); // skip today for realism
  const attendanceDocs: Array<Record<string, unknown>> = [];
  for (const cls of classes) {
    const markedBy = cls.doc.inchargeId ?? allTeachers[0]._id;
    for (const date of weekDays) {
      for (const studentId of cls.doc.studentIds) {
        const roll = rand();
        const status = roll > 0.92 ? 'absent' : roll > 0.85 ? 'late' : 'present';
        attendanceDocs.push({
          institutionId: instId, classId: cls.doc._id, studentId, date, status,
          markedBy, subjectId: null,
        });
      }
    }
  }
  await Attendance.insertMany(attendanceDocs);

  // --- marks: sessional + mid + final for every student × core subjects -----
  const markDocs: Array<Record<string, unknown>> = [];
  const today = isoDaysAgo(0);
  for (const cls of classes) {
    const subjects = (subjectByProgram.get(cls.programCode) ?? []).slice(0, 8);
    for (const studentId of cls.doc.studentIds) {
      for (const subject of subjects) {
        for (const [examType, total] of [
          ['sessional', 100], ['midterm', 100], ['final', 100],
        ] as const) {
          const score = int(Math.floor(total * 0.35), total);
          markDocs.push({
            institutionId: instId, classId: cls.doc._id, studentId,
            subjectId: subject._id, examType, title: examType,
            score, total, date: today,
            enteredBy: cls.doc.inchargeId ?? allTeachers[0]._id,
          });
        }
      }
    }
  }
  await Mark.insertMany(markDocs);

  // --- fees: structure per program + invoices --------------------------------
  const feeStructures: InstanceType<typeof FeeStructure>[] = [];
  for (const p of PROGRAMS) {
    const ownClasses = classes.filter((c) => c.programCode === p.code);
    for (const cls of ownClasses) {
      feeStructures.push(await FeeStructure.create({
        institutionId: instId, classId: cls.doc._id,
        title: `${p.code} Monthly Tuition`,
        amount: p.code.startsWith('DAE') ? 4500 : 6000,
        frequency: 'monthly', dueDate: isoDaysAgo(-5),
      }));
    }
  }
  let invoiceCounter = 1000;
  const invoiceDocs: Array<Record<string, unknown>> = [];
  for (const structure of feeStructures) {
    const cls = classes.find((c) => String(c.doc._id) === String(structure.classId));
    if (!cls) continue;
    for (const studentId of cls.doc.studentIds) {
      invoiceCounter += 1;
      const paidRoll = rand();
      const paid = paidRoll > 0.45;
      const partial = !paid && paidRoll > 0.25;
      invoiceDocs.push({
        institutionId: instId, invoiceNo: `INV-${invoiceCounter}`,
        studentId, structureId: structure._id, amount: structure.amount,
        paidAmount: paid ? structure.amount : partial ? Math.floor(structure.amount / 2) : 0,
        status: paid ? 'paid' : partial ? 'partial' : 'unpaid',
        dueDate: structure.dueDate,
        paidOn: paid ? isoDaysAgo(int(1, 10)) : null,
        method: paid ? pick(['cash', 'bank', 'card']) : '',
        receiptNo: paid ? `RCPT-${invoiceCounter}` : '',
      });
    }
  }
  await FeeInvoice.insertMany(invoiceDocs);

  // --- announcements: 5, relative dates ---------------------------------------
  const principal = users.find((u) => u.role === 'principal')!;
  const admin = users.find((u) => u.role === 'admin')!;
  await Announcement.insertMany([
    { institutionId: instId, title: 'Half-yearly examinations begin next month',
      body: 'The half-yearly examinations begin on the 12th. Collect your date sheet from the office. Bring your CNIC/B-Form and reach the hall 15 minutes early.',
      audience: ['all'], authorId: principal._id, priority: 'high', pinned: true,
      createdAt: new Date(Date.now() - 864e5) },
    { institutionId: instId, title: 'Mid-term marks uploaded to the portal',
      body: 'Mid-term marks for all DAE batches are now visible in Marks & Results. Parents can review subject-wise performance from the parent portal.',
      audience: ['student', 'parent', 'teacher', 'teacher_incharge'],
      authorId: admin._id, priority: 'normal',
      createdAt: new Date(Date.now() - 3 * 864e5) },
    { institutionId: instId, title: 'Staff meeting — Friday after Jumma',
      body: 'All teaching staff must attend the review meeting in the conference hall. Agenda: exam preparation, attendance follow-up and the annual day plan.',
      audience: ['teacher', 'teacher_incharge', 'principal', 'admin'],
      authorId: principal._id, priority: 'normal',
      createdAt: new Date(Date.now() - 5 * 864e5) },
    { institutionId: instId, title: 'Fee payment reminder — July instalment',
      body: 'The July tuition instalment is due on the 5th. Pay at the accounts desk or via bank transfer to avoid a late fee of Rs. 100.',
      audience: ['parent'], authorId: admin._id, priority: 'high',
      createdAt: new Date(Date.now() - 8 * 864e5) },
    { institutionId: instId, title: 'TEVTA placement drive — registrations open',
      body: 'Local industries (footwear and leather) are visiting campus for placements. Interested students should register with the placement cell before the 20th.',
      audience: ['all'], authorId: admin._id, priority: 'normal',
      createdAt: new Date(Date.now() - 12 * 864e5) },
  ]);

  // --- quizzes: 2 with submissions --------------------------------------------
  const quizTarget = classes[0]; // DAE-CIT Year 1
  const citSubjects = subjectByProgram.get('DAE-CIT') ?? [];
  const quizTeacher = quizTarget.doc.inchargeId ?? allTeachers[0]._id;

  const quiz1 = await Quiz.create({
    institutionId: instId, title: 'C++ Basics — Weekly Quiz',
    classId: quizTarget.doc._id, subjectId: citSubjects[0]._id,
    teacherId: quizTeacher, date: isoDaysAgo(2), durationMin: 20, status: 'published',
    instructions: 'Answer all questions. MCQs are auto-graded.',
    totalMarks: 10,
    questions: [
      { type: 'mcq', text: 'Which keyword declares a constant in C++?', options: ['const', 'let', 'static', 'final'], answer: 'const', marks: 3 },
      { type: 'mcq', text: 'What is the default return type of main()?', options: ['int', 'void', 'char', 'auto'], answer: 'int', marks: 3 },
      { type: 'short', text: 'Name the operator used for pointer dereferencing.', answer: '*', marks: 4 },
    ],
  });
  const quiz2 = await Quiz.create({
    institutionId: instId, title: 'Networking Fundamentals — Quiz 2',
    classId: quizTarget.doc._id, subjectId: citSubjects[3]._id,
    teacherId: quizTeacher, date: isoDaysAgo(1), durationMin: 15, status: 'published',
    instructions: 'Multiple choice only.',
    totalMarks: 6,
    questions: [
      { type: 'mcq', text: 'Which device forwards packets between networks?', options: ['Switch', 'Router', 'Hub', 'Repeater'], answer: 'Router', marks: 2 },
      { type: 'mcq', text: 'Default HTTP port?', options: ['80', '443', '21', '25'], answer: '80', marks: 2 },
      { type: 'mcq', text: 'TCP is…', options: ['Connectionless', 'Connection-oriented', 'Wireless', 'Optical'], answer: 'Connection-oriented', marks: 2 },
    ],
  });

  const citStudents = quizTarget.doc.studentIds.slice(0, 4);
  await QuizSubmission.insertMany([
    { institutionId: instId, quizId: quiz1._id, studentId: citStudents[0],
      answers: {}, score: 7, feedback: 'Good attempt — review pointer syntax.' },
    { institutionId: instId, quizId: quiz1._id, studentId: citStudents[1],
      answers: {}, score: 10, feedback: 'Excellent.' },
    { institutionId: instId, quizId: quiz2._id, studentId: citStudents[0],
      answers: {}, score: 4, feedback: '' },
    { institutionId: instId, quizId: quiz2._id, studentId: citStudents[2],
      answers: {}, score: null, feedback: '' },
  ]);

  // --- assignments: practical work + project submissions --------------------
  const assignments = await Assignment.insertMany([
    {
      institutionId: instId,
      classId: quizTarget.doc._id,
      subjectId: citSubjects[0]._id,
      teacherId: quizTeacher,
      title: 'C++ Practical Exercise 1',
      description: 'Write a console program that reads three numbers and prints the largest value.',
      dueDate: isoDaysAgo(-7),
      totalMarks: 20,
      status: 'open',
    },
    {
      institutionId: instId,
      classId: quizTarget.doc._id,
      subjectId: citSubjects[1]._id,
      teacherId: quizTeacher,
      title: 'Personal Portfolio Website',
      description: 'Build a responsive portfolio with an about section, project list and contact details.',
      dueDate: isoDaysAgo(-14),
      totalMarks: 30,
      status: 'open',
    },
  ]);
  await AssignmentSubmission.insertMany([
    {
      institutionId: instId,
      assignmentId: assignments[0]._id,
      studentId: citStudents[0],
      content: 'Submitted the C++ source code and sample output.',
      score: 18,
      feedback: 'Correct logic; improve input validation.',
    },
    {
      institutionId: instId,
      assignmentId: assignments[0]._id,
      studentId: citStudents[1],
      content: 'Program submitted with three test cases.',
      score: 20,
      feedback: 'Excellent work.',
    },
    {
      institutionId: instId,
      assignmentId: assignments[1]._id,
      studentId: citStudents[2],
      content: 'Initial layout and responsive navigation are ready for review.',
      score: null,
      feedback: '',
    },
  ]);

  console.log('\nSeed complete ✓');
  console.log(`  Institution : ${institution.name}`);
  console.log(`  Users       : ${STAFF.length} staff + ${TEACHERS.length} teachers + 40 students + 6 parents`);
  console.log(`  Programs    : ${PROGRAMS.length}  |  Classes: ${classes.length}`);
  console.log(`  Subjects    : ${[...subjectByProgram.values()].reduce((n, s) => n + s.length, 0)}`);
  console.log(`  Timetable   : ${slotDocs.length} slots  |  Teacher assignments: ${slotDocs.length}`);
  console.log(`  Attendance  : ${attendanceDocs.length} records`);
  console.log(`  Marks       : ${markDocs.length} entries  |  Invoices: ${invoiceDocs.length}`);
  console.log(`  Quizzes     : 2 (with 4 submissions)  |  Announcements: 5`);
  console.log(`  Assignments : ${assignments.length} (with 3 submissions)`);
  console.log(`\n  Login → any seeded email with password "${SEED_PASSWORD}"`);
  await disconnectDb();
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});



