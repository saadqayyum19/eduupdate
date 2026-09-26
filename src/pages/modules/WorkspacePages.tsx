import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity, ArrowDown, ArrowUp, ArrowUpDown, BadgeCheck, Banknote, BookOpen, CalendarDays,
  Check, ChevronLeft, ChevronRight, ClipboardList, Download, FileBarChart2, FileSpreadsheet, Filter,
  Landmark, MoreHorizontal, Pencil, Plus, Search, Settings2, ShieldCheck, Trash2,
  UserRoundCog, Users, Wallet,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Avatar } from '@/components/ui/Avatar';
import { Badge as StatusBadge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { announcements as seededAnnouncements } from '@/mocks/announcements';
import { admissionPrograms, admissionStudents } from '@/mocks/admissions';
import { getInstitutionFeatures, setInstitutionFeature, type InstitutionFeature } from '@/mocks/institutionFeatures';
import { cn } from '@/lib/utils';

interface WorkspaceItem {
  id: string;
  name: string;
  secondary: string;
  group: string;
  status: string;
  date: string;
  value: number;
  detail: string;
}

type WorkspaceKind = 'teachers' | 'programs' | 'exams' | 'assignments' | 'fees' | 'announcements' | 'institutions';

const names = ['Nadia Iqbal', 'Usman Ghani', 'Bushra Rasheed', 'Kamran Shahzad', 'Rubina Parveen', 'Adnan Maqsood', 'Shazia Mumtaz', 'Waqas Ahmed', 'Hina Batool', 'Sajid Hussain', 'Amna Yousaf', 'Zeeshan Rafiq'];
const seedRows: Record<WorkspaceKind, WorkspaceItem[]> = {
  teachers: names.map((name, index) => ({ id: `teacher-${index + 1}`, name, secondary: `${name.toLowerCase().replace(/ /g, '.')}@gilt.test`, group: ['Computer & IT', 'Footwear', 'Leather Technology'][index % 3], status: 'Active', date: '2025-08-15', value: 18 + index % 7, detail: `${index % 4 + 2} assigned cohorts · ${18 + index % 7} weekly periods` })),
  programs: admissionPrograms.map((name, index) => ({ id: `program-${index + 1}`, name, secondary: ['DAE-CIT', 'DAE-FT', 'DAE-LT', 'SC-DA', 'SC-CA'][index], group: index < 3 ? 'Diploma · 3 years' : 'Certificate · 1 year', status: 'Active', date: '2025-09-01', value: index < 3 ? 90 - index * 3 : 24, detail: index < 3 ? '6 semesters · Gujranwala campus' : '2 semesters · Gujranwala campus' })),
  exams: [
    { id: 'exam-mid', name: 'Autumn mid-term assessment', secondary: 'Exam series · Autumn 2025', group: 'Mid-term', status: 'Scheduled', date: '2025-10-12', value: 7, detail: '7 papers · DAE CIT Year 1' },
    { id: 'exam-practical', name: 'Workshop practical evaluation', secondary: 'Exam series · Autumn 2025', group: 'Practical', status: 'Draft', date: '2025-10-20', value: 4, detail: '4 practical stations · Footwear Technology' },
    { id: 'exam-final', name: 'End-of-term examinations', secondary: 'Exam series · Autumn 2025', group: 'Final', status: 'Scheduled', date: '2025-12-08', value: 15, detail: '15 papers across active programs' },
  ],
  assignments: [
    { id: 'assignment-1', name: 'C++ Practical Exercise 1', secondary: 'DAE CIT · Year 1 · Computer Programming', group: 'Practical', status: 'Open', date: '2026-10-03', value: 20, detail: '32 submissions · 26 graded · Rubric: correctness, style, test coverage' },
    { id: 'assignment-2', name: 'Portfolio website', secondary: 'DAE CIT · Year 2 · Web Development', group: 'Project', status: 'Open', date: '2026-10-08', value: 30, detail: '28 submissions · 19 graded · Rubric: responsive layout, accessibility, code quality' },
    { id: 'assignment-3', name: 'Leather quality inspection report', secondary: 'DAE Leather · Year 1', group: 'Report', status: 'Review', date: '2026-09-29', value: 25, detail: '14 submissions · 9 graded · Rubric: method, observations, conclusion' },
    { id: 'assignment-4', name: 'Footwear pattern design', secondary: 'DAE Footwear · Year 2', group: 'Practical', status: 'Closed', date: '2026-09-18', value: 25, detail: '12 submissions · 12 graded · Feedback published' },
  ],
  fees: [
    { id: 'fee-1', name: 'DAE monthly tuition', secondary: 'CIT Year 1 · 32 invoices', group: 'Tuition', status: 'Active', date: '2026-10-05', value: 4500, detail: 'Rs 108,000 collected of Rs 144,000' },
    { id: 'fee-2', name: 'Workshop & lab charges', secondary: 'Footwear Year 1 · 28 invoices', group: 'Lab charges', status: 'Active', date: '2026-10-05', value: 1800, detail: 'Rs 38,400 collected of Rs 50,400' },
    { id: 'fee-3', name: 'Student transport', secondary: 'All active programs · 18 invoices', group: 'Transport', status: 'Active', date: '2026-10-10', value: 2500, detail: 'Rs 28,500 collected of Rs 45,000' },
    { id: 'fee-4', name: 'Examination fee', secondary: 'Autumn 2025 · 84 invoices', group: 'Examination', status: 'Overdue', date: '2026-09-20', value: 1200, detail: '19 invoices overdue · Rs 22,800 outstanding' },
    { id: 'fee-5', name: 'Clinical practice kit', secondary: 'Clinical Assistant · 16 invoices', group: 'Course materials', status: 'Partial', date: '2026-09-30', value: 3200, detail: 'Rs 32,000 collected of Rs 51,200' },
  ],
  announcements: seededAnnouncements.map((item, index) => ({ id: item.id, name: item.title, secondary: item.body, group: index === 0 ? 'All community' : 'Students & parents', status: item.priority === 'high' ? 'Pinned' : 'Published', date: item.createdAt.slice(0, 10), value: 0, detail: `Audience: ${Array.isArray(item.audience) ? item.audience.join(', ') : item.audience}` })),
  institutions: [{ id: 'gilt-grw', name: 'Gujranwala Institute of Leather Technology', secondary: 'GILT Gujranwala · Punjab', group: 'College', status: 'Active', date: '2025-08-01', value: 132, detail: '132 users · 12 cohorts · Academic year 2025–2026' }],
};

const config: Record<WorkspaceKind, { title: string; description: string; icon: typeof Users; addLabel: string; noun: string; filters: string[] }> = {
  teachers: { title: 'Teacher directory', description: 'Staff profiles, teaching assignments and weekly workload.', icon: UserRoundCog, addLabel: 'Add teacher', noun: 'teacher', filters: ['All departments', 'Computer & IT', 'Footwear', 'Leather Technology'] },
  programs: { title: 'Programs & departments', description: 'Academic offerings, departments, durations and credit-hour plans.', icon: BookOpen, addLabel: 'Add program', noun: 'program', filters: ['All levels', 'Diploma · 3 years', 'Certificate · 1 year'] },
  exams: { title: 'Exams & assessments', description: 'Plan exam series, schedules, rooms and student seating.', icon: CalendarDays, addLabel: 'Create exam', noun: 'exam', filters: ['All exam types', 'Mid-term', 'Practical', 'Final'] },
  assignments: { title: 'Assignments', description: 'Manage coursework deadlines, submissions, rubrics and grading.', icon: ClipboardList, addLabel: 'Create assignment', noun: 'assignment', filters: ['All types', 'Practical', 'Project', 'Report'] },
  fees: { title: 'Fees & invoices', description: 'Fee structures, collections, payments and defaulters.', icon: Wallet, addLabel: 'Create fee structure', noun: 'fee structure', filters: ['All categories', 'Tuition', 'Lab charges', 'Transport', 'Examination'] },
  announcements: { title: 'Announcements', description: 'Notices for students, families, teachers and staff.', icon: Activity, addLabel: 'New announcement', noun: 'announcement', filters: ['All audiences', 'All community', 'Students & parents'] },
  institutions: { title: 'Institutions', description: 'Manage institution profiles, academic year and campus status.', icon: Landmark, addLabel: 'Add institution', noun: 'institution', filters: ['All institution types', 'School', 'College', 'University'] },
};

const formSchema = z.object({
  name: z.string().min(3, 'Enter at least 3 characters'),
  secondary: z.string().min(3, 'Add a short description'),
  group: z.string().min(2, 'Choose a type or department'),
  date: z.string().min(1, 'Choose a date'),
  value: z.coerce.number().min(0, 'Enter a positive number'),
  detail: z.string().min(4, 'Add details for this record'),
});
type FormValues = z.infer<typeof formSchema>;

const toneFor = (status: string) => status === 'Active' || status === 'Published' || status === 'Open' ? 'success' : status === 'Scheduled' || status === 'Review' || status === 'Partial' || status === 'Pinned' ? 'warning' : status === 'Overdue' || status === 'Inactive' ? 'danger' : 'neutral';
const numberText = (value: number) => value.toLocaleString('en-PK');

function WorkspaceLoading() {
  return <div role="status" aria-label="Loading workspace" className="animate-pulse space-y-4"><div className="h-8 w-64 rounded-md bg-slate-200" /><div className="grid gap-3 sm:grid-cols-3"><div className="h-24 rounded-md bg-slate-100" /><div className="h-24 rounded-md bg-slate-100" /><div className="h-24 rounded-md bg-slate-100" /></div><div className="h-72 rounded-md bg-slate-100" /></div>;
}

function Workspace({ kind }: { kind: WorkspaceKind }) {
  const page = config[kind];
  const Icon = page.icon;
  const toast = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState(() => [...seedRows[kind]]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [pageNumber, setPageNumber] = useState(1);
  const [sortKey, setSortKey] = useState<keyof WorkspaceItem>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<WorkspaceItem | null>(null);
  const [viewItem, setViewItem] = useState<WorkspaceItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<WorkspaceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showError, setShowError] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(formSchema) });
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => (!term || `${row.name} ${row.secondary} ${row.detail}`.toLowerCase().includes(term)) && (category === 'all' || row.group === category) && (selectedStatus === 'all' || row.status === selectedStatus))
      .sort((a, b) => String(a[sortKey]).localeCompare(String(b[sortKey]), undefined, { numeric: true }) * (sortAsc ? 1 : -1));
  }, [category, rows, search, selectedStatus, sortAsc, sortKey]);
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const pageRows = visible.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 180);
    return () => window.clearTimeout(timer);
  }, []);

  const openCreate = () => {
    setEditItem(null);
    reset({ name: '', secondary: '', group: page.filters[1] ?? 'General', date: new Date().toISOString().slice(0, 10), value: 0, detail: '' });
    setModalOpen(true);
  };
  const openEdit = (row: WorkspaceItem) => {
    setEditItem(row);
    reset({ name: row.name, secondary: row.secondary, group: row.group, date: row.date, value: row.value, detail: row.detail });
    setModalOpen(true);
  };
  const saveRow = (values: FormValues) => {
    if (editItem) setRows((current) => current.map((item) => item.id === editItem.id ? { ...item, ...values } : item));
    else setRows((current) => [{ id: `${kind}-${Date.now()}`, ...values, status: kind === 'announcements' ? 'Published' : 'Active' }, ...current]);
    toast.success(editItem ? 'Changes saved' : `${page.noun} created`, `${values.name} is saved to local sample data.`);
    setModalOpen(false);
  };
  const retry = () => {
    setShowError(false);
    setLoading(true);
    window.setTimeout(() => setLoading(false), 260);
  };
  const setSort = (key: keyof WorkspaceItem) => {
    setSortAsc((current) => key === sortKey ? !current : true);
    setSortKey(key);
  };
  const exportRows = () => {
    const csv = [['Name', 'Details', 'Category', 'Status', 'Date', 'Value'], ...visible.map((row) => [row.name, row.detail, row.group, row.status, row.date, String(row.value)])]
      .map((cells) => cells.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = `${kind}-sample.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('CSV exported', `${visible.length} records downloaded.`);
  };

  return <div>
    <PageHeader title={page.title} description={page.description} icon={<Icon className="h-5 w-5" aria-hidden />} actions={<><Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={exportRows}>Export</Button><Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>{page.addLabel}</Button></>} />
    <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[
        { label: `Total ${page.noun}s`, value: rows.length, note: 'Current sample directory', icon: Users },
        { label: 'Active', value: rows.filter((row) => ['Active', 'Open', 'Published', 'Scheduled'].includes(row.status)).length, note: 'Currently in progress', icon: BadgeCheck },
        { label: 'Needs attention', value: rows.filter((row) => ['Review', 'Overdue', 'Draft', 'Partial'].includes(row.status)).length, note: 'Review and follow-up', icon: Activity },
        { label: kind === 'fees' ? 'Collection' : 'Program total', value: kind === 'fees' ? 'Rs 207k' : kind === 'teachers' ? '15' : '5', note: kind === 'fees' ? 'This academic session' : 'Gujranwala campus', icon: kind === 'fees' ? Banknote : BookOpen },
      ].map((stat) => <Card key={stat.label} className="p-4"><div className="flex items-start justify-between"><span className="text-xs font-medium text-slate-500">{stat.label}</span><stat.icon className="h-4 w-4 text-primary-600" aria-hidden /></div><p className="mt-2 text-2xl font-semibold text-slate-900">{stat.value}</p><p className="mt-1 text-xs text-slate-500">{stat.note}</p></Card>)}
    </div>
    {kind === 'fees' && <div className="mb-5 grid gap-4 xl:grid-cols-5"><Card className="p-5 xl:col-span-3"><CardHeader title="Fee collection" subtitle="Billed versus received across the current session." /><div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ month: 'Apr', billed: 188, collected: 172 }, { month: 'May', billed: 192, collected: 166 }, { month: 'Jun', billed: 205, collected: 181 }, { month: 'Jul', billed: 212, collected: 197 }, { month: 'Aug', billed: 218, collected: 204 }, { month: 'Sep', billed: 226, collected: 207 }]}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis unit="k" axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [`Rs ${value}k`]} /><Bar dataKey="billed" fill="#cbd5e1" radius={[3, 3, 0, 0]} /><Bar dataKey="collected" fill="#2563eb" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></Card><Card className="p-5 xl:col-span-2"><CardHeader title="Collection by category" /><div className="h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{ name: 'Tuition', value: 58 }, { name: 'Lab', value: 18 }, { name: 'Transport', value: 14 }, { name: 'Exam', value: 10 }]} dataKey="value" nameKey="name" innerRadius={55} outerRadius={84}>{['#2563eb', '#16a34a', '#f59e0b', '#64748b'].map((color) => <Cell key={color} fill={color} />)}</Pie><Tooltip formatter={(value) => [`${value}%`, 'Collected']} /></PieChart></ResponsiveContainer></div></Card></div>}
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 xl:flex-row xl:items-center">
        <div className="relative min-w-56 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden /><input value={search} onChange={(event) => { setSearch(event.target.value); setPageNumber(1); }} placeholder={`Search ${page.noun}s`} aria-label={`Search ${page.noun}s`} className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100" /></div>
        <div className="flex flex-wrap items-center gap-2"><Select aria-label={`Filter ${page.noun}s`} value={category} onChange={(event) => { setCategory(event.target.value); setPageNumber(1); }} options={[{ label: page.filters[0], value: 'all' }, ...page.filters.slice(1).map((item) => ({ label: item, value: item }))]} /><Select aria-label="Filter by status" value={selectedStatus} onChange={(event) => { setSelectedStatus(event.target.value); setPageNumber(1); }} options={[{ label: 'All statuses', value: 'all' }, ...[...new Set(rows.map((row) => row.status))].map((item) => ({ label: item, value: item }))]} /><span className="inline-flex items-center gap-1 text-xs text-slate-500"><Filter className="h-3.5 w-3.5" />{visible.length} results</span></div>
      </div>
      {loading ? <WorkspaceLoading /> : showError ? <div className="p-8"><EmptyState title={`Could not load ${page.title.toLowerCase()}`} description="The local sample workspace encountered an error." action={<Button variant="outline" onClick={retry}>Retry</Button>} /></div> : visible.length === 0 ? <div className="p-10"><EmptyState icon={<Icon className="h-6 w-6" />} title={`No ${page.noun}s found`} description="Change your filters or add a new record." action={<Button onClick={openCreate}>Add {page.noun}</Button>} /></div> : <>
        <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs"><tr><th className="px-4 py-3"><button onClick={() => setSort('name')} type="button" className="inline-flex items-center gap-1 font-semibold text-slate-600">Record {sortKey === 'name' ? sortAsc ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5" />}</button></th><th className="px-4 py-3">Category / group</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"><button onClick={() => setSort('date')} type="button" className="inline-flex items-center gap-1 font-semibold text-slate-600">Date <ArrowUpDown className="h-3.5 w-3.5" /></button></th><th className="px-4 py-3">{kind === 'fees' ? 'Amount' : 'Measure'}</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{pageRows.map((row) => <motion.tr layout key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-slate-50/70"><td className="px-4 py-3"><button type="button" onClick={() => kind === 'teachers' ? navigate(`/teachers/${row.id}`) : setViewItem(row)} className="text-left"><span className="block font-medium text-slate-800 hover:text-primary-700">{row.name}</span><span className="mt-0.5 block max-w-[28rem] truncate text-xs text-slate-500">{row.secondary}</span></button></td><td className="px-4 py-3 text-slate-600">{row.group}</td><td className="px-4 py-3"><StatusBadge tone={toneFor(row.status)}>{row.status}</StatusBadge></td><td className="px-4 py-3 text-slate-600">{row.date}</td><td className="px-4 py-3 font-medium text-slate-700">{kind === 'fees' ? `Rs ${numberText(row.value)}` : numberText(row.value)}</td><td className="px-4 py-3"><div className="flex justify-end gap-1"><IconButton size="sm" label={`View ${row.name}`} onClick={() => kind === 'teachers' ? navigate(`/teachers/${row.id}`) : setViewItem(row)}><MoreHorizontal className="h-4 w-4" /></IconButton><IconButton size="sm" label={`Edit ${row.name}`} onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></IconButton><IconButton size="sm" label={`Delete ${row.name}`} onClick={() => setDeleteItem(row)}><Trash2 className="h-4 w-4 text-rose-600" /></IconButton></div></td></motion.tr>)}</tbody></table></div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500"><span>Showing {(pageNumber - 1) * pageSize + 1}–{Math.min(pageNumber * pageSize, visible.length)} of {visible.length}</span><div className="flex items-center gap-2"><IconButton size="sm" variant="outline" label="Previous page" disabled={pageNumber <= 1} onClick={() => setPageNumber((value) => value - 1)}><ChevronLeft className="h-4 w-4" /></IconButton><span>{pageNumber} / {pageCount}</span><IconButton size="sm" variant="outline" label="Next page" disabled={pageNumber >= pageCount} onClick={() => setPageNumber((value) => value + 1)}><ChevronRight className="h-4 w-4" /></IconButton></div></div>
      </>}
    </Card>
    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? `Edit ${page.noun}` : page.addLabel} description="Changes are saved to the current local sample only." size="lg" footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(saveRow)}>{editItem ? 'Save changes' : 'Create record'}</Button></>}><form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(saveRow)} noValidate><Input label={kind === 'teachers' ? 'Teacher full name' : 'Name'} required error={errors.name?.message} {...register('name')} /><Input label={kind === 'teachers' ? 'Email / contact' : 'Short description'} required error={errors.secondary?.message} {...register('secondary')} /><Input label={kind === 'fees' ? 'Fee category' : 'Category / department'} required error={errors.group?.message} {...register('group')} /><Input label={kind === 'fees' ? 'Amount (PKR)' : 'Seats / credit hours / periods'} type="number" min="0" required error={errors.value?.message} {...register('value')} /><Input label="Date / due date" type="date" required error={errors.date?.message} {...register('date')} /><Textarea label="Details" required rows={3} containerClassName="sm:col-span-2" error={errors.detail?.message} {...register('detail')} /></form></Modal>
    <Modal open={Boolean(viewItem)} onClose={() => setViewItem(null)} title={viewItem?.name ?? 'Record details'} size="md" footer={<Button variant="outline" onClick={() => setViewItem(null)}>Close</Button>}><div className="space-y-4">{viewItem && <><StatusBadge tone={toneFor(viewItem.status)}>{viewItem.status}</StatusBadge><p className="text-sm leading-6 text-slate-600">{viewItem.secondary}</p><dl className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm"><div><dt className="text-xs text-slate-500">Category</dt><dd className="mt-1 font-medium">{viewItem.group}</dd></div><div><dt className="text-xs text-slate-500">Date</dt><dd className="mt-1 font-medium">{viewItem.date}</dd></div><div className="col-span-2"><dt className="text-xs text-slate-500">Details</dt><dd className="mt-1 font-medium">{viewItem.detail}</dd></div></dl></>}</div></Modal>
    <ConfirmDialog open={Boolean(deleteItem)} onClose={() => setDeleteItem(null)} title={`Delete ${page.noun}?`} description={`Remove ${deleteItem?.name ?? 'this record'} from local sample data?`} confirmLabel="Delete" onConfirm={() => { if (!deleteItem) return; setRows((current) => current.filter((row) => row.id !== deleteItem.id)); toast.success('Record removed', `${deleteItem.name} was deleted locally.`); setDeleteItem(null); }} />
  </div>;
}

export function TeachersPage() { return <Workspace kind="teachers" />; }
export function ProgramsPage() { return <Workspace kind="programs" />; }
export function ExamsPage() { return <Workspace kind="exams" />; }
export function AssignmentsPage() { return <Workspace kind="assignments" />; }

interface MockInvoice {
  id: string;
  invoiceNo: string;
  student: string;
  rollNo: string;
  className: string;
  title: string;
  amount: number;
  paid: number;
  due: string;
  status: 'Paid' | 'Partial' | 'Unpaid';
}

const initialInvoices: MockInvoice[] = admissionStudents.slice(0, 30).map((student, index) => {
  const amount = index % 3 === 0 ? 4500 : index % 3 === 1 ? 1800 : 2500;
  const paid = index % 5 === 0 ? amount : index % 4 === 0 ? Math.round(amount / 2) : 0;
  return {
    id: `invoice-${index + 1}`,
    invoiceNo: `GILT-25-${String(index + 1041).padStart(5, '0')}`,
    student: student.name,
    rollNo: student.rollNo,
    className: student.className,
    title: index % 3 === 0 ? 'Monthly tuition' : index % 3 === 1 ? 'Workshop & lab' : 'Student transport',
    amount,
    paid,
    due: index % 4 === 0 ? '2026-09-18' : '2026-10-05',
    status: paid >= amount ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid',
  };
});

const paymentSchema = z.object({
  amount: z.coerce.number().positive('Payment must be greater than zero'),
  method: z.enum(['Cash', 'Bank transfer', 'Card', 'Cheque']),
  reference: z.string().min(2, 'Enter the receipt or transaction reference'),
});
type PaymentValues = z.infer<typeof paymentSchema>;

export function FeesPage() {
  const toast = useToast();
  const location = useLocation();
  const [tab, setTab] = useState<'structures' | 'invoices' | 'payments' | 'defaulters'>(location.pathname.endsWith('/invoices') ? 'invoices' : 'structures');
  const [invoices, setInvoices] = useState(initialInvoices);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [paymentTarget, setPaymentTarget] = useState<MockInvoice | null>(null);
  const [structureOpen, setStructureOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PaymentValues>({ resolver: zodResolver(paymentSchema), defaultValues: { amount: 0, method: 'Cash', reference: '' } });
  const { register: registerStructure, handleSubmit: submitStructure, reset: resetStructure, formState: { errors: structureErrors } } = useForm<FormValues>({ resolver: zodResolver(formSchema) });
  const payments = invoices.filter((invoice) => invoice.paid > 0);
  const defaulters = invoices.filter((invoice) => invoice.status !== 'Paid' && invoice.due < new Date().toISOString().slice(0, 10));
  const shownSource = tab === 'defaulters' ? defaulters : invoices;
  const filteredInvoices = shownSource.filter((invoice) => {
    const term = search.toLowerCase();
    return (!term || `${invoice.invoiceNo} ${invoice.student} ${invoice.rollNo} ${invoice.className} ${invoice.title}`.toLowerCase().includes(term)) && (statusFilter === 'all' || invoice.status === statusFilter);
  });
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  const visibleInvoices = filteredInvoices.slice((page - 1) * pageSize, page * pageSize);
  const totalBilled = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const totalCollected = invoices.reduce((sum, invoice) => sum + invoice.paid, 0);
  const outstanding = totalBilled - totalCollected;

  const beginPayment = (invoice: MockInvoice) => {
    setPaymentTarget(invoice);
    reset({ amount: invoice.amount - invoice.paid, method: 'Cash', reference: '' });
  };
  const submitPayment = (values: PaymentValues) => {
    if (!paymentTarget) return;
    const amount = Math.min(values.amount, paymentTarget.amount - paymentTarget.paid);
    setInvoices((current) => current.map((invoice) => {
      if (invoice.id !== paymentTarget.id) return invoice;
      const paid = invoice.paid + amount;
      return { ...invoice, paid, status: paid >= invoice.amount ? 'Paid' : 'Partial' };
    }));
    toast.success('Payment recorded', `${paymentTarget.invoiceNo} · Rs ${numberText(amount)} · ${values.method}`);
    setPaymentTarget(null);
  };
  const openStructureForm = () => {
    resetStructure({ name: '', secondary: '', group: 'Tuition', date: '2026-10-05', value: 0, detail: '' });
    setStructureOpen(true);
  };
  const saveStructure = (values: FormValues) => {
    toast.success('Fee structure created', `${values.name} added to local billing data.`);
    setStructureOpen(false);
  };
  const downloadCsv = () => {
    const csv = [['Invoice', 'Student', 'Roll no', 'Fee head', 'Amount', 'Paid', 'Due', 'Status'], ...filteredInvoices.map((invoice) => [invoice.invoiceNo, invoice.student, invoice.rollNo, invoice.title, invoice.amount, invoice.paid, invoice.due, invoice.status])]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = 'gilt-invoices.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Invoice list exported', `${filteredInvoices.length} records downloaded.`);
  };

  return <div><PageHeader title="Fees & invoices" description="Manage fee schedules, record receipts and follow up outstanding balances." icon={<Wallet className="h-5 w-5" />} actions={<><Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={downloadCsv}>Export CSV</Button><Button leftIcon={<Plus className="h-4 w-4" />} onClick={openStructureForm}>Create structure</Button></>} />
    <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">{[['Billed this session', `Rs ${numberText(totalBilled)}`, 'Across active fee heads'], ['Collected', `Rs ${numberText(totalCollected)}`, `${Math.round(totalCollected / Math.max(totalBilled, 1) * 100)}% of billed amount`], ['Outstanding', `Rs ${numberText(outstanding)}`, `${invoices.filter((invoice) => invoice.status !== 'Paid').length} invoices open`], ['Defaulters', String(defaulters.length), 'Past due date · follow up']].map(([label, value, note]) => <Card key={label} className="p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></Card>)}</div>
    <Card className="mb-5 overflow-hidden"><CardHeader className="p-5" title="Collection progress" subtitle="Billed and received over the last six months." /><div className="h-56 px-3 pb-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ month: 'Apr', billed: 188, collected: 172 }, { month: 'May', billed: 192, collected: 166 }, { month: 'Jun', billed: 205, collected: 181 }, { month: 'Jul', billed: 212, collected: 197 }, { month: 'Aug', billed: 218, collected: 204 }, { month: 'Sep', billed: 226, collected: 207 }]}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis unit="k" axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [`Rs ${value}k`]} /><Bar dataKey="billed" fill="#cbd5e1" radius={[3, 3, 0, 0]} /><Bar dataKey="collected" fill="#2563eb" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
    <Card className="overflow-hidden"><div role="tablist" aria-label="Fee management views" className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3">{[['structures', 'Fee structures'], ['invoices', 'Invoices'], ['payments', 'Payment history'], ['defaulters', 'Defaulters']].map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} type="button" onClick={() => { setTab(id as typeof tab); setPage(1); }} className={cn('whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium', tab === id ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>{label}{id === 'defaulters' && <span className="ml-2 rounded-full bg-rose-50 px-1.5 py-0.5 text-xs text-rose-700">{defaulters.length}</span>}</button>)}</div>
      {tab === 'structures' ? <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs"><tr>{['Fee head', 'Program / class', 'Frequency', 'Amount', 'Next due', 'Status'].map((head) => <th key={head} className="px-4 py-3 font-semibold text-slate-500">{head}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{seedRows.fees.map((fee) => <tr key={fee.id}><td className="px-4 py-3 font-medium text-slate-800">{fee.name}</td><td className="px-4 py-3 text-slate-600">{fee.secondary}</td><td className="px-4 py-3 text-slate-600">Monthly</td><td className="px-4 py-3 font-medium">Rs {numberText(fee.value)}</td><td className="px-4 py-3 text-slate-600">{fee.date}</td><td className="px-4 py-3"><StatusBadge tone="success">Active</StatusBadge></td></tr>)}</tbody></table></div> : tab === 'payments' ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs"><tr>{['Receipt', 'Student', 'Invoice', 'Amount received', 'Payment method', 'Date'].map((head) => <th key={head} className="px-4 py-3 font-semibold text-slate-500">{head}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{payments.length === 0 ? <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">No payments recorded yet.</td></tr> : payments.slice(0, 12).map((invoice, index) => <tr key={invoice.id}><td className="px-4 py-3 font-mono text-xs">RCT-{String(index + 211).padStart(5, '0')}</td><td className="px-4 py-3 font-medium">{invoice.student}</td><td className="px-4 py-3">{invoice.invoiceNo}</td><td className="px-4 py-3">Rs {numberText(invoice.paid)}</td><td className="px-4 py-3">Bank transfer</td><td className="px-4 py-3">2026-09-{String(10 + index).padStart(2, '0')}</td></tr>)}</tbody></table></div> : <>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center"><div className="relative min-w-56 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search invoice, student or roll no." aria-label="Search invoices" className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100" /></div><Select aria-label="Filter invoice status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} options={[{ label: 'All statuses', value: 'all' }, ...['Paid', 'Partial', 'Unpaid'].map((item) => ({ label: item, value: item }))]} /><span className="text-xs text-slate-500">{filteredInvoices.length} invoices</span></div>
        {filteredInvoices.length === 0 ? <div className="p-8"><EmptyState title={tab === 'defaulters' ? 'No overdue invoices' : 'No invoices match'} description="Adjust the filters or search for another student." /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm"><thead className="bg-slate-50 text-xs"><tr>{['Invoice', 'Student', 'Class', 'Fee head', 'Amount', 'Paid', 'Due date', 'Status', ''].map((head) => <th key={head} className="px-3 py-3 font-semibold text-slate-500">{head}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visibleInvoices.map((invoice) => <tr key={invoice.id} className="hover:bg-slate-50/60"><td className="px-3 py-3 font-mono text-xs">{invoice.invoiceNo}</td><td className="px-3 py-3"><span className="font-medium text-slate-800">{invoice.student}</span><span className="mt-0.5 block text-xs text-slate-500">{invoice.rollNo}</span></td><td className="px-3 py-3 text-slate-600">{invoice.className}</td><td className="px-3 py-3 text-slate-600">{invoice.title}</td><td className="px-3 py-3">Rs {numberText(invoice.amount)}</td><td className="px-3 py-3">Rs {numberText(invoice.paid)}</td><td className="px-3 py-3 text-slate-600">{invoice.due}</td><td className="px-3 py-3"><StatusBadge tone={toneFor(invoice.status)}>{invoice.status}</StatusBadge></td><td className="px-3 py-3 text-right">{invoice.status !== 'Paid' && <Button size="sm" variant="outline" onClick={() => beginPayment(invoice)}>Record payment</Button>}</td></tr>)}</tbody></table></div>}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500"><span>Showing {filteredInvoices.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredInvoices.length)} of {filteredInvoices.length}</span><div className="flex items-center gap-2"><IconButton label="Previous page" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="h-4 w-4" /></IconButton>{page} / {pageCount}<IconButton label="Next page" size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}><ChevronRight className="h-4 w-4" /></IconButton></div></div>
      </>}
    </Card>
    <Modal open={Boolean(paymentTarget)} onClose={() => setPaymentTarget(null)} title="Record fee payment" description={paymentTarget ? `${paymentTarget.invoiceNo} · ${paymentTarget.student} · Balance Rs ${numberText(paymentTarget.amount - paymentTarget.paid)}` : undefined} size="sm" footer={<><Button variant="outline" onClick={() => setPaymentTarget(null)}>Cancel</Button><Button onClick={handleSubmit(submitPayment)}>Save payment</Button></>}><form className="space-y-4" onSubmit={handleSubmit(submitPayment)} noValidate><Input label="Amount received (PKR)" type="number" min="1" required error={errors.amount?.message} {...register('amount')} /><Select label="Payment method" options={['Cash', 'Bank transfer', 'Card', 'Cheque'].map((item) => ({ label: item, value: item }))} {...register('method')} /><Input label="Receipt / transaction reference" required error={errors.reference?.message} {...register('reference')} /></form></Modal>
    <Modal open={structureOpen} onClose={() => setStructureOpen(false)} title="Create fee structure" description="Add a fee head for an academic program." size="lg" footer={<><Button variant="outline" onClick={() => setStructureOpen(false)}>Cancel</Button><Button onClick={submitStructure(saveStructure)}>Save structure</Button></>}><form className="grid gap-4 sm:grid-cols-2" onSubmit={submitStructure(saveStructure)} noValidate><Input label="Fee head" required error={structureErrors.name?.message} {...registerStructure('name')} /><Input label="Program / class" required error={structureErrors.secondary?.message} {...registerStructure('secondary')} /><Select label="Category" options={['Tuition', 'Lab charges', 'Transport', 'Examination', 'Course materials'].map((item) => ({ label: item, value: item }))} {...registerStructure('group')} /><Input label="Amount (PKR)" type="number" min="0" required error={structureErrors.value?.message} {...registerStructure('value')} /><Input label="Due date" type="date" required error={structureErrors.date?.message} {...registerStructure('date')} /><Textarea label="Notes" required error={structureErrors.detail?.message} {...registerStructure('detail')} /></form></Modal>
  </div>;
}
export function AnnouncementsPage() { return <Workspace kind="announcements" />; }
export function InstitutionsPage() { return <Workspace kind="institutions" />; }

export function TeacherDetailPage() {
  const { teacherId } = useParams();
  const teacher = seedRows.teachers.find((item) => item.id === teacherId);
  const toast = useToast();
  const [tab, setTab] = useState('Overview');
  if (!teacher) return <EmptyState icon={<UserRoundCog className="h-6 w-6" />} title="Teacher not found" description="This profile is not in the local sample." action={<Link to="/teachers"><Button>Back to teachers</Button></Link>} />;
  return <div><PageHeader title={teacher.name} description={teacher.group} icon={<UserRoundCog className="h-5 w-5" />} crumbs={[{ label: 'Teachers', to: '/teachers' }, { label: teacher.name }]} actions={<Button onClick={() => toast.success('Profile updated', 'Local sample profile is ready for editing.')}>Edit profile</Button>} /><Card className="mb-5 p-5"><div className="flex items-center gap-4"><Avatar name={teacher.name} color="#2563eb" size="lg" /><div><h2 className="font-semibold text-slate-900">{teacher.name}</h2><p className="text-sm text-slate-500">{teacher.secondary}</p><p className="mt-1 text-xs text-slate-500">Technical Instructor · Joined Aug 2021</p></div><div className="ml-auto text-right"><p className="text-2xl font-semibold text-slate-900">{teacher.value}</p><p className="text-xs text-slate-500">weekly periods</p></div></div><div className="mt-5 flex gap-2 border-t pt-3">{['Overview', 'Classes', 'Subjects', 'Timetable'].map((item) => <button key={item} onClick={() => setTab(item)} type="button" className={cn('rounded-md px-3 py-2 text-sm', tab === item ? 'bg-primary-50 font-medium text-primary-700' : 'text-slate-500 hover:bg-slate-50')}>{item}</button>)}</div></Card><div className="grid gap-4 lg:grid-cols-3"><Card className="p-5 lg:col-span-2"><CardHeader title={`${tab} & workload`} subtitle="Weekly teaching periods by day." /><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ day: 'Mon', periods: 4 }, { day: 'Tue', periods: 5 }, { day: 'Wed', periods: 3 }, { day: 'Thu', periods: 4 }, { day: 'Fri', periods: 2 }, { day: 'Sat', periods: 1 }]}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="periods" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card><Card className="p-5"><CardHeader title="Assignment summary" /><div className="space-y-4 text-sm">{[['Assigned classes', '4'], ['Subjects', '3'], ['Weekly periods', String(teacher.value)], ['Average attendance', '94%']].map(([label, value]) => <div key={label} className="flex justify-between"><span className="text-slate-500">{label}</span><strong>{value}</strong></div>)}</div></Card></div></div>;
}

export function ReportsPage() {
  const toast = useToast();
  const [range, setRange] = useState('Current session');
  const [report, setReport] = useState('Academic performance');
  const data = [{ month: 'Apr', attendance: 91, marks: 72, fees: 76 }, { month: 'May', attendance: 93, marks: 75, fees: 79 }, { month: 'Jun', attendance: 89, marks: 74, fees: 82 }, { month: 'Jul', attendance: 95, marks: 78, fees: 86 }, { month: 'Aug', attendance: 94, marks: 81, fees: 89 }, { month: 'Sep', attendance: 96, marks: 83, fees: 92 }];
  return <div><PageHeader title="Reports & analytics" description="Review academic outcomes, attendance and fee collection by program and period." icon={<FileBarChart2 className="h-5 w-5" />} actions={<div className="flex gap-2"><Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={() => toast.success('PDF exported', `${report} · ${range}`)}>PDF</Button><Button variant="outline" leftIcon={<FileSpreadsheet className="h-4 w-4" />} onClick={() => toast.success('Spreadsheet exported', `${report} · ${range}`)}>Excel</Button><Button variant="outline" onClick={() => toast.success('CSV exported', 'Report rows downloaded.')}>CSV</Button></div>} /><Card className="mb-5"><div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"><Select label="Report" value={report} onChange={(event) => setReport(event.target.value)} options={['Academic performance', 'Attendance overview', 'Fee collection'].map((item) => ({ label: item, value: item }))} /><Select label="Date range" value={range} onChange={(event) => setRange(event.target.value)} options={['Current session', 'Last 30 days', 'Last 90 days', 'Custom range'].map((item) => ({ label: item, value: item }))} /><Select label="Program" options={[{ label: 'All programs', value: 'all' }, ...admissionPrograms.map((item) => ({ label: item, value: item }))]} /><Select label="Class" options={[{ label: 'All classes', value: 'all' }, ...['CIT Year 1', 'Footwear Year 2', 'Leather Year 3'].map((item) => ({ label: item, value: item }))]} /></div></Card><div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">{[['Attendance rate', '93.8%', '+2.4%'], ['Average marks', '78.4%', '+3.1%'], ['Fee collection', '86.2%', '+5.8%'], ['At-risk students', '18', '−4 this month']].map(([label, value, trend]) => <Card key={label} className="p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p><p className="mt-1 text-xs text-emerald-700">{trend} vs previous period</p></Card>)}</div><div className="grid gap-4 xl:grid-cols-5"><Card className="p-5 xl:col-span-3"><CardHeader title={report} subtitle={`${range} · Gujranwala campus`} /><div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><defs><linearGradient id="reportGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.18} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis unit="%" axisLine={false} tickLine={false} /><Tooltip formatter={(value, name) => [`${value}%`, String(name)]} /><Area dataKey={report === 'Attendance overview' ? 'attendance' : report === 'Fee collection' ? 'fees' : 'marks'} stroke="#2563eb" fill="url(#reportGradient)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></Card><Card className="p-5 xl:col-span-2"><CardHeader title="Program comparison" subtitle="Average assessment score by program." /><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ program: 'CIT', score: 81 }, { program: 'Footwear', score: 78 }, { program: 'Leather', score: 76 }, { program: 'Analytics', score: 86 }, { program: 'Clinical', score: 83 }]}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="program" axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} unit="%" axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [`${value}%`, 'Average']} /><Bar dataKey="score" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card></div></div>;
}

export function MarksPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'gradebook' | 'results'>('gradebook');
  const [assessment, setAssessment] = useState('Mid-term');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const scoreRows = admissionStudents.slice(0, 18).map((student, index) => ({
    ...student,
    score: 58 + (index * 7) % 41,
    grade: ['A', 'B+', 'B', 'A-', 'C+'][index % 5],
    gpa: (2.4 + (index % 16) / 10).toFixed(2),
  }));
  const filtered = scoreRows.filter((student) => `${student.name} ${student.rollNo} ${student.className}`.toLowerCase().includes(search.toLowerCase()));
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  return <div><PageHeader title="Marks & results" description="Enter assessment marks, review GPA and publish student result cards." icon={<FileBarChart2 className="h-5 w-5" />} actions={<><Select aria-label="Select class" options={[{ label: 'DAE CIT · Year 1 · Section A', value: 'cit-y1' }, { label: 'DAE Footwear · Year 2 · Section A', value: 'ft-y2' }, { label: 'DAE Leather · Year 3 · Section B', value: 'lt-y3' }]} /><Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => toast.success('Mark entry opened', 'Choose a student and enter the score in the gradebook.')}>Enter marks</Button></>} />
    <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">{[['Class average', '78.4%', '+3.2% from last assessment'], ['Students assessed', '38 / 40', '2 not yet submitted'], ['Class GPA', '3.18', '4.00 scale'], ['At risk', '4 students', 'Below 50% overall']].map(([label, value, note]) => <Card key={label} className="p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></Card>)}</div>
    <Card className="mb-5 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-1 rounded-md bg-slate-100 p-1">{(['gradebook', 'results'] as const).map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={cn('rounded px-3 py-2 text-sm font-medium capitalize', activeTab === tab ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500')}>{tab === 'gradebook' ? 'Gradebook' : 'Published results'}</button>)}</div><Select aria-label="Choose assessment type" value={assessment} onChange={(event) => setAssessment(event.target.value)} options={['Sessional', 'Mid-term', 'Final'].map((item) => ({ label: item, value: item }))} /></div></Card>
    <div className="grid gap-4 xl:grid-cols-5"><Card className="overflow-hidden xl:col-span-3"><CardHeader className="p-5" title={activeTab === 'gradebook' ? `${assessment} gradebook` : 'Student result cards'} subtitle="DAE CIT · Year 1 · Computer Programming" action={<Button size="sm" variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={() => toast.success('Results exported', 'Class results CSV is ready.')}>Export</Button>} /><div className="border-y border-slate-200 p-3"><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name or roll number" aria-label="Search students in gradebook" className="h-9 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100" /></div></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs"><tr>{['Student', assessment, 'Total', 'Grade', 'GPA', 'Result card'].map((head) => <th key={head} className="px-4 py-3 font-semibold text-slate-500">{head}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((student) => <tr key={student.id} className="hover:bg-slate-50/60"><td className="px-4 py-3"><span className="font-medium text-slate-800">{student.name}</span><span className="mt-0.5 block text-xs text-slate-500">{student.rollNo}</span></td><td className="px-4 py-3"><input aria-label={`${student.name} ${assessment} score`} type="number" min="0" max="100" defaultValue={student.score} className="h-8 w-20 rounded-md border border-slate-300 px-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100" /></td><td className="px-4 py-3">{student.score}/100</td><td className="px-4 py-3"><StatusBadge tone={student.grade.startsWith('A') ? 'success' : 'primary'}>{student.grade}</StatusBadge></td><td className="px-4 py-3">{student.gpa}</td><td className="px-4 py-3"><IconButton size="sm" label={`Download result card for ${student.name}`} onClick={() => toast.success('Result card prepared', `${student.name} · ${student.gpa} GPA`)}><Download className="h-4 w-4" /></IconButton></td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t px-4 py-3 text-xs text-slate-500"><span>{filtered.length} students</span><div className="flex items-center gap-2"><IconButton label="Previous page" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="h-4 w-4" /></IconButton>{page} / {pageCount}<IconButton label="Next page" variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}><ChevronRight className="h-4 w-4" /></IconButton></div></div></Card>
      <Card className="p-5 xl:col-span-2"><CardHeader title="Subject performance" subtitle="Average score by subject · interactive chart." /><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ subject: 'Programming', score: 82 }, { subject: 'Maths', score: 74 }, { subject: 'Networking', score: 79 }, { subject: 'English', score: 86 }, { subject: 'Physics', score: 71 }]}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="subject" axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} unit="%" axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [`${value}%`, 'Class average']} /><Bar dataKey="score" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div><Button className="mt-3" fullWidth leftIcon={<Check className="h-4 w-4" />} onClick={() => toast.success('Results published', `${assessment} marks are now visible in student portals.`)}>Publish {assessment.toLowerCase()} results</Button></Card></div>
  </div>;
}

const featureGroups = [
  { label: 'Academic operations', keys: [['Attendance', 'Attendance records and monthly summaries'], ['Timetable', 'Period planning and teacher allocations'], ['Marks & results', 'Gradebook and result cards'], ['Exams', 'Exam scheduling and seating plans']] },
  { label: 'Student services', keys: [['Assignments', 'Coursework, submissions and rubrics'], ['Quizzes', 'Online tests and marking'], ['Announcements', 'Notices and audience targeting'], ['Library', 'Circulation and catalogue access']] },
  { label: 'Campus & finance', keys: [['Fees', 'Fee structures, invoices and receipts'], ['Transport', 'Routes, stops and vehicle registers'], ['Hostel', 'Rooms and resident records'], ['Chat', 'Direct messages and notifications']] },
  { label: 'Insights', keys: [['Analytics', 'Role-based dashboards and metrics'], ['Reports', 'PDF, Excel and CSV exports']] },
];
const featureAccessKeys: Record<string, InstitutionFeature> = {
  Attendance: 'attendance',
  Timetable: 'timetable',
  'Marks & results': 'marks',
  Exams: 'exams',
  Assignments: 'assignments',
  Quizzes: 'quizzes',
  Announcements: 'announcements',
  Library: 'library',
  Fees: 'fees',
  Transport: 'transport',
  Hostel: 'hostel',
  Chat: 'chat',
  Analytics: 'analytics',
  Reports: 'reports',
};
const roleNames = ['Super Admin', 'Admin', 'Principal', 'Teacher Incharge', 'Teacher', 'Student', 'Parent'];
const roleModules = ['Dashboard', 'Students', 'Programs', 'Classes', 'Attendance', 'Marks', 'Assignments', 'Fees', 'Announcements', 'Reports'];
const actionNames = ['View', 'Create', 'Edit', 'Delete', 'Export'];

export function FeaturesAdminPage() {
  const toast = useToast();
  const [institution, setInstitution] = useState('GILT Gujranwala');
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => Object.fromEntries(
    Object.entries(featureAccessKeys).map(([label, feature]) => [label, getInstitutionFeatures()[feature]]),
  ));
  const toggle = (key: string) => {
    const nextValue = !enabled[key];
    setEnabled((current) => ({ ...current, [key]: nextValue }));
    setInstitutionFeature(featureAccessKeys[key], nextValue);
    toast.success('Module access updated', `${key} ${nextValue ? 'enabled' : 'disabled'} for ${institution}.`);
  };
  return <div><PageHeader title="Feature access" description="Switch modules on or off for each institution. Disabled modules disappear from role navigation." icon={<Settings2 className="h-5 w-5" />} actions={<Select aria-label="Choose institution" value={institution} onChange={(event) => setInstitution(event.target.value)} options={[{ label: 'GILT Gujranwala', value: 'GILT Gujranwala' }, { label: 'Demo Public School', value: 'Demo Public School' }]} />} />{featureGroups.map((group) => <Card key={group.label} className="mb-4 overflow-hidden"><CardHeader title={group.label} subtitle={`${group.keys.filter(([key]) => enabled[key]).length} of ${group.keys.length} modules enabled`} /><div className="divide-y divide-slate-100">{group.keys.map(([key, description]) => <div key={key} className="flex items-center gap-4 px-5 py-4"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-50 text-slate-500"><Settings2 className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-800">{key}</span><span className="mt-0.5 block text-xs text-slate-500">{description}</span></span><button type="button" role="switch" aria-checked={Boolean(enabled[key])} aria-label={`${key} module`} onClick={() => toggle(key)} className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2', enabled[key] ? 'bg-primary-600' : 'bg-slate-300')}><span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', enabled[key] ? 'translate-x-5' : 'translate-x-0.5')} /></button></div>)}</div></Card>)}</div>;
}

export function RolesAdminPage() {
  const toast = useToast();
  const [matrix, setMatrix] = useState(() => Object.fromEntries(roleNames.map((role, roleIndex) => [role, Object.fromEntries(roleModules.map((module, moduleIndex) => [module, actionNames.map((_, actionIndex) => roleIndex === 0 || roleIndex < 3 && moduleIndex < 8 && actionIndex < 3 || roleIndex === 4 && moduleIndex >= 3 && moduleIndex < 7 && actionIndex < 2 || roleIndex > 4 && [0, 3, 5, 6, 8].includes(moduleIndex) && actionIndex === 0)]))])));
  const change = (role: string, module: string, actionIndex: number) => setMatrix((current) => {
    const roleRules = current[role] as Record<string, boolean[]>;
    const permissions = [...roleRules[module]];
    permissions[actionIndex] = !permissions[actionIndex];
    return { ...current, [role]: { ...roleRules, [module]: permissions } };
  });
  return <div><PageHeader title="Role & permission matrix" description="Review module actions by role. Changes apply to this browser preview only." icon={<ShieldCheck className="h-5 w-5" />} actions={<Button leftIcon={<Check className="h-4 w-4" />} onClick={() => toast.success('Permission matrix saved', 'Local role preview updated.')}>Save matrix</Button>} /><Card className="overflow-hidden"><div className="overflow-x-auto"><table className="min-w-[1180px] text-left text-xs"><thead className="bg-slate-50"><tr><th className="sticky left-0 z-10 bg-slate-50 px-4 py-3">Role / module</th>{roleModules.map((module) => <th key={module} colSpan={actionNames.length} className="border-l border-slate-200 px-2 py-3 text-center font-semibold">{module}</th>)}</tr><tr><th className="sticky left-0 z-10 bg-slate-50 px-4 py-2">Access</th>{roleModules.flatMap((module) => actionNames.map((action) => <th key={`${module}-${action}`} className="border-l border-slate-100 px-2 py-2 text-center font-normal text-slate-500">{action}</th>))}</tr></thead><tbody className="divide-y divide-slate-100">{roleNames.map((role) => <tr key={role}><th className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-slate-800">{role}</th>{roleModules.flatMap((module) => ((matrix[role] as Record<string, boolean[]>)[module]).map((checked, actionIndex) => <td key={`${role}-${module}-${actionIndex}`} className="border-l border-slate-100 px-2 py-2 text-center"><input type="checkbox" checked={checked} onChange={() => change(role, module, actionIndex)} aria-label={`${role} ${actionNames[actionIndex]} ${module}`} className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" /></td>))}</tr>)}</tbody></table></div><p className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">Role permissions are editable in this mock preview. Super Admin permissions are shown as unrestricted.</p></Card></div>;
}

export function AuditAdminPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const events = [
    ['Feature toggled', 'Attendance enabled for GILT Gujranwala', 'Muhammad Irfan Butt', 'Today · 09:42'],
    ['Student admitted', 'TEVTA-GRW-2025-0040 · Rabia Sultana', 'Ayesha Siddiqui', 'Today · 09:16'],
    ['Result published', 'DAE CIT Year 1 · Mid-term results', 'Dr. Tariq Javed', 'Yesterday · 15:08'],
    ['Fee payment recorded', 'INV-2025-1048 · Rs 4,500', 'Ayesha Siddiqui', 'Yesterday · 13:51'],
    ['Announcement published', 'Workshop safety orientation', 'Rana Muhammad Aslam', '23 Sep · 11:24'],
    ['Teacher assignment updated', 'DAE Footwear Year 2 · P3', 'Sadia Naz', '22 Sep · 16:30'],
    ['Institution profile edited', 'GILT Gujranwala academic year', 'Muhammad Irfan Butt', '21 Sep · 10:12'],
  ];
  const visible = events.filter((event) => event.join(' ').toLowerCase().includes(search.toLowerCase()));
  const pages = Math.max(1, Math.ceil(visible.length / 5));
  return <div><PageHeader title="Audit log" description="A chronological record of important account and academic actions." icon={<ClipboardList className="h-5 w-5" />} actions={<Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={() => window.print()}>Export log</Button>} /><Card className="overflow-hidden"><div className="border-b border-slate-200 p-4"><div className="relative max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search actions, names or records" aria-label="Search audit log" className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100" /></div></div>{visible.length === 0 ? <div className="p-8"><EmptyState title="No matching audit events" description="Try a different search term." /></div> : <div className="divide-y divide-slate-100">{visible.slice((page - 1) * 5, page * 5).map(([action, detail, actor, time]) => <div key={`${action}-${time}`} className="flex gap-3 px-5 py-4"><span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-primary-50 text-primary-700"><Activity className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-800">{action}</p><p className="mt-0.5 text-sm text-slate-600">{detail}</p><p className="mt-1 text-xs text-slate-500">{actor}</p></div><time className="shrink-0 text-xs text-slate-400">{time}</time></div>)}</div>}<div className="flex justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500"><span>{visible.length} matching events</span><div className="flex items-center gap-2"><IconButton label="Previous page" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="h-4 w-4" /></IconButton>{page} / {pages}<IconButton label="Next page" size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}><ChevronRight className="h-4 w-4" /></IconButton></div></div></Card></div>;
}

export function AdminAnalyticsPage() {
  const data = [{ month: 'Apr', institutions: 1, users: 72 }, { month: 'May', institutions: 1, users: 84 }, { month: 'Jun', institutions: 1, users: 96 }, { month: 'Jul', institutions: 1, users: 108 }, { month: 'Aug', institutions: 1, users: 121 }, { month: 'Sep', institutions: 1, users: 132 }];
  return <div><PageHeader title="Global analytics" description="Platform-wide adoption and institution activity." icon={<FileBarChart2 className="h-5 w-5" />} /><div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">{[['Institutions', '1', '1 college'], ['Users', '132', 'Across all roles'], ['Active sessions', '28', 'Last 15 minutes'], ['Enabled modules', '11 / 13', 'GILT Gujranwala']].map(([label, value, note]) => <Card key={label} className="p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></Card>)}</div><div className="grid gap-4 xl:grid-cols-5"><Card className="p-5 xl:col-span-3"><CardHeader title="Platform growth" subtitle="Institution users by month." /><div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><defs><linearGradient id="platformGrowth" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Area dataKey="users" stroke="#2563eb" fill="url(#platformGrowth)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></Card><Card className="p-5 xl:col-span-2"><CardHeader title="Accounts by role" /><div className="space-y-4">{[['Students', 40], ['Teachers', 16], ['Parents', 6], ['Administrators', 3]].map(([label, value]) => <div key={label}><div className="mb-1 flex justify-between text-sm"><span className="text-slate-600">{label}</span><span className="font-medium">{value}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-primary-600" style={{ width: `${Number(value) / 45 * 100}%` }} /></div></div>)}</div></Card></div></div>;
}
