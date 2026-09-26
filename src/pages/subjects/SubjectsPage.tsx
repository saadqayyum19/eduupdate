import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Subject } from '@/types';
import {
  useClasses,
  useCreateSubject,
  useDeleteSubject,
  useSubjects,
  useToggleSubjectClass,
  useUpdateSubject,
} from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { useTableState } from '@/hooks/useTableState';
import { Badge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable, type Column } from '@/components/ui/Table';
import { useToast } from '@/components/ui/Toast';
import { classLabel } from '@/lib/lookups';
import { paginate } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(2, 'Enter the subject name'),
  code: z.string().min(2, 'Use a short code like MTH').max(6, 'Keep the code short'),
});
type SubjectValues = z.infer<typeof schema>;

/** Subjects: simple list plus which classes each subject runs in. */
export default function SubjectsPage() {
  const { can } = usePermissions();
  const { data: subjects = [], isLoading, isError, refetch } = useSubjects();
  const { data: classes = [] } = useClasses();
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();
  const toggleClass = useToggleSubjectClass();
  const toast = useToast();
  const table = useTableState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Subject | null>(null);

  const canManage = can('subjects.manage');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubjectValues>({ resolver: zodResolver(schema), defaultValues: { name: '', code: '' } });

  const filtered = useMemo(() => {
    const term = table.debouncedSearch.trim().toLowerCase();
    if (!term) return subjects;
    return subjects.filter(
      (subject) => subject.name.toLowerCase().includes(term) || subject.code.toLowerCase().includes(term),
    );
  }, [subjects, table.debouncedSearch]);

  const paged = paginate(filtered, table.page, table.pageSize);

  const openForm = (subject?: Subject) => {
    setEditing(subject ?? null);
    reset({ name: subject?.name ?? '', code: subject?.code ?? '' });
    setFormOpen(true);
  };

  const onSubmit = async (values: SubjectValues) => {
    try {
      if (editing) {
        await updateSubject.mutateAsync({ id: editing.id, input: values });
        toast.success('Subject updated', `${values.name} was saved.`);
      } else {
        await createSubject.mutateAsync({ name: values.name, code: values.code, classIds: [] });
        toast.success('Subject added', `${values.name} is ready to be assigned to a class.`);
      }
      setFormOpen(false);
    } catch (error) {
      toast.error('Could not save the subject', error instanceof Error ? error.message : undefined);
    }
  };
  const columns: Array<Column<Subject>> = [
    {
      key: 'name',
      header: 'Subject',
      sortValue: (row) => row.name,
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="h-8 w-1.5 rounded-full" style={{ backgroundColor: row.color }} aria-hidden />
          <div>
            <p className="font-medium text-slate-800">{row.name}</p>
            <p className="text-xs text-slate-500">Code {row.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'classes',
      header: 'Assign to classes',
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          {classes.map((classRoom) => {
            const assigned = row.classIds.includes(classRoom.id);
            return (
              <button
                key={classRoom.id}
                type="button"
                disabled={!canManage}
                onClick={async () => {
                  try {
                    await toggleClass.mutateAsync({ subjectId: row.id, classId: classRoom.id });
                    toast.success(
                      assigned ? 'Removed from class' : 'Added to class',
                      `${row.name} • ${classLabel(classRoom)}`,
                    );
                  } catch (error) {
                    toast.error('Could not update the class list', error instanceof Error ? error.message : undefined);
                  }
                }}
                className={
                  assigned
                    ? 'rounded-full border border-primary-200 bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700 transition hover:border-primary-300'
                    : 'rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-500 transition hover:border-primary-200'
                }
                aria-pressed={assigned}
              >
                {classRoom.name} {classRoom.section}
              </button>
            );
          })}
          {classes.length === 0 && <span className="text-xs text-slate-500">No classes yet</span>}
        </div>
      ),
    },
    {
      key: 'count',
      header: 'Classes',
      sortValue: (row) => row.classIds.length,
      render: (row) => <Badge tone={row.classIds.length ? 'primary' : 'neutral'}>{row.classIds.length} classes</Badge>,
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (row: Subject) => (
              <div className="flex justify-end gap-1">
                <IconButton label={`Edit ${row.name}`} size="sm" onClick={() => openForm(row)}>
                  <Pencil className="h-4 w-4" aria-hidden />
                </IconButton>
                <IconButton label={`Delete ${row.name}`} size="sm" onClick={() => setPendingDelete(row)}>
                  <Trash2 className="h-4 w-4 text-rose-500" aria-hidden />
                </IconButton>
              </div>
            ),
          } satisfies Column<Subject>,
        ]
      : []),
  ];
  return (
    <div>
      <PageHeader
        title="Subjects"
        description="The subjects taught at school, and which classes run them."
        icon={<BookOpen className="h-5 w-5" aria-hidden />}
        actions={
          canManage ? (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => openForm()}>
              Add subject
            </Button>
          ) : (
            <Badge tone="neutral">View only</Badge>
          )
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SearchInput
            value={table.search}
            onChange={table.setSearch}
            placeholder="Search subjects or codes"
            label="Search subjects"
          />
          <div className="flex gap-4 text-sm text-slate-500">
            <span>{subjects.length} subjects</span>
            <span>{subjects.filter((subject) => subject.classIds.length === 0).length} unassigned</span>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="All subjects" subtitle="Tap a class chip to assign or remove this subject" />

        {isError ? (
          <EmptyState
            title="Could not load subjects"
            description="Something went wrong while loading the subject list."
            action={
              <Button variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
            }
          />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={paged.items}
              rowKey={(row) => row.id}
              loading={isLoading}
              emptyTitle="No subjects yet"
              emptyDescription="Add your first subject, for example Mathematics or Science."
              emptyAction={
                canManage ? (
                  <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => openForm()}>
                    Add subject
                  </Button>
                ) : undefined
              }
            />
            {!isLoading && filtered.length > 0 && (
              <Pagination
                page={paged.page}
                pageCount={paged.pageCount}
                total={paged.total}
                pageSize={paged.pageSize}
                onPageChange={table.setPage}
                onPageSizeChange={table.setPageSize}
              />
            )}
          </>
        )}
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Add a subject'}
        description="Subjects are shared across classes — assign them from the list afterwards."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)} loading={createSubject.isPending || updateSubject.isPending}>
              {editing ? 'Save changes' : 'Add subject'}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input
            label="Subject name"
            required
            placeholder="Mathematics"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input label="Short code" required placeholder="MTH" error={errors.code?.message} {...register('code')} />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={`Delete ${pendingDelete?.name ?? 'subject'}?`}
        description="Timetable periods using this subject will be cleared."
        confirmLabel="Delete subject"
        loading={deleteSubject.isPending}
        onConfirm={async () => {
          if (!pendingDelete) return;
          const target = pendingDelete;
          try {
            await deleteSubject.mutateAsync(target.id);
            toast.success('Subject deleted', `${target.name} was removed.`);
          } catch (error) {
            toast.error('Could not delete the subject', error instanceof Error ? error.message : undefined);
          } finally {
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
}
