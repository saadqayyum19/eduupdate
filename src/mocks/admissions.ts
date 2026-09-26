export interface AdmissionStudent {
  id: string;
  rollNo: string;
  registrationNo: string;
  name: string;
  fatherName: string;
  cnic: string;
  bform: string;
  dob: string;
  gender: 'Female' | 'Male';
  phone: string;
  email: string;
  address: string;
  program: string;
  className: string;
  year: string;
  section: string;
  session: string;
  status: 'Active' | 'Pending' | 'Graduated';
  admissionDate: string;
  guardian: string;
  guardianPhone: string;
  emergencyContact: string;
  previousSchool: string;
}

export const admissionPrograms = [
  'DAE Information Technology (CIT)',
  'DAE Footwear Technology',
  'DAE Leather Technology',
  'Diploma in Data Analytics',
  'Certificate in Clinical Assistant',
];

export const admissionClasses = [
  ...['CIT', 'Footwear', 'Leather'].flatMap((program) =>
    [1, 2, 3].map((year) => `${program} Year ${year}`),
  ),
  'Data Analytics Batch 1',
  'Data Analytics Batch 2',
  'Clinical Assistant Batch 1',
];

const students = [
  ['Muhammad Hamza', 'Muhammad Yousaf'], ['Ali Raza', 'Ghulam Abbas'], ['Hassan Ali', 'Ali Akbar'],
  ['Ahmed Hassan', 'Haji Nazir'], ['Bilal Ahmad', 'Muhammad Ashraf'], ['Usman Ali', 'Abdul Wahab'],
  ['Faisal Mehmood', 'Shehzad Ahmad'], ['Kashif Raza', 'Muhammad Ramzan'], ['Talha Munir', 'Noor Muhammad'],
  ['Ahsan Abbas', 'Sikandar Hayat'], ['Zain Ul Abideen', 'Zafar Iqbal'], ['Saad Iqbal', 'Muhammad Sharif'],
  ['Muzammil Hussain', 'Ashiq Hussain'], ['Danish Kaleem', 'Riaz Ahmad'], ['Arsalan Shah', 'Muhammad Sadiq'],
  ['Huzaifa Karim', 'Allah Ditta'], ['Adeel Anwar', 'Muhammad Yaseen'], ['Noman Ejaz', 'Farooq Azam'],
  ['Shahzaib Ashraf', 'Abdul Jabbar'], ['Tahir Mehmood', 'Khalid Mehmood'], ['Maryam Bibi', 'Muhammad Rafiq'],
  ['Ayesha Noor', 'Sultan Ahmad'], ['Fatima Zahra', 'Ilam Din'], ['Sana Tariq', 'Muhammad Akram'],
  ['Rimsha Fatima', 'Zahoor Ahmad'], ['Zainab Akram', 'Hafiz Muhammad'], ['Hira Mahmood', 'Naseem Akhtar'],
  ['Amna Shahid', 'Muhammad Arif'], ['Laiba Aslam', 'Bashir Ahmed'], ['Mehwish Kamran', 'Darshan Kumar'],
  ['Erum Shaheen', 'Muhammad Anwar'], ['Kainat Bibi', 'Chaudhry Rehmat'], ['Nimra Shahzad', 'Ghulam Rasool'],
  ['Sidra Yaqoob', 'Muhammad Tariq'], ['Anam Waqar', 'Amjad Ali'], ['Javeria Zahid', 'Rana Nazeer'],
  ['Saba Naz', 'Karamat Ali'], ['Sidra Noor', 'Muhammad Nawaz'], ['Hina Asghar', 'Allah Bakhsh'],
  ['Rabia Sultana', 'Muhammad Gulzar'],
] as const;

export let admissionStudents: AdmissionStudent[] = students.map(([name, fatherName], index) => {
  const classIndex = index % admissionClasses.length;
  const className = admissionClasses[classIndex];
  const programIndex = classIndex < 9 ? Math.floor(classIndex / 3) : classIndex === 11 ? 4 : 3;
  const program = admissionPrograms[programIndex];
  const gender = index < 20 ? 'Male' : 'Female';
  const rollPrefix = ['CIT', 'FT', 'LT', 'DA', 'CA'][programIndex];
  return {
    id: `tevta-student-${String(index + 1).padStart(2, '0')}`,
    rollNo: `${rollPrefix}-${String((index % 14) + 1).padStart(2, '0')}`,
    registrationNo: `TEVTA-GRW-2025-${String(index + 1).padStart(4, '0')}`,
    name,
    fatherName,
    cnic: `${31000 + index}-123456${index % 10}-${(index % 9) + 1}`,
    bform: '',
    dob: `${2005 + (index % 5)}-${String((index % 12) + 1).padStart(2, '0')}-15`,
    gender,
    phone: `+92 300 ${String(1234000 + index).slice(-7)}`,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@student.gilt.test`,
    address: `${['Satellite Town', 'Model Town', 'People’s Colony', 'Civil Lines'][index % 4]}, Gujranwala, Punjab`,
    program,
    className,
    year: classIndex < 9 ? `Year ${(classIndex % 3) + 1}` : 'Batch 1',
    section: index % 3 === 0 ? 'A' : index % 3 === 1 ? 'B' : 'C',
    session: '2025–2026',
    status: index % 13 === 0 ? 'Pending' : index % 17 === 0 ? 'Graduated' : 'Active',
    admissionDate: `2025-${String((index % 8) + 1).padStart(2, '0')}-0${(index % 8) + 1}`,
    guardian: fatherName,
    guardianPhone: `+92 321 ${String(7654000 + index).slice(-7)}`,
    emergencyContact: `+92 333 ${String(6543000 + index).slice(-7)}`,
    previousSchool: ['Govt. High School Satellite Town', 'Al-Noor Public School', 'Gujranwala Model School'][index % 3],
  };
});

export function addAdmissionStudent(student: AdmissionStudent): void {
  admissionStudents = [student, ...admissionStudents];
}

export function removeAdmissionStudent(id: string): void {
  admissionStudents = admissionStudents.filter((student) => student.id !== id);
}

export function updateAdmissionStudent(id: string, updates: Partial<AdmissionStudent>): void {
  admissionStudents = admissionStudents.map((student) =>
    student.id === id ? { ...student, ...updates } : student,
  );
}