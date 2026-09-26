import type { User } from '@/types';
import { AVATAR_COLORS } from './seed';
import { admissionClasses, admissionStudents } from './admissions';

/**
 * Sample people: 1 Super Admin, 1 Admin, 1 Principal, 4 Teachers (one is
 * Teacher Incharge), 10 Students and 3 Parents — written by hand so the demo
 * reads like a real school instead of generated noise.
 */

export const users: User[] = [
  // ---------------------------------------------------------------- leadership
  {
    id: 'u-super',
    name: 'Muhammad Irfan Butt',
    email: 'super@educore.test',
    phone: '+91 98110 10001',
    role: 'super_admin',
    status: 'active',
    avatarColor: AVATAR_COLORS[0],
    joinedAt: '2023-04-02',
    designation: 'Product Owner',
  },
  {
    id: 'u-admin',
    name: 'Ayesha Siddiqui',
    email: 'admin@educore.test',
    phone: '+91 98110 10002',
    role: 'admin',
    status: 'active',
    avatarColor: AVATAR_COLORS[1],
    joinedAt: '2023-06-12',
    designation: 'Institute Administrator',
  },
  {
    id: 'u-principal',
    name: 'Dr. Tariq Javed',
    email: 'principal@educore.test',
    phone: '+91 98110 10003',
    role: 'principal',
    status: 'active',
    avatarColor: AVATAR_COLORS[2],
    joinedAt: '2022-05-20',
    designation: 'Principal',
  },

  // ------------------------------------------------------------------ teachers
  {
    id: 'u-t-priya',
    name: 'Rana Muhammad Aslam',
    email: 'incharge1@educore.test',
    phone: '+91 98110 20001',
    role: 'teacher_incharge',
    status: 'active',
    avatarColor: AVATAR_COLORS[3],
    joinedAt: '2021-06-01',
    designation: 'Teacher Incharge · DAE CIT',
    classIds: ['c-10a', 'c-9a', 'c-8a'],
    subjectIds: ['s-math'],
  },
  {
    id: 'u-t-rakesh',
    name: 'Nadia Iqbal',
    email: 'nadia.iqbal@gilt.test',
    phone: '+91 98110 20002',
    role: 'teacher',
    status: 'active',
    avatarColor: AVATAR_COLORS[4],
    joinedAt: '2022-07-11',
    designation: 'Senior Instructor · Computer & IT',
    classIds: ['c-10a', 'c-9a', 'c-8a'],
    subjectIds: ['s-sci'],
  },
  {
    id: 'u-t-sneha',
    name: 'Usman Ghani',
    email: 'usman.ghani@gilt.test',
    phone: '+91 98110 20003',
    role: 'teacher',
    status: 'active',
    avatarColor: AVATAR_COLORS[5],
    joinedAt: '2023-04-03',
    designation: 'Instructor · Applied Sciences',
    classIds: ['c-10a', 'c-8a'],
    subjectIds: ['s-eng'],
  },
  {
    id: 'u-t-imran',
    name: 'Bushra Rasheed',
    email: 'bushra.rasheed@gilt.test',
    phone: '+91 98110 20004',
    role: 'teacher',
    status: 'active',
    avatarColor: AVATAR_COLORS[6],
    joinedAt: '2023-08-16',
    designation: 'Instructor · Footwear Technology',
    classIds: ['c-9a', 'c-8a'],
    subjectIds: ['s-cs', 's-sst'],
  },

  // ------------------------------------------------------------------ students
  {
    id: 'u-s-01',
    name: 'Aarav Gupta',
    email: 'aarav@student.educore.test',
    role: 'student',
    status: 'active',
    avatarColor: AVATAR_COLORS[7],
    joinedAt: '2024-04-01',
    classId: 'c-10a',
    rollNo: '10A-01',
    parentIds: ['u-p-01'],
  },
  {
    id: 'u-s-02',
    name: 'Diya Sharma',
    email: 'diya@student.educore.test',
    role: 'student',
    status: 'active',
    avatarColor: AVATAR_COLORS[8],
    joinedAt: '2024-04-01',
    classId: 'c-10a',
    rollNo: '10A-02',
    parentIds: ['u-p-02'],
  },
  {
    id: 'u-s-03',
    name: 'Kabir Singh',
    email: 'kabir@student.educore.test',
    role: 'student',
    status: 'active',
    avatarColor: AVATAR_COLORS[9],
    joinedAt: '2024-04-01',
    classId: 'c-10a',
    rollNo: '10A-03',
    parentIds: [],
  },
  {
    id: 'u-s-04',
    name: 'Meera Patel',
    email: 'meera@student.educore.test',
    role: 'student',
    status: 'active',
    avatarColor: AVATAR_COLORS[10],
    joinedAt: '2024-04-01',
    classId: 'c-10a',
    rollNo: '10A-04',
    parentIds: [],
  },
  {
    id: 'u-s-05',
    name: 'Rohan Verma',
    email: 'rohan@student.educore.test',
    role: 'student',
    status: 'active',
    avatarColor: AVATAR_COLORS[11],
    joinedAt: '2024-04-01',
    classId: 'c-9a',
    rollNo: '9A-01',
    parentIds: [],
  },
  {
    id: 'u-s-06',
    name: 'Ishita Bose',
    email: 'ishita@student.educore.test',
    role: 'student',
    status: 'active',
    avatarColor: AVATAR_COLORS[0],
    joinedAt: '2024-04-01',
    classId: 'c-9a',
    rollNo: '9A-02',
    parentIds: [],
  },
  {
    id: 'u-s-07',
    name: 'Arjun Reddy',
    email: 'arjun@student.educore.test',
    role: 'student',
    status: 'active',
    avatarColor: AVATAR_COLORS[1],
    joinedAt: '2024-04-01',
    classId: 'c-9a',
    rollNo: '9A-03',
    parentIds: [],
  },
  {
    id: 'u-s-08',
    name: 'Ananya Menon',
    email: 'ananya@student.educore.test',
    role: 'student',
    status: 'active',
    avatarColor: AVATAR_COLORS[2],
    joinedAt: '2024-04-01',
    classId: 'c-8a',
    rollNo: '8A-01',
    parentIds: [],
  },
  {
    id: 'u-s-09',
    name: 'Vihaan Joshi',
    email: 'vihaan@student.educore.test',
    role: 'student',
    status: 'active',
    avatarColor: AVATAR_COLORS[3],
    joinedAt: '2024-04-01',
    classId: 'c-8a',
    rollNo: '8A-02',
    parentIds: [],
  },
  {
    id: 'u-s-10',
    name: 'Sara Khan',
    email: 'sara@student.educore.test',
    role: 'student',
    status: 'active',
    avatarColor: AVATAR_COLORS[4],
    joinedAt: '2024-04-01',
    classId: 'c-8a',
    rollNo: '8A-03',
    parentIds: ['u-p-03'],
  },

  // ------------------------------------------------------------------- parents
  {
    id: 'u-p-01',
    name: 'Muhammad Yousaf',
    email: 'yousaf@family.gilt.test',
    phone: '+91 98110 30001',
    role: 'parent',
    status: 'active',
    avatarColor: AVATAR_COLORS[5],
    joinedAt: '2024-04-05',
    childIds: ['u-s-01'],
  },
  {
    id: 'u-p-02',
    name: 'Abdul Wahab',
    email: 'wahab@family.gilt.test',
    phone: '+91 98110 30002',
    role: 'parent',
    status: 'active',
    avatarColor: AVATAR_COLORS[6],
    joinedAt: '2024-04-05',
    childIds: ['u-s-02'],
  },
  {
    id: 'u-p-03',
    name: 'Manzoor Ahmad',
    email: 'manzoor.ahmad@family.gilt.test',
    phone: '+91 98110 30003',
    role: 'parent',
    status: 'active',
    avatarColor: AVATAR_COLORS[7],
    joinedAt: '2024-04-05',
    childIds: ['u-s-10'],
  },
];

const tevtaClassIds = [
  'c-10a', 'c-cit-y2', 'c-8a', 'c-ft-y1', 'c-ft-y2', 'c-ft-y3',
  'c-lt-y1', 'c-lt-y2', 'c-lt-y3', 'c-data-1', 'c-data-2', 'c-clinical-1',
];

users.filter((user) => user.role === 'student').forEach((user, index) => {
  const admission = admissionStudents[index];
  if (!admission) return;
  Object.assign(user, {
    name: admission.name,
    email: admission.email,
    phone: admission.phone,
    classId: tevtaClassIds[admissionClasses.indexOf(admission.className)],
    rollNo: admission.rollNo,
    registrationNo: admission.registrationNo,
    fatherName: admission.fatherName,
    cnic: admission.cnic,
    dob: admission.dob,
    address: admission.address,
  });
});

const additionalStudentNames = admissionStudents.slice(10).map((student) => [student.name, student.fatherName] as const);

additionalStudentNames.forEach(([name, fatherName], index) => {
  const number = index + 11;
  const id = `u-s-${String(number).padStart(2, '0')}`;
  const classId = tevtaClassIds[(number - 1) % tevtaClassIds.length];
  users.push({
    id,
    name,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@student.gilt.test`,
    phone: `+92 300 ${String(2200000 + number).slice(-7)}`,
    role: 'student',
    status: index === 17 ? 'inactive' : 'active',
    avatarColor: AVATAR_COLORS[number % AVATAR_COLORS.length],
    joinedAt: '2025-08-25',
    classId,
    rollNo: `GRW-${String(number).padStart(3, '0')}`,
    registrationNo: `TEVTA-GRW-2025-${String(number).padStart(4, '0')}`,
    fatherName,
    cnic: `${31000 + number}-123456${number % 10}-${(number % 9) + 1}`,
    dob: `200${5 + (number % 5)}-${String((number % 12) + 1).padStart(2, '0')}-15`,
    address: `${['Satellite Town', 'Model Town', 'Civil Lines'][number % 3]}, Gujranwala, Punjab`,
    parentIds: number <= 16 ? [`u-p-0${Math.ceil(number / 3)}`] : [],
  });
});

const teacherClassIds = tevtaClassIds;
[
  { id: 'u-t-incharge-2', name: 'Sadia Naz', email: 'sadia.naz@gilt.test', role: 'teacher_incharge' as const, designation: 'Teacher Incharge · Footwear Technology' },
  { id: 'u-t-incharge-3', name: 'Ghulam Mustafa', email: 'ghulam.mustafa@gilt.test', role: 'teacher_incharge' as const, designation: 'Teacher Incharge · Leather Technology' },
  { id: 'u-t-incharge-4', name: 'Farhan Ali Qureshi', email: 'farhan.qureshi@gilt.test', role: 'teacher_incharge' as const, designation: 'Teacher Incharge · Short Courses' },
  { id: 'u-t-extra-1', name: 'Kamran Shahzad', email: 'kamran.shahzad@gilt.test', role: 'teacher' as const, designation: 'Senior Instructor · Computer & IT' },
  { id: 'u-t-extra-2', name: 'Rubina Parveen', email: 'rubina.parveen@gilt.test', role: 'teacher' as const, designation: 'Instructor · Computer & IT' },
  { id: 'u-t-extra-3', name: 'Adnan Maqsood', email: 'adnan.maqsood@gilt.test', role: 'teacher' as const, designation: 'Instructor · Footwear Technology' },
  { id: 'u-t-extra-4', name: 'Shazia Mumtaz', email: 'shazia.mumtaz@gilt.test', role: 'teacher' as const, designation: 'Workshop Instructor · Footwear' },
  { id: 'u-t-extra-5', name: 'Waqas Ahmed', email: 'waqas.ahmed@gilt.test', role: 'teacher' as const, designation: 'Instructor · Leather Technology' },
  { id: 'u-t-extra-6', name: 'Hina Batool', email: 'hina.batool@gilt.test', role: 'teacher' as const, designation: 'Workshop Instructor · Leather' },
  { id: 'u-t-extra-7', name: 'Sajid Hussain', email: 'sajid.hussain@gilt.test', role: 'teacher' as const, designation: 'Instructor · Data Analytics' },
  { id: 'u-t-extra-8', name: 'Amna Yousaf', email: 'amna.yousaf@gilt.test', role: 'teacher' as const, designation: 'Clinical Practice Instructor' },
  { id: 'u-t-extra-9', name: 'Zeeshan Rafiq', email: 'zeeshan.rafiq@gilt.test', role: 'teacher' as const, designation: 'Instructor · Applied Sciences' },
].forEach((teacher, index) => {
  users.push({
    ...teacher,
    phone: `+92 301 ${String(3300000 + index).slice(-7)}`,
    status: 'active',
    avatarColor: AVATAR_COLORS[(index + 4) % AVATAR_COLORS.length],
    joinedAt: '2023-08-01',
    classIds: [teacherClassIds[index % teacherClassIds.length]],
    subjectIds: [],
  });
});

[
  { id: 'u-p-04', name: 'Abdul Sattar', childIds: ['u-s-11', 'u-s-12'] },
  { id: 'u-p-05', name: 'Manzoor Ahmad', childIds: ['u-s-13', 'u-s-14'] },
  { id: 'u-p-06', name: 'Naseer Ahmed', childIds: ['u-s-15', 'u-s-16'] },
].forEach((parent, index) => users.push({
  ...parent,
  email: `${parent.name.toLowerCase().replace(/ /g, '.')}@family.gilt.test`,
  phone: `+92 322 ${String(4100000 + index).slice(-7)}`,
  role: 'parent',
  status: 'active',
  avatarColor: AVATAR_COLORS[index + 8],
  joinedAt: '2025-08-25',
}));

/** Credentials shown on the login screen (mock auth only). */
export const DEMO_PASSWORD = 'educore123';

/** One demo login per role so the dev role switcher can jump anywhere instantly. */
export const ROLE_DEMO_USER: Record<string, string> = {
  super_admin: 'u-super',
  admin: 'u-admin',
  principal: 'u-principal',
  teacher_incharge: 'u-t-priya',
  teacher: 'u-t-rakesh',
  student: 'u-s-01',
  parent: 'u-p-01',
};

/** The account the app boots into so every screen is reachable immediately. */
export const DEFAULT_USER_ID = 'u-admin';

