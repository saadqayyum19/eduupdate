import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, GraduationCap, Save, Sparkles } from 'lucide-react';
import { emptyClass, useClasses, useCreateClass, useSubjects, useUsers, type ClassInput } from '@/services/api';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Checkbox, Input, Select } from '@/components/ui/Input';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { PageHeader } from '@/components/ui/PageHeader';
import { Stepper, type Step } from '@/components/ui/Stepper';
import { Avatar } from '@/components/ui/Avatar';
import { classLabel } from '@/lib/lookups';
import { cn } from '@/lib/utils';

const STEPS: Step[] = [
  { id: 'basics', label: 'Class details', description: 'Name, section and room' },
  { id: 'teachers', label: 'Add teachers', description: 'Pick who teaches here' },
  { id: 'incharge', label: 'Teacher incharge', description: 'One owner + subject leads' },
  { id: 'students', label: 'Add students', description: 'Select or bulk add' },
  { id: 'review', label: 'Review & save', description: 'Check everything once' },
];

/**
 * Class creation wizard — five steps on a single page with animated transitions.
 * All progress lives in one state object, so going Back never loses data.
 */
export default function ClassWizardPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: users = [] } = useUsers();
  const { data: subjects = [] } = useSubjects();
  const { data: classes = [] } = useClasses();
  const createClass = useCreateClass();

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState<ClassInput>(emptyClass());
  const [bulkText, setBulkText] = useState('');
  const [touched, setTouched] = useState(false);

  const teachers = useMemo(
    () => users.filter((user) => user.role === 'teacher' || user.role === 'teacher_incharge'),
    [users],
  );
  const students = useMemo(() => users.filter((user) => user.role === 'student'), [users]);

  const update = (patch: Partial<ClassInput>) => setForm((prev) => ({ ...prev, ...patch }));

  const selectedTeachers = teachers.filter((teacher) => form.teacherIds.includes(teacher.id));
  const selectedStudents = students.filter((student) => form.studentIds.includes(student.id));
  const selectedSubjects = subjects.filter((subject) => form.subjectIds.includes(subject.id));

  const stepError = useMemo(() => {
    if (stepIndex === 0 && form.name.trim().length < 2) return 'Please give the class a name, for example "Class 11".';
    if (stepIndex === 1 && form.teacherIds.length === 0) return 'Select at least one teacher for this class.';
    if (stepIndex === 2 && !form.inchargeId) return 'Choose the teacher incharge for this class.';
    if (stepIndex === 2 && form.subjectIds.length === 0) return 'Pick at least one subject to teach in this class.';
    if (stepIndex === 3 && form.studentIds.length === 0) return 'Add at least one student to continue.';
    return null;
  }, [form.inchargeId, form.name, form.studentIds.length, form.subjectIds.length, form.teacherIds.length, stepIndex]);

  const goTo = (index: number) => {
    setDirection(index > stepIndex ? 1 : -1);
    setTouched(false);
    setStepIndex(Math.max(0, Math.min(STEPS.length - 1, index)));
  };

  const next = () => {
    setTouched(true);
    if (stepError) return;
    goTo(stepIndex + 1);
  };

  const back = () => goTo(stepIndex - 1);

  const save = async () => {
    try {
      const created = await createClass.mutateAsync({
        ...form,
        name: form.name.trim(),
        subjectIncharges: form.subjectIncharges,
      });
      toast.success('Class created', `${classLabel(created)} is ready with ${created.studentIds.length} students.`);
      navigate(`/classes/${created.id}`);
    } catch (error) {
      toast.error('Could not create the class', error instanceof Error ? error.message : undefined);
    }
  };

  const applyBulkImport = () => {
    const names = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (!names.length) {
      toast.error('Nothing to import', 'Type one student name per line first.');
      return;
    }
    const matched = students.filter((student) =>
      names.some((name) => student.name.toLowerCase() === name.toLowerCase()),
    );
    if (!matched.length) {
      toast.error('No matching students', 'Bulk import matches existing students by their full name.');
      return;
    }
    update({ studentIds: [...new Set([...form.studentIds, ...matched.map((student) => student.id)])] });
    setBulkText('');
    toast.success(`${matched.length} students added`, matched.map((student) => student.name).join(', '));
  };

  /** Keeps the incharge list valid when teachers change. */
  const setTeachers = (ids: string[]) => {
    update({
      teacherIds: ids,
      inchargeId: ids.includes(form.inchargeId ?? '') ? form.inchargeId : null,
      subjectIncharges: Object.fromEntries(
        Object.entries(form.subjectIncharges).map(([subjectId, teacherId]) => [
          subjectId,
          teacherId && ids.includes(teacherId) ? teacherId : null,
        ]),
      ),
    });
  };
  const slide = {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
  };

  return (
    <div>
      <PageHeader
        title="Create a class"
        description="Five quick steps: name the class, add teachers, pick the teacher incharge, add students, then review."
        icon={<GraduationCap className="h-5 w-5" aria-hidden />}
        crumbs={[{ label: 'Classes', to: '/classes' }, { label: 'New class' }]}
        actions={
          <Badge tone="primary">
            Step {stepIndex + 1} of {STEPS.length}
          </Badge>
        }
      />

      <Card className="mb-5">
        <Stepper steps={STEPS} currentIndex={stepIndex} onStepClick={goTo} />
      </Card>

      <Card>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={STEPS[stepIndex].id}
            custom={direction}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* ---------------------------------------------------------- step 1 */}
            {stepIndex === 0 && (
              <div className="space-y-5">
                <CardHeader title="Class details" subtitle="What should we call this class?" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Class name"
                    required
                    placeholder="Class 11"
                    hint="Use the standard school name, e.g. Class 11"
                    value={form.name}
                    onChange={(event) => update({ name: event.target.value })}
                    error={touched && stepError ? stepError : undefined}
                  />
                  <Select
                    label="Section"
                    options={['A', 'B', 'C', 'D'].map((section) => ({ label: section, value: section }))}
                    value={form.section}
                    onChange={(event) => update({ section: event.target.value })}
                  />
                  <Input
                    label="Room (optional)"
                    placeholder="Room 201"
                    value={form.room ?? ''}
                    onChange={(event) => update({ room: event.target.value })}
                  />
                  <div className="rounded-md border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600">
                    <p className="font-medium text-slate-700">Already created</p>
                    <p className="mt-1 text-xs">
                      {classes.length
                        ? classes.map((classRoom) => classLabel(classRoom)).join(', ')
                        : 'No classes yet — this will be the first one.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------- step 2 */}
            {stepIndex === 1 && (
              <div className="space-y-5">
                <CardHeader
                  title="Add teachers"
                  subtitle="Select everyone who will teach in this class"
                  action={<Badge tone="neutral">{form.teacherIds.length} selected</Badge>}
                />
                <MultiSelect
                  options={teachers.map((teacher) => ({
                    id: teacher.id,
                    label: teacher.name,
                    description: teacher.designation ?? 'Teacher',
                    color: teacher.avatarColor,
                  }))}
                  selected={form.teacherIds}
                  onChange={setTeachers}
                  searchPlaceholder="Search teachers by name or subject"
                  emptyText="No teachers match that search."
                />
                {touched && stepError && <p className="text-sm font-medium text-rose-600">{stepError}</p>}
              </div>
            )}
            {/* ---------------------------------------------------------- step 3 */}
            {stepIndex === 2 && (
              <div className="space-y-6">
                <CardHeader
                  title="Teacher incharge"
                  subtitle="One teacher owns this class and keeps everything in order"
                  action={<Badge tone="neutral">{selectedTeachers.length} teachers available</Badge>}
                />

                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">Pick the class incharge</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedTeachers.map((teacher) => {
                      const active = form.inchargeId === teacher.id;
                      return (
                        <button
                          key={teacher.id}
                          type="button"
                          onClick={() => update({ inchargeId: teacher.id })}
                          aria-pressed={active}
                          className={cn(
                            'flex items-center gap-3 rounded-md border p-3 text-left transition',
                            active
                              ? 'border-primary-300 bg-primary-50'
                              : 'border-slate-200 bg-white hover:border-primary-200 hover:bg-slate-50',
                          )}
                        >
                          <Avatar name={teacher.name} color={teacher.avatarColor} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-800">{teacher.name}</span>
                            <span className="block truncate text-xs text-slate-500">
                              {teacher.designation ?? 'Teacher'}
                            </span>
                          </span>
                          {active && <CheckCircle2 className="h-5 w-5 text-primary-600" aria-hidden />}
                        </button>
                      );
                    })}
                    {selectedTeachers.length === 0 && (
                      <p className="text-sm text-slate-500">Go back to step 2 and add teachers first.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-md border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-700">Subjects taught in this class</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Tick the subjects, then choose who leads each one (subject incharge).
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {subjects.map((subject) => {
                      const checked = form.subjectIds.includes(subject.id);
                      return (
                        <div key={subject.id} className="rounded-md border border-slate-100 p-2">
                          <Checkbox
                            label={subject.name}
                            description={subject.code}
                            checked={checked}
                            onChange={() =>
                              update({
                                subjectIds: checked
                                  ? form.subjectIds.filter((id) => id !== subject.id)
                                  : [...form.subjectIds, subject.id],
                                subjectIncharges: checked
                                  ? Object.fromEntries(
                                      Object.entries(form.subjectIncharges).filter(([id]) => id !== subject.id),
                                    )
                                  : {
                                      ...form.subjectIncharges,
                                      [subject.id]: form.subjectIncharges[subject.id] ?? null,
                                    },
                              })
                            }
                          />
                          {checked && (
                            <Select
                              label={`${subject.code} incharge`}
                              placeholder="Not assigned yet"
                              options={selectedTeachers.map((teacher) => ({ label: teacher.name, value: teacher.id }))}
                              value={form.subjectIncharges[subject.id] ?? ''}
                              onChange={(event) =>
                                update({
                                  subjectIncharges: {
                                    ...form.subjectIncharges,
                                    [subject.id]: event.target.value || null,
                                  },
                                })
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {touched && stepError && <p className="text-sm font-medium text-rose-600">{stepError}</p>}
              </div>
            )}
            {/* ---------------------------------------------------------- step 4 */}
            {stepIndex === 3 && (
              <div className="space-y-6">
                <CardHeader
                  title="Add students"
                  subtitle="Search and select, or paste a list to bulk import"
                  action={<Badge tone="neutral">{form.studentIds.length} students</Badge>}
                />

                <MultiSelect
                  options={students.map((student) => ({
                    id: student.id,
                    label: student.name,
                    description: `${student.rollNo ?? 'No roll no.'} • ${classLabel(
                      classes.find((item) => item.id === student.classId),
                    )}`,
                    color: student.avatarColor,
                  }))}
                  selected={form.studentIds}
                  onChange={(ids) => update({ studentIds: ids })}
                  searchPlaceholder="Search students by name or roll number"
                  emptyText="No students match that search."
                  maxHeight="16rem"
                />

                <div className="rounded-md border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-700">Bulk import (one name per line)</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Matches existing student accounts by full name — perfect for pasting a class list.
                  </p>
                  <textarea
                    rows={4}
                    value={bulkText}
                    onChange={(event) => setBulkText(event.target.value)}
                    placeholder={'Aarav Gupta\nDiya Sharma\nKabir Singh'}
                    className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                  <Button className="mt-3" variant="outline" onClick={applyBulkImport}>
                    Add these names
                  </Button>
                </div>

                {touched && stepError && <p className="text-sm font-medium text-rose-600">{stepError}</p>}
              </div>
            )}
            {/* ---------------------------------------------------------- step 5 */}
            {stepIndex === 4 && (
              <div className="space-y-6">
                <CardHeader title="Review & save" subtitle="Check the details one last time before saving" />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-md border border-slate-200 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Class</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {form.name || 'Unnamed class'} — {form.section}
                    </p>
                    <p className="text-xs text-slate-500">{form.room || 'Room not set'}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Teacher incharge</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {selectedTeachers.find((teacher) => teacher.id === form.inchargeId)?.name ?? 'Not selected'}
                    </p>
                    <p className="text-xs text-slate-500">{selectedTeachers.length} teachers assigned</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-md border border-slate-200 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Subjects</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedSubjects.map((subject) => (
                        <Badge key={subject.id} tone="primary">
                          {subject.name}
                        </Badge>
                      ))}
                      {selectedSubjects.length === 0 && <p className="text-xs text-slate-500">None selected</p>}
                    </div>
                  </div>
                  <div className="rounded-md border border-slate-200 p-4 sm:col-span-2">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Students ({selectedStudents.length})</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedStudents.map((student) => (
                        <Badge key={student.id} tone="neutral">
                          {student.name}
                        </Badge>
                      ))}
                      {selectedStudents.length === 0 && <p className="text-xs text-slate-500">None selected</p>}
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Subject incharges</p>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {selectedSubjects.map((subject) => (
                      <li key={subject.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{subject.name}</span>
                        <span className="font-medium text-slate-800">
                          {selectedTeachers.find((teacher) => teacher.id === form.subjectIncharges[subject.id])?.name ??
                            'Class incharge'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                  Looks good? Saving creates the class, links the students and teachers, and makes the timetable editable.
                </p>
              </div>
            )}



          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <Button variant="ghost" onClick={() => navigate('/classes')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={back} disabled={stepIndex === 0}>
              Back
            </Button>
            {stepIndex < STEPS.length - 1 ? (
              <Button onClick={next} rightIcon={<ArrowRight className="h-4 w-4" />}>
                Next
              </Button>
            ) : (
              <Button variant="success" onClick={save} loading={createClass.isPending} leftIcon={<Save className="h-4 w-4" />}>
                Save class
              </Button>
            )}
          </div>
        </div>
      </Card>

      <p className={cn('mt-4 flex items-center gap-2 text-xs text-slate-500')}>
        <Sparkles className="h-3.5 w-3.5 text-primary-500" aria-hidden />
        Tip: you can jump back to any completed step using the stepper above — nothing is lost.
      </p>
    </div>
  );
}
