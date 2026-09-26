import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown, ArrowUp, ArrowUpDown, ArrowLeft, BookOpen, Check, ChevronLeft, ChevronRight,
  Download, FileText, Filter, GraduationCap, MoreHorizontal, Pencil, Plus, Search,
  Trash2, Upload, Users,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { admissionClasses, admissionPrograms, admissionStudents, addAdmissionStudent, removeAdmissionStudent, updateAdmissionStudent, type AdmissionStudent } from '@/mocks/admissions';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;
const statusTone = { Active: 'success', Pending: 'warning', Graduated: 'neutral' } as const;
const admissionSchema = z.object({
  name: z.string().min(2, 'Enter the student full name'),
  fatherName: z.string().min(2, 'Enter the father or guardian name'),
  identityNo: z.string().min(5, 'Enter a CNIC or B-form number'),
  dob: z.string().min(1, 'Select date of birth'),
  gender: z.enum(['Female', 'Male']),
  phone: z.string().min(8, 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email address'),
  address: z.string().min(5, 'Enter the home address'),
  program: z.string().min(1, 'Choose a program'),
  className: z.string().min(1, 'Choose a class or batch'),
  year: z.string().min(1, 'Choose a year or batch'),
  section: z.string().min(1, 'Choose a section'),
  session: z.string().min(4, 'Enter an academic session'),
  admissionDate: z.string().min(1, 'Select an admission date'),
  previousSchool: z.string().min(2, 'Enter previous school or N/A'),
  guardian: z.string().min(2, 'Enter a guardian name'),
  guardianPhone: z.string().min(8, 'Enter a guardian phone'),
  emergencyContact: z.string().min(8, 'Enter an emergency contact'),
  photoUrl: z.string().url('Enter a valid image URL').or(z.literal('')),
});
type AdmissionValues = z.infer<typeof admissionSchema>;

function AdmissionLoading() {
  return <div role="status" aria-label="Loading students" className="animate-pulse space-y-4">
    <div className="h-8 w-52 rounded-md bg-slate-200" />
    <div className="h-24 rounded-md bg-slate-100" />
    <div className="h-72 rounded-md bg-slate-100" />
  </div>;
}

function AdmissionError({ retry }: { retry: () => void }) {
  return <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
    <p className="font-semibold">Student directory could not be loaded.</p>
    <p className="mt-1">Your local sample data is still available. Retry loading the directory.</p>
    <Button className="mt-3" variant="outline" size="sm" onClick={retry}>Retry</Button>
  </div>;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function SortButton({ label, active, direction, onClick }: { label: string; active: boolean; direction: 'asc' | 'desc'; onClick: () => void }) {
  const Icon = active ? direction === 'asc' ? ArrowUp : ArrowDown : ArrowUpDown;
  return <button type="button" onClick={onClick} className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-primary-700">
    {label}<Icon className="h-3.5 w-3.5" aria-hidden />
  </button>;
}

export default function StudentsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState(admissionStudents);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [program, setProgram] = useState('all');
  const [className, setClassName] = useState('all');
  const [year, setYear] = useState('all');
  const [section, setSection] = useState('all');
  const [status, setStatus] = useState('all');
  const [gender, setGender] = useState('all');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof AdmissionStudent>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [deleteTarget, setDeleteTarget] = useState<AdmissionStudent | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRows(admissionStudents);
      setLoading(false);
    }, 240);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const result = rows.filter((student) =>
      (!term || [student.name, student.fatherName, student.rollNo, student.registrationNo, student.email].some((value) => value.toLowerCase().includes(term))) &&
      (program === 'all' || student.program === program) &&
      (className === 'all' || student.className === className) &&
      (year === 'all' || student.year === year) &&
      (section === 'all' || student.section === section) &&
      (status === 'all' || student.status === status) &&
      (gender === 'all' || student.gender === gender),
    );
    result.sort((a, b) => String(a[sortKey]).localeCompare(String(b[sortKey]), undefined, { numeric: true }) * (sortDirection === 'asc' ? 1 : -1));
    return result;
  }, [className, gender, program, rows, search, section, sortDirection, sortKey, status, year]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeCount = rows.filter((student) => student.status === 'Active').length;

  const sortBy = (key: keyof AdmissionStudent) => {
    setSortDirection((current) => key === sortKey && current === 'asc' ? 'desc' : 'asc');
    setSortKey(key);
  };
  const promote = (student: AdmissionStudent) => {
    const nextYear = student.year.startsWith('Year ') ? Number(student.year.slice(-1)) + 1 : 2;
    const updatedYear = nextYear > 3 ? 'Graduated' : `Year ${nextYear}`;
    updateAdmissionStudent(student.id, { year: updatedYear, status: updatedYear === 'Graduated' ? 'Graduated' : 'Active' });
    setRows([...admissionStudents]);
    toast.success('Student promoted', `${student.name} moved to ${updatedYear}.`);
  };
  const removeStudent = () => {
    if (!deleteTarget) return;
    removeAdmissionStudent(deleteTarget.id);
    setRows([...admissionStudents]);
    toast.success('Student removed', `${deleteTarget.name} was removed from the local directory.`);
    setDeleteTarget(null);
  };
  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    const cells = (line: string) => {
      const result: string[] = [];
      let value = '';
      let quoted = false;
      for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        if (char === '"' && line[index + 1] === '"' && quoted) { value += '"'; index += 1; }
        else if (char === '"') quoted = !quoted;
        else if (char === ',' && !quoted) { result.push(value.trim()); value = ''; }
        else value += char;
      }
      result.push(value.trim());
      return result;
    };
    const headers = cells(lines[0]).map((header) => header.replace(/^\uFEFF/, ''));
    const records = lines.slice(1, 101).map(cells);
    setCsvText(text);
    setCsvHeaders(headers);
    setCsvRows(records);
    setMapping(Object.fromEntries(['name', 'fatherName', 'rollNo', 'email', 'program'].map((key) => {
      const found = headers.find((header) => header.toLowerCase().includes(key.toLowerCase().replace('fatherName', 'father')));
      return [key, found ?? ''];
    })));
  };
  const importCsv = () => {
    const nameIndex = csvHeaders.indexOf(mapping.name);
    if (nameIndex < 0 || !csvRows.length) {
      toast.error('Map a name column', 'Choose the column containing each student name.');
      return;
    }
    const imported = csvRows.flatMap((cells, index) => {
      const name = cells[nameIndex]?.trim();
      if (!name) return [];
      const father = cells[csvHeaders.indexOf(mapping.fatherName)] || 'Guardian name required';
      const selectedProgram = cells[csvHeaders.indexOf(mapping.program)] || admissionPrograms[0];
      const targetClass = admissionClasses.find((item) => item.toLowerCase().includes(selectedProgram.slice(0, 3).toLowerCase())) || admissionClasses[0];
      const id = `csv-student-${Date.now()}-${index}`;
      return [{
        ...admissionStudents[0], id, name, fatherName: father,
        rollNo: cells[csvHeaders.indexOf(mapping.rollNo)] || `NEW-${String(index + 1).padStart(2, '0')}`,
        email: cells[csvHeaders.indexOf(mapping.email)] || `${id}@student.gilt.test`,
        program: admissionPrograms.includes(selectedProgram) ? selectedProgram : admissionPrograms[0],
        className: targetClass,
        registrationNo: `TEVTA-GRW-2026-${String(admissionStudents.length + index + 1).padStart(4, '0')}`,
      } satisfies AdmissionStudent];
    });
    imported.forEach(addAdmissionStudent);
    setRows([...admissionStudents]);
    setImportOpen(false);
    setCsvText('');
    setCsvRows([]);
    toast.success('Import complete', `${imported.length} student records added to the local sample.`);
  };

  if (loading) return <AdmissionLoading />;
  if (error) return <AdmissionError retry={() => { setError(false); setLoading(true); window.setTimeout(() => { setRows(admissionStudents); setLoading(false); }, 240); }} />;

  return <div>
    <PageHeader
      title="Student admissions"
      description="Manage enrolments and student records across GILT Gujranwala programs."
      icon={<GraduationCap className="h-5 w-5" aria-hidden />}
      actions={<>
        <Button variant="outline" leftIcon={<Upload className="h-4 w-4" />} onClick={() => setImportOpen(true)}>Import CSV</Button>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/students/new')}>Add student</Button>
      </>}
    />

    <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[
        { label: 'Enrolled students', value: rows.length, foot: 'Across 5 programs', icon: Users },
        { label: 'Active enrollment', value: activeCount, foot: `${Math.round(activeCount / Math.max(rows.length, 1) * 100)}% of directory`, icon: GraduationCap },
        { label: 'Programs', value: admissionPrograms.length, foot: '3 diplomas · 2 courses', icon: BookOpen },
        { label: 'Needs review', value: rows.filter((student) => student.status === 'Pending').length, foot: 'Admission files pending', icon: FileText },
      ].map((stat) => <Card key={stat.label} className="p-4">
        <div className="flex items-start justify-between"><span className="text-xs font-medium text-slate-500">{stat.label}</span><stat.icon className="h-4 w-4 text-primary-600" aria-hidden /></div>
        <p className="mt-2 text-2xl font-semibold text-slate-900">{stat.value}</p><p className="mt-1 text-xs text-slate-500">{stat.foot}</p>
      </Card>)}
    </div>

    <Card className="overflow-hidden">
      <div className="border-b border-slate-200 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, father, roll or registration no." aria-label="Search students" className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:flex xl:flex-wrap">
            <Select aria-label="Filter by program" value={program} onChange={(event) => { setProgram(event.target.value); setPage(1); }} options={[{ label: 'All programs', value: 'all' }, ...admissionPrograms.map((item) => ({ label: item.replace('DAE ', ''), value: item }))]} />
            <Select aria-label="Filter by class" value={className} onChange={(event) => { setClassName(event.target.value); setPage(1); }} options={[{ label: 'All classes', value: 'all' }, ...admissionClasses.map((item) => ({ label: item, value: item }))]} />
            <Select aria-label="Filter by year" value={year} onChange={(event) => { setYear(event.target.value); setPage(1); }} options={[{ label: 'All years', value: 'all' }, ...['Year 1', 'Year 2', 'Year 3', 'Batch 1', 'Batch 2'].map((item) => ({ label: item, value: item }))]} />
            <Select aria-label="Filter by section" value={section} onChange={(event) => { setSection(event.target.value); setPage(1); }} options={[{ label: 'All sections', value: 'all' }, ...['A', 'B', 'C'].map((item) => ({ label: `Section ${item}`, value: item }))]} />
            <Select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} options={[{ label: 'All statuses', value: 'all' }, ...['Active', 'Pending', 'Graduated'].map((item) => ({ label: item, value: item }))]} />
            <Select aria-label="Filter by gender" value={gender} onChange={(event) => { setGender(event.target.value); setPage(1); }} options={[{ label: 'All genders', value: 'all' }, ...['Female', 'Male'].map((item) => ({ label: item, value: item }))]} />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Filter className="h-3.5 w-3.5" aria-hidden />{filtered.length} matching students</span><span>Session 2025–2026</span></div>
      </div>
      {filtered.length === 0 ? <div className="p-10"><EmptyState icon={<Users className="h-6 w-6" aria-hidden />} title="No students match these filters" description="Try another program or clear the search." action={<Button variant="outline" onClick={() => { setSearch(''); setProgram('all'); setClassName('all'); setYear('all'); setSection('all'); setStatus('all'); setGender('all'); }}>Clear filters</Button>} /></div> : <>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-xs"><tr>
              <th className="px-4 py-3"><SortButton label="Student" active={sortKey === 'name'} direction={sortDirection} onClick={() => sortBy('name')} /></th>
              <th className="px-4 py-3"><SortButton label="Roll no." active={sortKey === 'rollNo'} direction={sortDirection} onClick={() => sortBy('rollNo')} /></th>
              <th className="px-4 py-3">Father / guardian</th><th className="px-4 py-3">Program</th>
              <th className="px-4 py-3">Class</th><th className="px-4 py-3">Session</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.map((student) => <motion.tr key={student.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-slate-50/70">
                <td className="px-4 py-3"><Link to={`/students/${student.id}`} className="flex items-center gap-3 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"><Avatar name={student.name} color="#2563eb" size="sm" /><span className="min-w-0"><span className="block font-medium text-slate-800">{student.name}</span><span className="block text-xs text-slate-500">{student.registrationNo}</span></span></Link></td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{student.rollNo}</td><td className="px-4 py-3 text-slate-600">{student.fatherName}</td>
                <td className="max-w-52 truncate px-4 py-3 text-slate-600">{student.program}</td><td className="px-4 py-3 text-slate-600">{student.className} · {student.section}</td>
                <td className="px-4 py-3 text-slate-600">{student.session}</td><td className="px-4 py-3"><Badge tone={statusTone[student.status]}>{student.status}</Badge></td>
                <td className="px-4 py-3"><div className="flex justify-end gap-1">
                  <IconButton size="sm" variant="ghost" label={`View ${student.name}`} onClick={() => navigate(`/students/${student.id}`)}><MoreHorizontal className="h-4 w-4" /></IconButton>
                  <IconButton size="sm" variant="ghost" label={`Edit ${student.name}`} onClick={() => navigate(`/students/${student.id}/edit`)}><Pencil className="h-4 w-4" /></IconButton>
                  <IconButton size="sm" variant="ghost" label={`Promote ${student.name}`} onClick={() => promote(student)}><ArrowUp className="h-4 w-4" /></IconButton>
                  <IconButton size="sm" variant="ghost" label={`Delete ${student.name}`} onClick={() => setDeleteTarget(student)}><Trash2 className="h-4 w-4 text-rose-600" /></IconButton>
                </div></td>
              </motion.tr>)}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-2"><IconButton size="sm" variant="outline" label="Previous page" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="h-4 w-4" /></IconButton><span>Page {page} of {pageCount}</span><IconButton size="sm" variant="outline" label="Next page" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}><ChevronRight className="h-4 w-4" /></IconButton></div>
        </div>
      </>}
    </Card>

    <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import students from CSV" description="Map your columns, review the first rows, then add them to the sample directory." size="lg" footer={<><Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button><Button onClick={importCsv} disabled={!csvRows.length}>Import {csvRows.length} rows</Button></>}>
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center hover:border-primary-400 hover:bg-primary-50/40">
        <Upload className="mb-2 h-5 w-5 text-primary-600" aria-hidden /><span className="text-sm font-medium text-slate-800">Choose a CSV file</span><span className="mt-1 text-xs text-slate-500">{csvText ? `${csvRows.length} rows ready for preview` : 'CSV format with a header row'}</span>
        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void file.text().then(parseCsv); }} />
      </label>
      {csvHeaders.length > 0 && <div className="mt-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{['name', 'fatherName', 'rollNo', 'email', 'program'].map((key) => <Select key={key} label={`Map ${key === 'fatherName' ? 'father name' : key}`} value={mapping[key] ?? ''} onChange={(event) => setMapping((current) => ({ ...current, [key]: event.target.value }))} options={[{ label: 'Not mapped', value: '' }, ...csvHeaders.map((header) => ({ label: header, value: header }))]} />)}</div>
        <div className="overflow-x-auto rounded-md border border-slate-200"><table className="min-w-full text-xs"><thead className="bg-slate-50"><tr>{csvHeaders.map((header) => <th key={header} className="px-3 py-2 text-left font-semibold text-slate-600">{header}</th>)}</tr></thead><tbody>{csvRows.slice(0, 4).map((row, index) => <tr key={index} className="border-t border-slate-100">{csvHeaders.map((header, cellIndex) => <td key={header} className="max-w-48 truncate px-3 py-2 text-slate-600">{row[cellIndex] || '—'}</td>)}</tr>)}</tbody></table></div>
      </div>}
    </Modal>
    <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={removeStudent} title="Delete student record?" description={`Remove ${deleteTarget?.name ?? 'this student'} from the local directory?`} confirmLabel="Delete student" />
  </div>;
}

const stepFields: (keyof AdmissionValues)[][] = [
  ['name', 'fatherName', 'identityNo', 'dob', 'gender', 'phone', 'email', 'address', 'photoUrl'],
  ['program', 'className', 'year', 'section', 'session', 'admissionDate', 'previousSchool'],
  ['guardian', 'guardianPhone', 'emergencyContact'],
  [],
];
const stepLabels = ['Personal', 'Academic', 'Guardian', 'Review'];

export function StudentWizardPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { studentId } = useParams();
  const existing = studentId ? admissionStudents.find((student) => student.id === studentId) : undefined;
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const { register, handleSubmit, trigger, watch, formState: { errors } } = useForm<AdmissionValues>({
    resolver: zodResolver(admissionSchema),
    defaultValues: existing ? {
      ...existing,
      identityNo: existing.cnic || existing.bform,
      photoUrl: '',
    } : {
      name: '', fatherName: '', identityNo: '', dob: '', gender: 'Female', phone: '', email: '', address: '',
      program: admissionPrograms[0], className: admissionClasses[0], year: 'Year 1', section: 'A', session: '2025–2026',
      admissionDate: new Date().toISOString().slice(0, 10), previousSchool: '', guardian: '', guardianPhone: '', emergencyContact: '', photoUrl: '',
    },
  });
  const values = watch();

  const next = async () => {
    const valid = await trigger(stepFields[step]);
    if (valid) setStep((current) => Math.min(current + 1, 3));
  };
  const onSubmit = async (form: AdmissionValues) => {
    setSaving(true);
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    const nextStudent: AdmissionStudent = {
      id: existing?.id ?? `admission-${Date.now()}`,
      rollNo: existing?.rollNo ?? `NEW-${String(admissionStudents.length + 1).padStart(3, '0')}`,
      registrationNo: existing?.registrationNo ?? `TEVTA-GRW-2026-${String(admissionStudents.length + 1).padStart(4, '0')}`,
      ...existing,
      name: form.name,
      fatherName: form.fatherName,
      cnic: form.identityNo.includes('-') ? form.identityNo : '',
      bform: form.identityNo.includes('-') ? '' : form.identityNo,
      dob: form.dob,
      gender: form.gender,
      phone: form.phone,
      email: form.email,
      address: form.address,
      program: form.program,
      className: form.className,
      year: form.year,
      section: form.section,
      session: form.session,
      status: existing?.status ?? 'Active',
      admissionDate: form.admissionDate,
      guardian: form.guardian,
      guardianPhone: form.guardianPhone,
      emergencyContact: form.emergencyContact,
      previousSchool: form.previousSchool,
    };
    if (existing) updateAdmissionStudent(existing.id, nextStudent);
    else addAdmissionStudent(nextStudent);
    setSaving(false);
    toast.success(existing ? 'Student record updated' : 'Admission saved', `${form.name} is now in the local student directory.`);
    navigate(`/students/${nextStudent.id}`);
  };

  if (studentId && !existing) return <EmptyState icon={<Users className="h-6 w-6" aria-hidden />} title="Student not found" description="This student record is not in the local sample directory." action={<Button onClick={() => navigate('/students')}>Back to students</Button>} />;

  return <div>
    <PageHeader title={existing ? `Edit ${existing.name}` : 'New student admission'} description="Complete each section, then review the student record before saving." icon={<GraduationCap className="h-5 w-5" aria-hidden />} crumbs={[{ label: 'Students', to: '/students' }, { label: existing ? 'Edit record' : 'New admission' }]} />
    <div className="mb-6 grid grid-cols-4 gap-2" aria-label="Admission progress">
      {stepLabels.map((label, index) => <button key={label} type="button" onClick={() => index < step && setStep(index)} className="text-left" aria-current={step === index ? 'step' : undefined}>
        <span className={cn('mb-2 block h-1 rounded-full', index <= step ? 'bg-primary-600' : 'bg-slate-200')} />
        <span className={cn('text-xs font-medium', index === step ? 'text-primary-700' : 'text-slate-500')}>{String(index + 1).padStart(2, '0')} · {label}</span>
      </button>)}
    </div>
    <form onSubmit={handleSubmit(onSubmit)}>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.16 }}>
          {step === 0 && <Card className="p-5 sm:p-6"><CardHeader title="Personal information" subtitle="Identity and contact details for the student record." />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Input label="Full name" required error={errors.name?.message} {...register('name')} />
              <Input label="Father / guardian name" required error={errors.fatherName?.message} {...register('fatherName')} />
              <Input label="CNIC or B-form" required error={errors.identityNo?.message} {...register('identityNo')} />
              <Input label="Date of birth" type="date" required error={errors.dob?.message} {...register('dob')} />
              <Select label="Gender" options={[{ label: 'Female', value: 'Female' }, { label: 'Male', value: 'Male' }]} {...register('gender')} />
              <Input label="Phone" required placeholder="+92 300 0000000" error={errors.phone?.message} {...register('phone')} />
              <Input label="Email" type="email" required error={errors.email?.message} {...register('email')} />
              <Input label="Photo URL" type="url" error={errors.photoUrl?.message} {...register('photoUrl')} />
              <Textarea label="Home address" required rows={2} containerClassName="sm:col-span-2 xl:col-span-3" error={errors.address?.message} {...register('address')} />
              <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-600 sm:col-span-2 xl:col-span-3">
                <Upload className="h-4 w-4 text-primary-600" aria-hidden /><span>{photoUrl || 'Choose a photo from this device (preview only)'}</span>
                <input type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) setPhotoUrl(file.name); }} />
              </label>
            </div>
          </Card>}
          {step === 1 && <Card className="p-5 sm:p-6"><CardHeader title="Academic placement" subtitle="Choose the program, year, class group and intake session." />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Select label="Program" required options={admissionPrograms.map((item) => ({ label: item, value: item }))} error={errors.program?.message} {...register('program')} />
              <Select label="Year / semester / batch" required options={['Year 1', 'Year 2', 'Year 3', 'Batch 1', 'Batch 2'].map((item) => ({ label: item, value: item }))} error={errors.year?.message} {...register('year')} />
              <Select label="Section" required options={['A', 'B', 'C'].map((item) => ({ label: `Section ${item}`, value: item }))} {...register('section')} />
              <Select label="Class or batch" required options={admissionClasses.map((item) => ({ label: item, value: item }))} error={errors.className?.message} {...register('className')} />
              <Input label="Academic session" required error={errors.session?.message} {...register('session')} />
              <Input label="Admission date" type="date" required error={errors.admissionDate?.message} {...register('admissionDate')} />
              <Input label="Previous school / institute" required containerClassName="sm:col-span-2 xl:col-span-3" error={errors.previousSchool?.message} {...register('previousSchool')} />
            </div>
          </Card>}
          {step === 2 && <Card className="p-5 sm:p-6"><CardHeader title="Guardian & emergency contact" subtitle="Add the primary family contact and an alternate emergency number." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Guardian name" required error={errors.guardian?.message} {...register('guardian')} />
              <Input label="Guardian phone" required error={errors.guardianPhone?.message} {...register('guardianPhone')} />
              <Input label="Emergency contact" required hint="Use a second reachable number." error={errors.emergencyContact?.message} {...register('emergencyContact')} />
            </div>
          </Card>}
          {step === 3 && <Card className="p-5 sm:p-6"><CardHeader title="Review admission" subtitle="Confirm these details before adding the student." />
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">{[
              ['Student', values.name], ['Father / guardian', values.fatherName], ['CNIC / B-form', values.identityNo], ['Date of birth', values.dob], ['Gender', values.gender], ['Phone', values.phone], ['Email', values.email], ['Address', values.address], ['Program', values.program], ['Class', `${values.className} · ${values.section}`], ['Session', values.session], ['Admission date', values.admissionDate], ['Previous institute', values.previousSchool], ['Guardian contact', `${values.guardian} · ${values.guardianPhone}`], ['Emergency contact', values.emergencyContact],
            ].map(([label, value]) => <div key={label}><p className="text-xs font-medium uppercase text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-medium text-slate-800">{value || '—'}</p></div>)}</div>
          </Card>}
        </motion.div>
      </AnimatePresence>
      <div className="mt-5 flex flex-wrap justify-between gap-2"><Button type="button" variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => step === 0 ? navigate('/students') : setStep((current) => current - 1)}>{step === 0 ? 'Cancel' : 'Previous'}</Button><div className="flex gap-2">{step < 3 ? <Button type="button" onClick={() => void next()}>Continue <ChevronRight className="ml-1 h-4 w-4" /></Button> : <Button type="submit" loading={saving} leftIcon={<Check className="h-4 w-4" />}>{existing ? 'Save changes' : 'Save admission'}</Button>}</div></div>
    </form>
  </div>;
}

const detailTabs = ['Profile', 'Attendance', 'Marks', 'Fees', 'Timetable', 'Documents'] as const;
type DetailTab = typeof detailTabs[number];
const attendanceTrend = [
  { month: 'Apr', rate: 92 }, { month: 'May', rate: 88 }, { month: 'Jun', rate: 95 },
  { month: 'Jul', rate: 90 }, { month: 'Aug', rate: 94 }, { month: 'Sep', rate: 96 },
];

export function StudentDetailPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const student = admissionStudents.find((item) => item.id === studentId);
  const [tab, setTab] = useState<DetailTab>('Profile');
  if (!student) return <EmptyState icon={<Users className="h-6 w-6" aria-hidden />} title="Student not found" description="This record is not in the local admission sample." action={<Button onClick={() => navigate('/students')}>Back to directory</Button>} />;

  return <div>
    <PageHeader title={student.name} description={`${student.program} · ${student.className} · Section ${student.section}`} icon={<GraduationCap className="h-5 w-5" aria-hidden />} crumbs={[{ label: 'Students', to: '/students' }, { label: student.rollNo }]} actions={<><Button variant="outline" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => navigate(`/students/${student.id}/edit`)}>Edit profile</Button><Button leftIcon={<Download className="h-4 w-4" />} onClick={() => toast.success('ID card prepared', 'Student ID card preview is ready to print.')}>ID card</Button></>} />
    <Card className="mb-5 overflow-hidden">
      <div className="flex flex-col gap-4 bg-gradient-to-r from-primary-50 via-white to-sky-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4"><Avatar name={student.name} color="#2563eb" size="lg" /><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-slate-900">{student.name}</h2><Badge tone={statusTone[student.status]}>{student.status}</Badge></div><p className="mt-1 text-sm text-slate-600">{student.rollNo} <span className="mx-1 text-slate-300">/</span> {student.registrationNo}</p><p className="mt-1 text-xs text-slate-500">{student.email} · {student.phone}</p></div></div>
        <div className="grid grid-cols-2 gap-5 text-sm sm:text-right"><div><p className="text-xs text-slate-500">Program</p><p className="mt-1 font-medium text-slate-800">{student.program.replace('DAE ', '')}</p></div><div><p className="text-xs text-slate-500">Academic session</p><p className="mt-1 font-medium text-slate-800">{student.session}</p></div></div>
      </div>
      <div role="tablist" aria-label="Student record sections" className="flex gap-1 overflow-x-auto border-t border-slate-200 px-3">{detailTabs.map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={cn('whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium', tab === item ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>{item}</button>)}</div>
    </Card>
    <AnimatePresence mode="wait"><motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
      {tab === 'Profile' && <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2"><CardHeader title="Personal & admission details" subtitle="Information recorded during enrollment." /><dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">{[['Father / guardian', student.fatherName], ['CNIC / B-form', student.cnic || student.bform || '—'], ['Date of birth', formatShortDate(student.dob)], ['Gender', student.gender], ['Home address', student.address], ['Previous institute', student.previousSchool], ['Admission date', formatShortDate(student.admissionDate)], ['Emergency contact', student.emergencyContact]].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd></div>)}</dl></Card>
        <Card className="p-5"><CardHeader title="Guardian contact" /><p className="font-medium text-slate-800">{student.guardian}</p><p className="mt-1 text-sm text-slate-500">{student.guardianPhone}</p><Button className="mt-4" variant="outline" size="sm" onClick={() => toast.info('Contact copied', student.guardianPhone)}>Copy contact</Button></Card>
      </div>}
      {tab === 'Attendance' && <div className="grid gap-4 lg:grid-cols-3"><Card className="p-5 lg:col-span-2"><CardHeader title="Attendance trend" subtitle="Monthly presence across this academic session." /><div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={attendanceTrend} margin={{ left: -20, right: 8, top: 8 }}><defs><linearGradient id="studentAttendanceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis domain={[60, 100]} unit="%" axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [`${value}%`, 'Attendance']} /><Area dataKey="rate" stroke="#2563eb" fill="url(#studentAttendanceFill)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></Card><Card className="p-5"><CardHeader title="This session" /><p className="text-3xl font-semibold text-slate-900">92.5%</p><p className="mt-1 text-sm text-slate-500">Attendance rate · 3 late arrivals</p><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span className="text-slate-500">Present</span><span className="font-medium">148 days</span></div><div className="flex justify-between"><span className="text-slate-500">Absent</span><span className="font-medium">12 days</span></div><div className="flex justify-between"><span className="text-slate-500">Late</span><span className="font-medium">3 days</span></div></div></Card></div>}
      {tab === 'Marks' && <Card className="overflow-hidden"><CardHeader className="p-5" title="Academic performance" subtitle="Sessional, mid-term and final results by subject." /><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50 text-xs"><tr>{['Subject', 'Sessional', 'Mid-term', 'Final', 'Total', 'Grade'].map((head) => <th key={head} className="px-5 py-3 font-semibold text-slate-500">{head}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{['Applied Mathematics', 'Computer Programming', 'English Communication', 'Technical Drawing'].map((subject, index) => <tr key={subject}><td className="px-5 py-3 font-medium text-slate-800">{subject}</td><td className="px-5 py-3">{72 + index * 4}/100</td><td className="px-5 py-3">{76 + index * 3}/100</td><td className="px-5 py-3">{80 + index * 2}/100</td><td className="px-5 py-3 font-medium">{76 + index * 3}%</td><td className="px-5 py-3"><Badge tone="success">{index < 2 ? 'A' : 'B+'}</Badge></td></tr>)}</tbody></table></div><div className="flex justify-between border-t border-slate-200 px-5 py-4 text-sm"><span className="text-slate-500">Current GPA</span><strong className="text-slate-900">3.42 / 4.00</strong></div></Card>}
      {tab === 'Fees' && <div className="grid gap-4 lg:grid-cols-3">{[['Annual tuition', 'Rs 54,000', 'Paid'], ['Workshop & lab', 'Rs 8,500', 'Partially paid'], ['Transport', 'Rs 12,000', 'Upcoming']].map(([label, amount, state]) => <Card key={label} className="p-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold text-slate-900">{amount}</p><div className="mt-3"><Badge tone={state === 'Paid' ? 'success' : state === 'Upcoming' ? 'warning' : 'neutral'}>{state}</Badge></div></Card>)}</div>}
      {tab === 'Timetable' && <Card className="overflow-hidden"><CardHeader className="p-5" title="Weekly timetable" subtitle={`${student.className} · Section ${student.section}`} /><div className="grid grid-cols-3 gap-px bg-slate-200 sm:grid-cols-6">{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => <div key={day} className="min-h-36 bg-white p-3"><p className="text-xs font-semibold text-slate-500">{day}</p>{['Applied Mathematics', 'Programming', 'English'].slice(index % 2, index % 2 + 2).map((subject, period) => <div key={subject} className="mt-3 rounded-md border-l-2 border-primary-500 bg-primary-50 p-2"><p className="text-[11px] font-medium text-slate-800">P{period + 1} · {subject}</p><p className="mt-1 text-[10px] text-slate-500">Room {101 + period}</p></div>)}</div>)}</div></Card>}
      {tab === 'Documents' && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[['Student ID card', 'Updated 02 Sep 2025'], ['Admission form', `Submitted ${formatShortDate(student.admissionDate)}`], ['Previous transcript', 'Uploaded 28 Aug 2025']].map(([title, detail]) => <Card key={title} className="flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-50 text-primary-700"><FileText className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-800">{title}</span><span className="mt-1 block text-xs text-slate-500">{detail}</span></span><IconButton size="sm" variant="ghost" label={`Download ${title}`} onClick={() => toast.success('Document ready', `${title} is ready to print.`)}><Download className="h-4 w-4" /></IconButton></Card>)}</div>}
    </motion.div></AnimatePresence>
  </div>;
}
