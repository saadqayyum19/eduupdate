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

  return null;
}
