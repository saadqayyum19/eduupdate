/**
 * EduCore Lite — shared domain types.
 * The backend (Node + Express + MongoDB) will eventually return these exact shapes,
 * so the UI can switch from mocks to the API without refactoring.
 */

export type Role =
  | 'super_admin'
  | 'admin'
  | 'principal'
  | 'teacher_incharge'
  | 'teacher'
  | 'student'
  | 'parent';

export type UserStatus = 'active' | 'inactive';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  status: UserStatus;
  /** Accent colour used for the initials avatar (keeps the UI colourful without images). */
  avatarColor: string;
  joinedAt: string; // ISO date
  /** Staff only — e.g. "Senior Maths Teacher". */
  designation?: string;
  /** Teachers: classes they are assigned to. */
  classIds?: string[];
  /** Teachers: subjects they can teach. */
  subjectIds?: string[];
  /** Students: the class they belong to. */
  classId?: string;
  /** Students: roll number inside the class. */
  rollNo?: string;
  /** Student admission record fields. */
  registrationNo?: string;
  fatherName?: string;
  cnic?: string;
  bform?: string;
  dob?: string;
  address?: string;
  photoUrl?: string;
  /** Students: guardian references. */
  parentIds?: string[];
  /** Parents: children references. */
  childIds?: string[];
}

export interface ClassRoom {
  id: string;
  name: string; // "Class 10"
  section: string; // "A"
  room?: string;
  /** Every teacher assigned to this class. */
  teacherIds: string[];
  /** The one teacher who owns the class (per class, per subject incharge is kept in classSubjects). */
  inchargeId: string | null;
  /** Subject -> teacher incharge mapping (per-subject incharge). */
  subjectIncharges: Record<string, string | null>;
  studentIds: string[];
  subjectIds: string[];
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  /** Classes this subject is assigned to. */
  classIds: string[];
  color: string; // tailwind-ish hex used by the timetable + charts
}

export type WeekDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export interface TimetableSlot {
  id: string;
  classId: string;
  day: WeekDay;
  /** Period number 1..6 (P1–P6). */
  period: number;
  subjectId: string;
  teacherId: string;
  room?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface AttendanceRecord {
  id: string;
  classId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  markedBy: string;
  note?: string;
}

export type QuizStatus = 'draft' | 'published' | 'closed';

export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'short';
  text: string;
  options?: string[];
  /** Correct answer text (both MCQ and short answer use canonical option/answer text). */
  answer: string;
  marks: number;
}

export interface Quiz {
  id: string;
  title: string;
  subjectId: string;
  classId: string;
  teacherId: string;
  date: string; // YYYY-MM-DD
  durationMin: number;
  totalMarks: number;
  status: QuizStatus;
  instructions?: string;
  questions: QuizQuestion[];
}

export interface QuizSubmission {
  id: string;
  quizId: string;
  studentId: string;
  /** questionId -> answer */
  answers: Record<string, string>;
  submittedAt: string;
  /** null = not marked yet */
  score: number | null;
  feedback?: string;
}

export type ExamType = 'quiz' | 'midterm' | 'final' | 'assignment';

export interface Mark {
  id: string;
  studentId: string;
  classId: string;
  subjectId: string;
  examType: ExamType;
  title: string;
  score: number;
  total: number;
  date: string; // YYYY-MM-DD
  enteredBy: string;
}

export type FeeFrequency = 'monthly' | 'termly' | 'yearly' | 'one-time';

export interface FeeStructure {
  id: string;
  classId: string;
  title: string;
  amount: number;
  frequency: FeeFrequency;
  dueDate: string; // YYYY-MM-DD
}

export type FeeStatus = 'paid' | 'unpaid' | 'partial';

export interface FeePayment {
  id: string;
  invoiceNo: string;
  studentId: string;
  structureId: string;
  amount: number;
  paidAmount: number;
  status: FeeStatus;
  dueDate: string;
  paidOn: string | null;
  method?: 'cash' | 'card' | 'bank' | 'upi';
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  /** 'all' or the exact roles that should see it. */
  audience: Role[] | 'all';
  authorId: string;
  createdAt: string; // ISO
  priority: 'normal' | 'high';
  pinned?: boolean;
}

export interface Period {
  number: number;
  label: string;
  start: string;
  end: string;
}

/** Result card aggregate for a single student. */
export interface ResultRow {
  subjectId: string;
  subjectName: string;
  obtained: number;
  total: number;
  percentage: number;
  grade: string;
}

export interface ResultCard {
  student: User;
  classRoom: ClassRoom | null;
  rows: ResultRow[];
  totalObtained: number;
  totalMax: number;
  percentage: number;
  grade: string;
  position: number;
  classSize: number;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'info';
  /** How long the toast stays on screen. Defaults per variant when omitted. */
  durationMs?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
