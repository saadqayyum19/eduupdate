import { useMemo, useState } from 'react';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Download,
  FileBarChart2,
  Plus,
  Save,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { usePermissions } from '@/hooks/usePermissions';
import {
  reportCardPdfUrl,
  useClasses,
  useDeleteMark,
  useMarks,
  useRanking,
  useReportCard,
  useSaveMarks,
  useSubjects,
  useUsers,
} from '@/services/api';
import type { ExamType } from '@/types';

const PAGE_SIZE = 10;

const EXAM_TYPE_OPTIONS: Array<{ label: string; value: ExamType }> = [
  { label: 'Quiz', value: 'quiz' },
  { label: 'Mid-term Exam', value: 'midterm' },
  { label: 'Final Exam', value: 'final' },
  { label: 'Assignment', value: 'assignment' },
];

export default function MarksPage() {
  const toast = useToast();
  const { can } = usePermissions();
  const canEnter = can('marks.enter');

  const [activeTab, setActiveTab] = useState<'gradebook' | 'ranking' | 'entry'>('gradebook');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedExamType, setSelectedExamType] = useState<ExamType>('midterm');
  const [assessmentTitle, setAssessmentTitle] = useState('Mid-Term Assessment');
  const [assessmentTotal, setAssessmentTotal] = useState(100);
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().slice(0, 10));

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewStudentId, setViewStudentId] = useState<string | null>(null);

  // Queries
  const { data: classes = [], isLoading: classesLoading } = useClasses();
  const activeClass = classes.find((c) => c.id === selectedClassId) ?? classes[0];
  const effectiveClassId = selectedClassId || activeClass?.id || '';

  const { data: subjects = [] } = useSubjects(effectiveClassId ? { classId: effectiveClassId } : undefined);
  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) ?? subjects[0];
  const effectiveSubjectId = selectedSubjectId || activeSubject?.id || '';

  const { data: allMarks = [], isLoading: marksLoading } = useMarks({
    classId: effectiveClassId || undefined,
    subjectId: effectiveSubjectId || undefined,
  // Filtered marks for the gradebook view
  const filteredMarks = useMemo(() => {
    const term = search.toLowerCase().trim();
    return allMarks.filter((m) => {
      const student = classStudents.find((s) => s.id === m.studentId);
      const studentName = student?.name?.toLowerCase() ?? '';
      const roll = student?.rollNo?.toLowerCase() ?? '';
      const title = m.title?.toLowerCase() ?? '';
      return !term || studentName.includes(term) || roll.includes(term) || title.includes(term);
    });
  }, [allMarks, classStudents, search]);

  const pageCount = Math.max(1, Math.ceil(filteredMarks.length / PAGE_SIZE));
  const pagedMarks = filteredMarks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Quick statistics
  const stats = useMemo(() => {
    if (!allMarks.length) {
      return { avg: 0, count: 0, highest: 0 };
    }
    const percentages = allMarks.map((m) => (m.total ? (m.score / m.total) * 100 : 0));
    const avg = Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length);
    const highest = Math.round(Math.max(...percentages));
    return { avg, count: allMarks.length, highest };
  }, [allMarks]);

  const handleSaveBatchEntry = async () => {
    if (!effectiveClassId || !effectiveSubjectId) {
      toast.error('Missing configuration', 'Please select both a class and a subject.');
      return;
    }
    const inputs = classStudents.map((student) => ({
      studentId: student.id,
      classId: effectiveClassId,
      subjectId: effectiveSubjectId,
      examType: selectedExamType,
      title: assessmentTitle,
      score: entryScores[student.id] ?? 0,
      total: assessmentTotal,
      date: assessmentDate,
    }));

    try {
      await saveMarksMutation.mutateAsync(inputs);
      toast.success('Marks recorded', `Saved results for ${inputs.length} students.`);
      setActiveTab('gradebook');
    } catch {
      toast.error('Failed to save marks', 'Please check that all scores are valid numbers.');
    }
  };

  return (
    <div>
      <PageHeader
        title="Marks & Results"
        description="Record assessment marks, view class rankings, and download official student report cards."
        icon={<FileBarChart2 className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Filter Class"
              value={effectiveClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setPage(1);
              }}
              options={classes.map((c) => ({ label: `${c.name} (${c.section})`, value: c.id }))}
            />
            {canEnter && (
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  const initial: Record<string, number> = {};
                  classStudents.forEach((s) => {
                    initial[s.id] = 0;
                  });
                  setEntryScores(initial);
                  setActiveTab('entry');
                }}
              >
                Enter batch marks
              </Button>
            )}
          </div>
        }
      />

      {/* Top statistics cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500">Average score</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.avg}%</p>
          <p className="mt-1 text-xs text-slate-500">Across {stats.count} recorded entries</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Highest score</p>
      {/* Navigation tabs */}
      <Card className="mb-5 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-md bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('gradebook')}
              className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                activeTab === 'gradebook' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gradebook
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ranking')}
              className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                activeTab === 'ranking' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Class Ranking
            </button>
            {canEnter && (
              <button
                type="button"
                onClick={() => setActiveTab('entry')}
                className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                  activeTab === 'entry' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mark Sheet Entry
              </button>
            )}
          </div>

          {activeTab === 'gradebook' && (
            <div className="flex items-center gap-2">
              <Select
                aria-label="Filter Subject"
                value={effectiveSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                options={subjects.map((s) => ({ label: s.name, value: s.id }))}
              />
      {/* Gradebook Tab */}
      {activeTab === 'gradebook' && (
        <Card>
          <CardHeader
            title="Recorded marks"
            subtitle={`${activeClass?.name ?? 'Class'} · ${activeSubject?.name ?? 'All subjects'}`}
            action={
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search student or assessment..."
                  className="h-9 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            }
          />

          {marksLoading || classesLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading gradebook records...</div>
          ) : pagedMarks.length === 0 ? (
            <EmptyState
              icon={<Award className="h-8 w-8 text-slate-400" />}
              title="No mark entries found"
              description="No marks recorded for this combination. Use 'Enter batch marks' to begin grading."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Assessment</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Percentage</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedMarks.map((m) => {
                    const student = classStudents.find((s) => s.id === m.studentId);
                    const pct = m.total ? Math.round((m.score / m.total) * 100) : 0;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {student?.name ?? 'Unknown Student'}
                          <span className="block text-xs font-normal text-slate-500">{student?.rollNo}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{m.title}</td>
                        <td className="px-4 py-3">
                          <Badge tone="neutral">{m.examType}</Badge>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {m.score} / {m.total}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${pct >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {pct}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{m.date}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <IconButton
                              size="sm"
                              label="View result card"
                              onClick={() => setViewStudentId(m.studentId)}
                            >
                              <Award className="h-4 w-4" />
                            </IconButton>
                            {canEnter && (
                              <IconButton
                                size="sm"
                                label="Delete entry"
                                onClick={async () => {
                                  if (confirm('Delete this mark entry?')) {
                                    await deleteMarkMutation.mutateAsync(m.id);
                                    toast.success('Mark deleted');
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-rose-500" />
                              </IconButton>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

            </div>
          )}
        </div>
      </Card>

          <p className="mt-2 text-2xl font-semibold text-emerald-600">{stats.highest}%</p>
          <p className="mt-1 text-xs text-slate-500">Peak performance</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Enrolled students</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{classStudents.length}</p>
      {/* Class Ranking Tab */}
      {activeTab === 'ranking' && (
        <Card>
          <CardHeader
            title="Class Academic Ranking"
            subtitle={`Overall position based on aggregate marks · ${activeClass?.name ?? 'Class'}`}
          />
          {rankingLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Calculating rank table...</div>
          ) : ranking.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8 text-slate-400" />}
              title="No ranking data available"
              description="No marks have been recorded for students in this class yet."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Roll No</th>
                    <th className="px-4 py-3">Obtained / Total</th>
                    <th className="px-4 py-3">Aggregate</th>
                    <th className="px-4 py-3">Grade</th>
                    <th className="px-4 py-3 text-right">Report Card</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ranking.map((row) => (
                    <tr key={row.studentId} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            row.position === 1
                              ? 'bg-amber-100 text-amber-800'
                              : row.position === 2
                              ? 'bg-slate-200 text-slate-700'
                              : row.position === 3
                              ? 'bg-amber-700/20 text-amber-900'
                              : 'text-slate-600'
                          }`}
                        >
                          {row.position}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{row.rollNo || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.obtained} / {row.total}
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary-600">{row.percentage}%</td>
                      <td className="px-4 py-3">
                        <Badge tone="primary">{row.grade}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <IconButton
                          size="sm"
                          label="View report card"
                          onClick={() => setViewStudentId(row.studentId)}
                        >
                          <Award className="h-4 w-4" />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

          <p className="mt-1 text-xs text-slate-500">In current selected class</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Subjects offered</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{subjects.length}</p>
          <p className="mt-1 text-xs text-slate-500">Assigned curriculum units</p>
        </Card>
      </div>

  });

  const { data: classStudents = [] } = useUsers(
    effectiveClassId ? { role: 'student', classId: effectiveClassId } : { role: 'student' },
  );

  const { data: ranking = [], isLoading: rankingLoading } = useRanking(effectiveClassId || undefined);
  const { data: reportCard, isLoading: reportLoading } = useReportCard(viewStudentId ?? undefined);

  // Mutations
  const saveMarksMutation = useSaveMarks();
  const deleteMarkMutation = useDeleteMark();

  // Local state for batch mark entry
  const [entryScores, setEntryScores] = useState<Record<string, number>>({});
