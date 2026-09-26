import { useMemo, useState } from 'react';
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  Lock,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  Users,
} from 'lucide-react';
import type { Quiz, QuizStatus, QuizSubmission } from '@/types';
import {
  useClasses,
  useCreateQuiz,
  useDeleteQuiz,
  useMarkSubmission,
  useMySubmissions,
  useQuizzes,
  useSubmissions,
  useSubjects,
  useSubmitAttempt,
  useUpdateQuiz,
  useUsers,
} from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { classLabel, subjectName, userName } from '@/lib/lookups';
import { cn, formatDate, today } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';

export default function QuizzesPage({ autoCreate = false }: { autoCreate?: boolean }) {
  const { can, user } = usePermissions();
  const toast = useToast();

  const canManage = can('quizzes.manage');
  const canMark = can('quizzes.mark');

  const { data: quizzes = [], isLoading: quizzesLoading, isError: quizzesError, refetch } = useQuizzes();
  const { data: classes = [] } = useClasses();
  const { data: subjects = [] } = useSubjects();
  const { data: allUsers = [] } = useUsers();
  const { data: mySubmissions = [] } = useMySubmissions(user?.role === 'student' ? user?.id : undefined);

  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'closed' | 'my-submissions'>('all');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(autoCreate);
  const [activeQuizForAttempt, setActiveQuizForAttempt] = useState<Quiz | null>(null);
  const [activeQuizForSubmissions, setActiveQuizForSubmissions] = useState<Quiz | null>(null);
  const [quizPendingDelete, setQuizPendingDelete] = useState<Quiz | null>(null);

  // Role-scoped list — every role only sees quizzes it is allowed to know about.
  const scopedQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      // Student view: restrict to student's class
      if (user?.role === 'student' && user.classId && q.classId !== user.classId) {
        return false;
      }
      // Parent view: restrict to child's classes
      if (user?.role === 'parent' && user.childIds?.length) {
        const childClasses = allUsers
          .filter((u) => user.childIds?.includes(u.id))
          .map((c) => c.classId)
          .filter(Boolean);
        if (!childClasses.includes(q.classId)) return false;
      }
      // Teacher view: only their own quizzes or quizzes for classes they teach
      if (user?.role === 'teacher' || user?.role === 'teacher_incharge') {
        const teachesClass = (user.classIds ?? []).includes(q.classId);
        if (q.teacherId !== user.id && !teachesClass) return false;
      }
      return true;
    });
  }, [quizzes, user, allUsers]);

  // Tab + class + search filters layered on top of the role-scoped list.
  const filteredQuizzes = useMemo(() => {
    return scopedQuizzes.filter((q) => {
      // Status tab filter
      if (activeTab === 'published' && q.status !== 'published') return false;
      if (activeTab === 'closed' && q.status !== 'closed') return false;
      // Class filter
      if (selectedClassFilter !== 'all' && q.classId !== selectedClassFilter) return false;
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = q.title.toLowerCase().includes(query);
        const sub = subjectName(subjects, q.subjectId).toLowerCase();
        if (!matchesTitle && !sub.includes(query)) return false;
      }
      return true;
    });
  }, [scopedQuizzes, activeTab, selectedClassFilter, searchQuery, subjects]);

  const deleteQuizMutation = useDeleteQuiz();
  const updateQuizMutation = useUpdateQuiz();

  const handleDeleteQuiz = async (quiz: Quiz) => {
    try {
      await deleteQuizMutation.mutateAsync(quiz.id);
      toast.success('Quiz deleted', `${quiz.title} has been removed.`);
    } catch (err) {
      toast.error('Could not delete quiz', err instanceof Error ? err.message : undefined);
    } finally {
      setQuizPendingDelete(null);
    }
  };

  /** Publish / close / reopen a quiz — makes the "Closed" state reachable from the UI. */
  const handleSetStatus = async (quiz: Quiz, status: QuizStatus) => {
    try {
      await updateQuizMutation.mutateAsync({ id: quiz.id, input: { status } });
      toast.success(
        status === 'closed' ? 'Quiz closed' : status === 'published' ? 'Quiz published' : 'Quiz reopened',
        `${quiz.title} is now ${status}.`,
      );
    } catch (err) {
      toast.error('Could not update quiz', err instanceof Error ? err.message : undefined);
    }
  };

  // Stats use the role-scoped list (not tab/search-filtered) so the counters never
  // reveal totals from classes the signed-in user cannot see.
  const stats = useMemo(() => {
    const published = scopedQuizzes.filter((q) => q.status === 'published').length;
    const closed = scopedQuizzes.filter((q) => q.status === 'closed').length;
    return {
      total: scopedQuizzes.length,
      published,
      closed,
      myAttempts: mySubmissions.length,
    };
  }, [scopedQuizzes, mySubmissions]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quizzes & Tests"
        description="Create classroom quizzes, complete student online tests, and evaluate submissions."
        icon={<FileSpreadsheet className="h-5 w-5" aria-hidden />}
        actions={
          canManage && (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateModalOpen(true)}>
              Create Quiz
            </Button>
          )
        }
      />

      {quizzesError ? (
        <ErrorState
          title="Could not load quizzes"
          description="Failed to load quiz list. Please try again."
          onRetry={() => refetch()}
        />
      ) : quizzesLoading ? (
        <SkeletonCards count={4} />
      ) : (
        <>
          {/* Quick Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Quizzes"
              value={stats.total}
              hint="All recorded tests"
              tone="primary"
              icon={<FileSpreadsheet className="h-5 w-5" />}
            />
            <StatCard
              label="Active / Published"
              value={stats.published}
              hint="Available for students to attempt"
              tone="emerald"
              icon={<Play className="h-5 w-5" />}
            />
            <StatCard
              label="Completed / Closed"
              value={stats.closed}
              hint="Archived test sessions"
              tone="violet"
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            {user?.role === 'student' ? (
              <StatCard
                label="My Submissions"
                value={stats.myAttempts}
                hint="Quizzes you completed"
                tone="amber"
                icon={<Award className="h-5 w-5" />}
              />
            ) : (
              <StatCard
                label="Active Classes"
                value={classes.length}
                hint="With active curriculums"
                tone="amber"
                icon={<GraduationCap className="h-5 w-5" />}
              />
            )}
          </div>

          <Card>
            {/* Filter Tabs & Search */}
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <Tabs
                items={[
                  { id: 'all', label: 'All Quizzes' },
                  { id: 'published', label: 'Active / Published' },
                  { id: 'closed', label: 'Closed' },
                  ...(user?.role === 'student' ? [{ id: 'my-submissions', label: 'My Submissions' }] : []),
                ]}
                value={activeTab}
                onChange={(id) => setActiveTab(id as any)}
                ariaLabel="Quiz filters"
              />

              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="w-40 text-xs"
                  options={[
                    { value: 'all', label: 'All Classes' },
                    ...classes.map((c) => ({ value: c.id, label: classLabel(c) })),
                  ]}
                />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search quizzes…"
                  className="w-48 text-xs h-9"
                />
              </div>
            </div>

            {/* Quiz List Cards */}
            <CardBody className="p-6">
              {activeTab === 'my-submissions' ? (
                mySubmissions.length === 0 ? (
                  <EmptyState
                    title="No quiz attempts recorded"
                    description="You have not submitted any quiz answers yet."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                          <th className="py-3 px-3">Quiz</th>
                          <th className="py-3 px-3">Subject</th>
                          <th className="py-3 px-3">Submitted At</th>
                          <th className="py-3 px-3 text-center">Score</th>
                          <th className="py-3 px-3">Teacher Feedback</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {mySubmissions.map((sub) => {
                          const quiz = quizzes.find((q) => q.id === sub.quizId);
                          const totalMarks = (quiz?.questions || []).reduce((sum, q) => sum + q.marks, 0);

                          return (
                            <tr key={sub.id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-3 font-semibold text-slate-900">
                                {quiz?.title || 'Unknown Quiz'}
                              </td>
                              <td className="py-3 px-3 text-xs text-slate-600">
                                {quiz ? subjectName(subjects, quiz.subjectId) : '—'}
                              </td>
                              <td className="py-3 px-3 text-xs text-slate-500">
                                {formatDate(sub.submittedAt)}
                              </td>
                              <td className="py-3 px-3 text-center">
                                {sub.score !== null ? (
                                  <Badge tone={sub.score >= totalMarks * 0.7 ? 'success' : 'warning'}>
                                    {sub.score} / {totalMarks}
                                  </Badge>
                                ) : (
                                  <Badge tone="neutral">Pending marking</Badge>
                                )}
                              </td>
                              <td className="py-3 px-3 text-xs text-slate-600 italic">
                                {sub.feedback || '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              ) : filteredQuizzes.length === 0 ? (
                <EmptyState
                  title="No quizzes match criteria"
                  description="Try selecting another class, clearing search terms, or create a new quiz."
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredQuizzes.map((quiz) => {
                    const classRoom = classes.find((c) => c.id === quiz.classId);
                    const subName = subjectName(subjects, quiz.subjectId);
                    const teacher = userName(allUsers, quiz.teacherId);
                    const totalMarks = quiz.questions.reduce((sum, q) => sum + q.marks, 0);
                    const myAttempt = mySubmissions.find((s) => s.quizId === quiz.id);

                    return (
                      <Card key={quiz.id} className="border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-slate-300 transition">
                        <CardHeader
                          title={
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-slate-900 text-base">{quiz.title}</span>
                              <Badge tone={quiz.status === 'published' ? 'success' : quiz.status === 'closed' ? 'neutral' : 'warning'}>
                                {quiz.status}
                              </Badge>
                            </div>
                          }
                          subtitle={`${subName} • ${classLabel(classRoom)}`}
                        />
                        <CardBody className="py-2 text-xs text-slate-600 space-y-2 flex-1">
                          <p className="line-clamp-2 text-slate-500">
                            {quiz.instructions || 'No special instructions.'}
                          </p>

                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              <span>{quiz.durationMin} mins</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Award className="h-3.5 w-3.5 text-slate-400" />
                              <span>{quiz.questions.length} Qs • {totalMarks} pts</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 col-span-2">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              <span>Scheduled: {formatDate(quiz.date)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 col-span-2 truncate">
                              <Users className="h-3.5 w-3.5 text-slate-400" />
                              <span>By: {teacher}</span>
                            </div>
                          </div>
                        </CardBody>

                        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between rounded-b-xl gap-2">
                          {user?.role === 'student' ? (
                            myAttempt ? (
                              <div className="flex items-center justify-between w-full">
                                <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Attempted
                                </span>
                                <Badge tone="primary">
                                  {myAttempt.score !== null ? `${myAttempt.score} / ${totalMarks}` : 'Submitted'}
                                </Badge>
                              </div>
                            ) : quiz.status === 'published' ? (
                              <Button
                                size="sm"
                                className="w-full text-xs"
                                leftIcon={<Play className="h-3.5 w-3.5" />}
                                onClick={() => setActiveQuizForAttempt(quiz)}
                              >
                                Take Quiz Now
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Quiz is closed</span>
                            )
                          ) : (
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  leftIcon={<Eye className="h-3.5 w-3.5" />}
                                  onClick={() => setActiveQuizForSubmissions(quiz)}
                                >
                                  Submissions
                                </Button>
                              </div>
                              {canManage && (
                                <div className="flex items-center gap-1">
                                  {quiz.status !== 'closed' ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs text-slate-500 hover:text-slate-700"
                                      leftIcon={<Lock className="h-3.5 w-3.5" />}
                                      onClick={() => handleSetStatus(quiz, 'closed')}
                                      disabled={updateQuizMutation.isPending}
                                    >
                                      Close
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs text-slate-500 hover:text-slate-700"
                                      leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                                      onClick={() => handleSetStatus(quiz, 'published')}
                                      disabled={updateQuizMutation.isPending}
                                    >
                                      Reopen
                                    </Button>
                                  )}
                                  <IconButton
                                    label="Delete quiz"
                                    size="sm"
                                    variant="ghost"
                                    className="text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                    onClick={() => setQuizPendingDelete(quiz)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </IconButton>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}

      {/* Create Quiz Modal */}
      <CreateQuizModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        classes={classes}
        subjects={subjects}
        user={user}
      />

      {/* Attempt Quiz Modal (Student) */}
      {activeQuizForAttempt && (
        <AttemptQuizModal
          quiz={activeQuizForAttempt}
          onClose={() => setActiveQuizForAttempt(null)}
          studentId={user?.id || ''}
        />
      )}

      {/* Submissions Evaluation Modal (Teacher/Admin) */}
      {activeQuizForSubmissions && (
        <SubmissionsModal
          quiz={activeQuizForSubmissions}
          onClose={() => setActiveQuizForSubmissions(null)}
          allUsers={allUsers}
          canMark={canMark}
        />
      )}

      {/* Delete confirmation (B-15: replaces the native window.confirm) */}
      <ConfirmDialog
        open={Boolean(quizPendingDelete)}
        onClose={() => setQuizPendingDelete(null)}
        onConfirm={() => quizPendingDelete && handleDeleteQuiz(quizPendingDelete)}
        title="Delete this quiz?"
        description={quizPendingDelete ? `“${quizPendingDelete.title}” and its submissions will be permanently removed.` : undefined}
        confirmLabel="Delete quiz"
        loading={deleteQuizMutation.isPending}
      />
    </div>
  );
}
/* -------------------------------------------------------------------------- */
/* Create Quiz Modal                                                          */
/* -------------------------------------------------------------------------- */
function CreateQuizModal({
  open,
  onClose,
  classes,
  subjects,
  user,
}: {
  open: boolean;
  onClose: () => void;
  classes: any[];
  subjects: any[];
  user: any;
}) {
  const toast = useToast();
  const createQuizMutation = useCreateQuiz();

  const [title, setTitle] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [durationMin, setDurationMin] = useState(15);
  const [date, setDate] = useState(() => today());
  const [instructions, setInstructions] = useState('');

  const [questions, setQuestions] = useState<
    Array<{ text: string; type: 'mcq' | 'short'; options: string[]; answer: string; marks: number }>
  >([
    {
      text: '',
      type: 'mcq',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      answer: 'Option A',
      marks: 5,
    },
  ]);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        text: '',
        type: 'mcq',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        answer: 'Option A',
        marks: 5,
      },
    ]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, patch: Partial<(typeof questions)[number]>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const handleSave = async (status: QuizStatus = 'published') => {
    if (!title.trim() || !classId || !subjectId) {
      toast.error('Missing details', 'Title, Class, and Subject are required.');
      return;
    }
    if (questions.some((q) => !q.text.trim())) {
      toast.error('Incomplete questions', 'All questions must have question text.');
      return;
    }

    try {
      await createQuizMutation.mutateAsync({
        title,
        classId,
        subjectId,
        teacherId: user?.id || 'u-teacher-1',
        date,
        durationMin,
        instructions,
        status,
        questions,
      });
      toast.success('Quiz created', `"${title}" has been saved with ${questions.length} questions.`);
      onClose();
    } catch (err) {
      toast.error('Failed to create quiz', err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create New Quiz / Test"
      description="Design a multiple choice or short question exam for your students."
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          <Button variant="ghost" onClick={addQuestion} leftIcon={<Plus className="h-4 w-4" />}>
            Add Question
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSave('draft')}
              loading={createQuizMutation.isPending}
            >
              Save as Draft
            </Button>
            <Button onClick={() => handleSave('published')} loading={createQuizMutation.isPending}>
              Publish Quiz
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 max-h-[65vh] overflow-y-auto px-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Quiz Title"
              value={title}
              placeholder="e.g. Chapter 4: Polynomials & Factoring"
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <Select
            label="Target Class"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            options={[{ value: '', label: 'Select class…' }, ...classes.map((c) => ({ value: c.id, label: classLabel(c) }))]}
            required
          />

          <Select
            label="Subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            options={[{ value: '', label: 'Select subject…' }, ...subjects.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))]}
            required
          />

          <Input
            type="number"
            label="Duration (Minutes)"
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            min={5}
            max={180}
            required
          />

          <Input
            type="date"
            label="Exam Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <Textarea
          label="Instructions (Optional)"
          value={instructions}
          placeholder="e.g. Attempt all questions. Calculators are allowed."
          onChange={(e) => setInstructions(e.target.value)}
          rows={2}
        />

        {/* Question Builder List */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <p className="font-semibold text-xs text-slate-700">Questions ({questions.length})</p>

          {questions.map((q, idx) => (
            <div key={idx} className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-xs text-slate-800">Q{idx + 1}</span>
                <div className="flex items-center gap-2">
                  <Select
                    value={q.type}
                    onChange={(e) => updateQuestion(idx, { type: e.target.value as any })}
                    className="text-xs h-8 w-28"
                    options={[
                      { value: 'mcq', label: 'Multiple Choice' },
                      { value: 'short', label: 'Short Answer' },
                    ]}
                  />
                  <Input
                    type="number"
                    value={q.marks}
                    onChange={(e) => updateQuestion(idx, { marks: Number(e.target.value) })}
                    className="w-16 h-8 text-xs"
                    min={1}
                  />
                  <span className="text-[11px] text-slate-500">pts</span>
                  {questions.length > 1 && (
                    <IconButton
                      label="Remove question"
                      size="sm"
                      variant="ghost"
                      className="text-rose-500 hover:text-rose-700"
                      onClick={() => removeQuestion(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  )}
                </div>
              </div>

              <Input
                placeholder="Question text…"
                value={q.text}
                onChange={(e) => updateQuestion(idx, { text: e.target.value })}
                className="text-xs"
              />

              {q.type === 'mcq' ? (
                <div className="space-y-1.5 pl-2 border-l-2 border-primary-200">
                  <p className="text-[11px] font-medium text-slate-600">Answer Options & Correct Answer:</p>
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${idx}`}
                        checked={q.answer === opt}
                        onChange={() => updateQuestion(idx, { answer: opt })}
                        className="text-primary-600"
                      />
                      <Input
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...q.options];
                          const oldVal = newOpts[optIdx];
                          newOpts[optIdx] = e.target.value;
                          updateQuestion(idx, {
                            options: newOpts,
                            answer: q.answer === oldVal ? e.target.value : q.answer,
                          });
                        }}
                        className="text-xs h-7"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <Input
                  label="Sample / Expected Answer"
                  value={q.answer}
                  onChange={(e) => updateQuestion(idx, { answer: e.target.value })}
                  placeholder="Expected answer key…"
                  className="text-xs"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Attempt Quiz Modal (Student)                                               */
/* -------------------------------------------------------------------------- */
function AttemptQuizModal({
  quiz,
  onClose,
  studentId,
}: {
  quiz: Quiz;
  onClose: () => void;
  studentId: string;
}) {
  const toast = useToast();
  const submitAttemptMutation = useSubmitAttempt();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confirmPartialSubmit, setConfirmPartialSubmit] = useState(false);

  const handleSelectOption = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleTextAnswer = (questionId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: text }));
  };

  const doSubmit = async () => {
    try {
      const res = await submitAttemptMutation.mutateAsync({
        quizId: quiz.id,
        studentId,
        answers,
      });
      toast.success(
        'Quiz submitted!',
        res.score !== null ? `Auto-graded score: ${res.score} points.` : 'Your submission is recorded for teacher evaluation.',
      );
      onClose();
    } catch (err) {
      toast.error('Submission failed', err instanceof Error ? err.message : undefined);
    } finally {
      setConfirmPartialSubmit(false);
    }
  };

  const handleSubmit = async () => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < quiz.questions.length) {
      setConfirmPartialSubmit(true);
      return;
    }
    await doSubmit();
  };

  return (
    <>
    <Modal
      open={true}
      onClose={onClose}
      title={`Take Quiz: ${quiz.title}`}
      description={`Duration: ${quiz.durationMin} minutes • Total: ${quiz.questions.reduce((sum, q) => sum + q.marks, 0)} points`}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-xs text-slate-500">
            {Object.keys(answers).length} of {quiz.questions.length} answered
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitAttemptMutation.isPending}>
              Submit Answers
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5 max-h-[65vh] overflow-y-auto px-1">
        {quiz.instructions && (
          <div className="p-3 bg-primary-50/60 border border-primary-200 rounded-lg text-xs text-primary-900">
            <strong>Instructions:</strong> {quiz.instructions}
          </div>
        )}

        {quiz.questions.map((q, idx) => (
          <div key={q.id} className="p-4 border border-slate-200 rounded-xl bg-white shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-sm text-slate-900">
                <span className="text-primary-600 mr-1.5">Q{idx + 1}.</span>
                {q.text}
              </p>
              <Badge tone="neutral" className="text-xs whitespace-nowrap">
                {q.marks} pts
              </Badge>
            </div>

            {q.type === 'mcq' && q.options ? (
              <div className="space-y-2 pt-1">
                {q.options.map((option, optIdx) => {
                  const isChecked = answers[q.id] === option;
                  return (
                    <label
                      key={optIdx}
                      className={cn(
                        'flex items-center gap-3 p-2.5 rounded-lg border text-xs cursor-pointer transition',
                        isChecked
                          ? 'border-primary-500 bg-primary-50/50 text-primary-950 font-medium'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700',
                      )}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={isChecked}
                        onChange={() => handleSelectOption(q.id, option)}
                        className="text-primary-600"
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <Textarea
                placeholder="Type your answer here…"
                value={answers[q.id] || ''}
                onChange={(e) => handleTextAnswer(q.id, e.target.value)}
                rows={3}
                className="text-xs"
              />
            )}
          </div>
        ))}
      </div>
    </Modal>
      <ConfirmDialog
        open={confirmPartialSubmit}
        onClose={() => setConfirmPartialSubmit(false)}
        onConfirm={doSubmit}
        title="Submit with unanswered questions?"
        confirmLabel="Submit anyway"
        tone="primary"
        loading={submitAttemptMutation.isPending}
      >
        <p className="text-sm text-slate-600">
          You answered {Object.keys(answers).length} of {quiz.questions.length} questions. Unanswered questions
          will score zero — submit anyway?
        </p>
      </ConfirmDialog>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Submissions Review Modal (Teacher/Admin)                                   */
/* -------------------------------------------------------------------------- */
function SubmissionsModal({
  quiz,
  onClose,
  allUsers,
  canMark,
}: {
  quiz: Quiz;
  onClose: () => void;
  allUsers: any[];
  canMark: boolean;
}) {
  const toast = useToast();
  const { data: submissions = [], isLoading } = useSubmissions(quiz.id);
  const markMutation = useMarkSubmission();

  const [activeSubmission, setActiveSubmission] = useState<QuizSubmission | null>(null);
  const [scoreInput, setScoreInput] = useState<string>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');

  const totalMarks = quiz.questions.reduce((sum, q) => sum + q.marks, 0);
  const pendingCount = submissions.filter((s) => s.score === null).length;

  const openEvaluation = (submission: QuizSubmission) => {
    setActiveSubmission(submission);
    setScoreInput(submission.score !== null ? String(submission.score) : '');
    setFeedbackInput(submission.feedback ?? '');
  };

  const handleMark = async () => {
    if (!activeSubmission) return;
    const parsed = Number(scoreInput);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > totalMarks) {
      toast.error('Invalid score', `Score must be between 0 and ${totalMarks}.`);
      return;
    }
    try {
      await markMutation.mutateAsync({
        submissionId: activeSubmission.id,
        score: parsed,
        feedback: feedbackInput.trim() || undefined,
      });
      toast.success('Submission graded', `Score of ${parsed}/${totalMarks} recorded.`);
      setActiveSubmission(null);
    } catch (err) {
      toast.error('Failed to grade', err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Submissions: ${quiz.title}`}
      description={`${submissions.length} submission(s) • ${pendingCount} pending evaluation • Total marks: ${totalMarks}`}
      size="xl"
      footer={
        <div className="flex w-full items-center justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <SkeletonCards count={3} />
      ) : submissions.length === 0 ? (
        <EmptyState
          icon={<FileSpreadsheet className="h-8 w-8" />}
          title="No submissions yet"
          description="Students have not attempted this quiz."
        />
      ) : activeSubmission ? (
        <div className="space-y-4 max-h-[65vh] overflow-y-auto px-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                {userName(allUsers, activeSubmission.studentId).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-900">
                  {userName(allUsers, activeSubmission.studentId)}
                </p>
                <p className="text-[11px] text-slate-500">
                  Submitted: {new Date(activeSubmission.submittedAt).toLocaleString()}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActiveSubmission(null)}>
              Back to list
            </Button>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-2">
            <p className="font-semibold text-slate-800 text-[11px] uppercase tracking-wide">Student Answers</p>
            {quiz.questions.map((q, idx) => (
              <div key={q.id} className="p-2.5 bg-white border border-slate-200 rounded-md">
                <p className="text-slate-800 font-medium">
                  Q{idx + 1}. {q.text}
                </p>
                <p className="mt-1 text-slate-600">
                  <span className="text-slate-400">Answer: </span>
                  {activeSubmission.answers[q.id] || <em className="text-slate-400">Not answered</em>}
                </p>
                {q.type === 'mcq' && (
                  <p
                    className={cn(
                      'mt-1 text-[11px] font-medium',
                      activeSubmission.answers[q.id] === q.answer ? 'text-emerald-600' : 'text-rose-600',
                    )}
                  >
                    {activeSubmission.answers[q.id] === q.answer
                      ? `✓ Correct (+${q.marks} pts)`
                      : `✗ Incorrect (Expected: ${q.answer})`}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              type="number"
              label={`Score (0 – ${totalMarks})`}
              value={scoreInput}
              onChange={(e) => setScoreInput(e.target.value)}
              min={0}
              max={totalMarks}
              disabled={!canMark}
              required
            />
            <div className="flex items-end">
              <p className="text-[11px] text-slate-500 pb-2">
                Auto-score was:{' '}
                <strong>
                  {activeSubmission.score !== null ? `${activeSubmission.score} / ${totalMarks}` : 'pending (short answer)'}
                </strong>
              </p>
            </div>
          </div>

          <Textarea
            label="Teacher Feedback (Optional)"
            value={feedbackInput}
            onChange={(e) => setFeedbackInput(e.target.value)}
            placeholder="e.g. Great work on Q2. Review Q5 on quadratic formulas."
            rows={3}
            disabled={!canMark}
          />

          {canMark && (
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setActiveSubmission(null)}>
                Cancel
              </Button>
              <Button onClick={handleMark} loading={markMutation.isPending}>
                Save Evaluation
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 max-h-[65vh] overflow-y-auto px-1">
          {submissions.map((submission) => (
            <div
              key={submission.id}
              className="flex items-center justify-between gap-4 p-3 border border-slate-200 rounded-lg hover:border-slate-300 transition bg-white"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 shrink-0 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold">
                  {userName(allUsers, submission.studentId).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-slate-900 truncate">
                    {userName(allUsers, submission.studentId)}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Submitted {new Date(submission.submittedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Badge tone={submission.score !== null ? 'success' : 'warning'}>
                  {submission.score !== null ? `${submission.score} / ${totalMarks}` : 'Pending'}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  leftIcon={<Eye className="h-3.5 w-3.5" />}
                  onClick={() => openEvaluation(submission)}
                >
                  {canMark ? 'Evaluate' : 'View'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}


