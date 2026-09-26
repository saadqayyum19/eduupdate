/**
 * TEVTA-style seed data — Government Technical Training Institute, Gujranwala.
 *
 * Realistic Pakistani names, TEVTA program names (DAE + special courses),
 * Gujranwala context. `npm run seed` in server/ wipes + reloads everything.
 */

export const INSTITUTION = {
  name: 'Government Technical Training Institute, Gujranwala',
  type: 'college' as const,
  primaryColor: '#2563eb',
  academicYear: '2025 – 2026',
  address: 'Paris Road, Gujranwala, Punjab',
  phone: '+92 55 4200000',
  email: 'info@cttigujranwala.tevta.gov.pk',
  website: 'https://www.tevta.gov.pk',
};

/** Demo password shared by all seeded accounts. */
export const SEED_PASSWORD = 'educore123';

export const STAFF = [
  { name: 'Muhammad Irfan Butt', email: 'super@educore.test', role: 'super_admin' as const, designation: 'Platform Owner' },
  { name: 'Ayesha Siddiqui', email: 'admin@educore.test', role: 'admin' as const, designation: 'Institute Administrator' },
  { name: 'Dr. Tariq Javed', email: 'principal@educore.test', role: 'principal' as const, designation: 'Principal' },
  { name: 'Rana Muhammad Aslam', email: 'incharge1@educore.test', role: 'teacher_incharge' as const, designation: 'Incharge — DAE CIT' },
  { name: 'Sadia Naz', email: 'incharge2@educore.test', role: 'teacher_incharge' as const, designation: 'Incharge — Footwear' },
  { name: 'Ghulam Mustafa', email: 'incharge3@educore.test', role: 'teacher_incharge' as const, designation: 'Incharge — Leather' },
  { name: 'Farhan Ali Qureshi', email: 'incharge4@educore.test', role: 'teacher_incharge' as const, designation: 'Incharge — Short Courses' },
];

export const TEACHERS = [
  'Nadia Iqbal', 'Usman Ghani', 'Bushra Rasheed', 'Kamran Shahzad',
  'Rubina Parveen', 'Adnan Maqsood', 'Shazia Mumtaz', 'Waqas Ahmed',
  'Hina Batool', 'Sajid Hussain', 'Amna Yousaf', 'Zeeshan Rafiq',
];

export const PROGRAMS = [
  { name: 'DAE in Information Technology (CIT)', code: 'DAE-CIT', level: 'intermediate' as const, years: 3, credits: 90 },
  { name: 'DAE in Footwear Technology', code: 'DAE-FT', level: 'intermediate' as const, years: 3, credits: 84 },
  { name: 'DAE in Leather Technology', code: 'DAE-LT', level: 'intermediate' as const, years: 3, credits: 84 },
  { name: 'Diploma in Data Analytics', code: 'SC-DA', level: 'certificate' as const, years: 1, credits: 24 },
  { name: 'Certificate in Clinical Assistant', code: 'SC-CA', level: 'certificate' as const, years: 1, credits: 24 },
];

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** 20+ subjects per DAE program + subjects for the special courses. */
export const SUBJECTS: Record<string, Array<{ name: string; code: string; credits: number }>> = {
  'DAE-CIT': [
    { name: 'Computer Programming (C++)', code: 'CIT-101', credits: 4 },
    { name: 'Web Designing & Development', code: 'CIT-102', credits: 4 },
    { name: 'Database Management Systems', code: 'CIT-103', credits: 4 },
    { name: 'Networking Fundamentals', code: 'CIT-104', credits: 4 },
    { name: 'Operating Systems', code: 'CIT-105', credits: 3 },
    { name: 'Software Engineering', code: 'CIT-106', credits: 3 },
    { name: 'Data Structures & Algorithms', code: 'CIT-107', credits: 4 },
    { name: 'Computer Hardware & Maintenance', code: 'CIT-108', credits: 3 },
    { name: 'Mathematics I', code: 'CIT-109', credits: 3 },
    { name: 'Mathematics II', code: 'CIT-110', credits: 3 },
    { name: 'English', code: 'CIT-111', credits: 2 },
    { name: 'Islamiat & Pakistan Studies', code: 'CIT-112', credits: 2 },
    { name: 'Applied Physics', code: 'CIT-113', credits: 3 },
    { name: 'Applied Chemistry', code: 'CIT-114', credits: 3 },
    { name: 'Technical Drawing', code: 'CIT-115', credits: 2 },
    { name: 'Workshop Practice', code: 'CIT-116', credits: 2 },
    { name: 'Multimedia & Graphics', code: 'CIT-117', credits: 3 },
    { name: 'Cyber Security Basics', code: 'CIT-118', credits: 3 },
    { name: 'Mobile App Development', code: 'CIT-119', credits: 4 },
    { name: 'Final Year Project', code: 'CIT-120', credits: 4 },
    { name: 'Communication Skills', code: 'CIT-121', credits: 2 },
  ],
  'DAE-FT': [
    { name: 'Footwear Design & Pattern Making', code: 'FT-101', credits: 4 },
    { name: 'Leather Processing', code: 'FT-102', credits: 3 },
    { name: 'Footwear Machinery', code: 'FT-103', credits: 3 },
    { name: 'Material Science for Footwear', code: 'FT-104', credits: 3 },
    { name: 'Quality Control in Footwear', code: 'FT-105', credits: 3 },
    { name: 'Production Management', code: 'FT-106', credits: 3 },
    { name: 'Mathematics I', code: 'FT-107', credits: 3 },
    { name: 'Applied Physics', code: 'FT-108', credits: 3 },
    { name: 'English', code: 'FT-109', credits: 2 },
    { name: 'Islamiat & Pakistan Studies', code: 'FT-110', credits: 2 },
    { name: 'Technical Drawing', code: 'FT-111', credits: 2 },
    { name: 'Computer Applications', code: 'FT-112', credits: 3 },
    { name: 'Workshop Practice', code: 'FT-113', credits: 2 },
    { name: 'Footwear Merchandising', code: 'FT-114', credits: 3 },
    { name: 'Mould Design', code: 'FT-115', credits: 3 },
    { name: 'Adhesives & Chemistry', code: 'FT-116', credits: 3 },
    { name: 'Industrial Safety', code: 'FT-117', credits: 2 },
    { name: 'Entrepreneurship', code: 'FT-118', credits: 2 },
    { name: 'Final Year Project', code: 'FT-119', credits: 4 },
    { name: 'Communication Skills', code: 'FT-120', credits: 2 },
    { name: 'Environmental Studies', code: 'FT-121', credits: 2 },
  ],
  'DAE-LT': [
    { name: 'Hide & Skin Preservation', code: 'LT-101', credits: 4 },
    { name: 'Tanning Technology', code: 'LT-102', credits: 4 },
    { name: 'Leather Finishing', code: 'LT-103', credits: 3 },
    { name: 'Chemistry of Leather', code: 'LT-104', credits: 4 },
    { name: 'Leather Testing & Quality', code: 'LT-105', credits: 3 },
    { name: 'Effluent Treatment', code: 'LT-106', credits: 3 },
    { name: 'Mathematics I', code: 'LT-107', credits: 3 },
    { name: 'Applied Physics', code: 'LT-108', credits: 3 },
    { name: 'English', code: 'LT-109', credits: 2 },
    { name: 'Islamiat & Pakistan Studies', code: 'LT-110', credits: 2 },
    { name: 'Computer Applications', code: 'LT-111', credits: 3 },
    { name: 'Technical Drawing', code: 'LT-112', credits: 2 },
    { name: 'Workshop Practice', code: 'LT-113', credits: 2 },
    { name: 'Leather Goods Manufacturing', code: 'LT-114', credits: 3 },
    { name: 'Microbiology for Leather', code: 'LT-115', credits: 3 },
    { name: 'Industrial Management', code: 'LT-116', credits: 3 },
    { name: 'Industrial Safety', code: 'LT-117', credits: 2 },
    { name: 'Entrepreneurship', code: 'LT-118', credits: 2 },
    { name: 'Final Year Project', code: 'LT-119', credits: 4 },
    { name: 'Communication Skills', code: 'LT-120', credits: 2 },
    { name: 'Environmental Studies', code: 'LT-121', credits: 2 },
  ],
  'SC-DA': [
    { name: 'Python for Data Analysis', code: 'DA-201', credits: 4 },
    { name: 'Statistics & Probability', code: 'DA-202', credits: 4 },
    { name: 'Data Visualisation (Power BI)', code: 'DA-203', credits: 4 },
    { name: 'SQL & Databases', code: 'DA-204', credits: 4 },
    { name: 'Machine Learning Basics', code: 'DA-205', credits: 4 },
    { name: 'Capstone Project', code: 'DA-206', credits: 4 },
  ],
  'SC-CA': [
    { name: 'Anatomy & Physiology', code: 'CA-301', credits: 4 },
    { name: 'Clinical Procedures', code: 'CA-302', credits: 4 },
    { name: 'Patient Care & Ethics', code: 'CA-303', credits: 4 },
    { name: 'First Aid & Emergency', code: 'CA-304', credits: 4 },
    { name: 'Medical Terminology', code: 'CA-305', credits: 4 },
    { name: 'Hospital Practice', code: 'CA-306', credits: 4 },
  ],
};

/** 40 student names — Gujranwala/Punjab context. */
export const STUDENT_NAMES = [
  'Muhammad Hamza', 'Ali Raza', 'Hassan Ali', 'Ahmed Hassan', 'Bilal Ahmad',
  'Usman Ali', 'Faisal Mehmood', 'Kashif Raza', 'Talha Munir', 'Ahsan Abbas',
  'Zain Ul Abideen', 'Saad Iqbal', 'Muzammil Hussain', 'Danish Kaleem', 'Arsalan Shah',
  'Huzaifa Karim', 'Adeel Anwar', 'Noman Ejaz', 'Shahzaib Ashraf', 'Tahir Mehmood',
  'Maryam Bibi', 'Ayesha Noor', 'Fatima Zahra', 'Sana Tariq', 'Rimsha Fatima',
  'Zainab Akram', 'Hira Mahmood', 'Amna Shahid', 'Laiba Aslam', 'Mehwish Kamran',
  'Erum Shaheen', 'Kainat Bibi', 'Nimra Shahzad', 'Sidra Yaqoob', 'Anam Waqar',
  'Javeria Zahid', 'Saba Naz', 'Sidra Noor', 'Hina Asghar', 'Rabia Sultana',
];

export const PARENT_NAMES = [
  'Muhammad Yousaf', 'Abdul Sattar', 'Manzoor Ahmad', 'Shakil Ahmad',
  'Naseer Ahmed', 'Rafiq Hussain',
];

/** Father names used by the admission form seed (parallel to STUDENT_NAMES). */
export const FATHER_NAMES = [
  'Muhammad Yousaf', 'Ghulam Abbas', 'Ali Akbar', 'Haji Nazir', 'Muhammad Ashraf',
  'Abdul Wahab', 'Shehzad Ahmad', 'Muhammad Ramzan', 'Noor Muhammad', 'Sikandar Hayat',
  'Zafar Iqbal', 'Muhammad Sharif', 'Ashiq Hussain', 'Riaz Ahmad', 'Muhammad Sadiq',
  'Allah Ditta', 'Muhammad Yaseen', 'Farooq Azam', 'Abdul Jabbar', 'Khalid Mehmood',
  'Muhammad Rafiq', 'Sultan Ahmad', 'Ilam Din', 'Muhammad Akram', 'Zahoor Ahmad',
  'Hafiz Muhammad', 'Naseem Akhtar', 'Muhammad Arif', 'Bashir Ahmed', 'Darshan Kumar',
  'Muhammad Anwar', 'Chaudhry Rehmat', 'Ghulam Rasool', 'Muhammad Tariq', 'Amjad Ali',
  'Rana Nazeer', 'Karamat Ali', 'Muhammad Nawaz', 'Allah Bakhsh', 'Muhammad Gulzar',
];
