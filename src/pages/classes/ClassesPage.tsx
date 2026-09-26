import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, MoreHorizontal, Pencil, Plus, Trash2, Users } from 'lucide-react';
import type { ClassRoom } from '@/types';
import { useClasses, useDeleteClass, useSubjects, useUsers } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { useTableState } from '@/hooks/useTableState';
import { Badge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Dropdown } from '@/components/ui/Dropdown';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { SearchInput } from '@/components/ui/SearchInput';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { classLabel, subjectName, userName } from '@/lib/lookups';
import { paginate } from '@/lib/utils';

/** Classes list: cards showing students, teachers and the class incharge. */
export default function ClassesPage() {
  const { can } = usePermissions();
  const { data: classes = [], isLoading, isError, refetch } = useClasses();
  const { data: users = [] } = useUsers();
  const { data: subjects = [] } = useSubjects();
  const deleteClass = useDeleteClass();
  const toast = useToast();
  const navigate = useNavigate();
  const table = useTableState(6);
  const [pendingDelete, setPendingDelete] = useState<ClassRoom | null>(null);

  const canManage = can('classes.manage');

  const filtered = useMemo(() => {
    const term = table.debouncedSearch.trim().toLowerCase();
    if (!term) return classes;
    return classes.filter((classRoom) =>
      `${classRoom.name} ${classRoom.section} ${classRoom.room ?? ''}`.toLowerCase().includes(term),
    );
  }, [classes, table.debouncedSearch]);

  const paged = paginate(filtered, table.page, table.pageSize);

  return (
    <div>
      <PageHeader
        title="Classes"
        description="Every class in the school with its teachers, students and subjects."
        icon={<GraduationCap className="h-5 w-5" aria-hidden />}
        actions={
          canManage ? (
            <Link to="/classes/new">
              <Button leftIcon={<Plus className="h-4 w-4" />}>Create class</Button>
            </Link>
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
            placeholder="Search by class name or room"
            label="Search classes"
          />
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users className="h-4 w-4" aria-hidden />
            {classes.reduce((sum, classRoom) => sum + classRoom.studentIds.length, 0)} students across {classes.length}{' '}
            classes
          </div>
        </div>
      </Card>

      {isLoading && <SkeletonCards count={6} height="h-56" />}

      {!isLoading && (isError || filtered.length === 0) && (
        <Card>
          {isError ? (
            <EmptyState
              title="Could not load classes"
              description="Something went wrong while fetching the class list."
              action={
                <Button variant="outline" onClick={() => refetch()}>
                  Try again
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<GraduationCap className="h-6 w-6" aria-hidden />}
              title="No classes yet"
              description="Create your first class — name it, add teachers, pick the teacher incharge and add students. It takes about a minute."
              action={
                canManage ? (
                  <Link to="/classes/new">
                    <Button leftIcon={<Plus className="h-4 w-4" />}>Create class</Button>
                  </Link>
                ) : undefined
              }
            />
          )}
        </Card>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paged.items.map((classRoom) => {
              const incharge = users.find((user) => user.id === classRoom.inchargeId);
              return (
                <Card key={classRoom.id} hover className="flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        to={`/classes/${classRoom.id}`}
                        className="text-base font-semibold text-slate-900 hover:text-primary-700"
                      >
                        {classLabel(classRoom)}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">{classRoom.room ?? 'Room not set'}</p>
                    </div>
                    {canManage && (
                      <Dropdown
                        items={[
                          {
                            id: 'edit',
                            label: 'Open class details',
                            icon: <Pencil className="h-4 w-4" />,
                            onSelect: () => navigate(`/classes/${classRoom.id}`),
                          },
                          {
                            id: 'delete',
                            label: 'Delete class',
                            icon: <Trash2 className="h-4 w-4" />,
                            danger: true,
                            dividerBefore: true,
                            onSelect: () => setPendingDelete(classRoom),
                          },
                        ]}
                        trigger={({ toggle }) => (
                          <IconButton label={`Actions for ${classLabel(classRoom)}`} size="sm" onClick={toggle}>
                            <MoreHorizontal className="h-4 w-4" aria-hidden />
                          </IconButton>
                        )}
                      />
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-3 rounded-md bg-slate-50 p-3">
                    <Avatar name={incharge?.name ?? 'Not set'} color={incharge?.avatarColor} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {incharge?.name ?? 'No incharge yet'}
                      </p>
                      <p className="text-xs text-slate-500">Teacher incharge</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md border border-slate-100 py-2">
                      <p className="text-lg font-semibold text-slate-900">{classRoom.studentIds.length}</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Students</p>
                    </div>
                    <div className="rounded-md border border-slate-100 py-2">
                      <p className="text-lg font-semibold text-slate-900">{classRoom.teacherIds.length}</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Teachers</p>
                    </div>
                    <div className="rounded-md border border-slate-100 py-2">
                      <p className="text-lg font-semibold text-slate-900">{classRoom.subjectIds.length}</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Subjects</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {classRoom.subjectIds.slice(0, 3).map((subjectId) => (
                      <Badge key={subjectId} tone="primary">
                        {subjectName(subjects, subjectId)}
                      </Badge>
                    ))}
                    {classRoom.subjectIds.length > 3 && <Badge tone="neutral">+{classRoom.subjectIds.length - 3}</Badge>}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <Link to={`/classes/${classRoom.id}`}>
                      <Button size="sm" variant="outline">
                        Open class
                      </Button>
                    </Link>
                    <Link to={`/attendance?classId=${classRoom.id}`}>
                      <Button size="sm" variant="ghost">
                        Attendance
                      </Button>
                    </Link>
                    <Link to={`/timetable?classId=${classRoom.id}`}>
                      <Button size="sm" variant="ghost">
                        Timetable
                      </Button>
                    </Link>
                  </div>

                  <p className="mt-3 text-[11px] text-slate-400">
                    Created {classRoom.createdAt} • {classRoom.teacherIds.map((id) => userName(users, id)).join(', ')}
                  </p>
                </Card>
              );
            })}
          </div>

          <Pagination
            className="mt-6"
            page={paged.page}
            pageCount={paged.pageCount}
            total={paged.total}
            pageSize={paged.pageSize}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
          />
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={`Delete ${pendingDelete ? classLabel(pendingDelete) : 'class'}?`}
        description="Students and teachers stay in the system; only this class is removed."
        confirmLabel="Delete class"
        loading={deleteClass.isPending}
        onConfirm={async () => {
          if (!pendingDelete) return;
          const target = pendingDelete;
          try {
            await deleteClass.mutateAsync(target.id);
            toast.success('Class deleted', `${classLabel(target)} was removed.`);
          } catch (error) {
            toast.error('Could not delete class', error instanceof Error ? error.message : undefined);
          } finally {
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
}
