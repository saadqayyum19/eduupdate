import { useMemo, useState } from 'react';
import { Eye, MoreHorizontal, Pencil, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import type { Role, User } from '@/types';
import { useClasses, useDeleteUser, useUsers } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { useTableState } from '@/hooks/useTableState';
import { ROLE_BADGE, ROLE_LABELS } from '@/lib/constants';
import { classLabel, userName } from '@/lib/lookups';
import { formatDate, paginate } from '@/lib/utils';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PersonCell } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/Modal';
import { DataTable, type Column } from '@/components/ui/Table';
import { Dropdown } from '@/components/ui/Dropdown';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { FilterSelect, SearchInput } from '@/components/ui/SearchInput';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { UserFormModal } from './UserFormModal';

type TabId = 'all' | Role;

/** Users module: one list for every role with search, filters, sorting and CRUD. */
export default function UsersPage() {
  const { can } = usePermissions();
  const { data: users = [], isLoading, isError, refetch } = useUsers();
  const { data: classes = [] } = useClasses();
  const deleteUser = useDeleteUser();
  const toast = useToast();
  const table = useTableState(10);

  const [tab, setTab] = useState<TabId>('all');
  const [status, setStatus] = useState<'all' | User['status']>('all');
  const [editing, setEditing] = useState<User | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);

  const canManage = can('users.manage');

  const filtered = useMemo(() => {
    const term = table.debouncedSearch.trim().toLowerCase();
    return users
      .filter((user) => (tab === 'all' ? true : user.role === tab))
      .filter((user) => (status === 'all' ? true : user.status === status))
      .filter((user) =>
        term
          ? user.name.toLowerCase().includes(term) ||
            user.email.toLowerCase().includes(term) ||
            (user.rollNo ?? '').toLowerCase().includes(term) ||
            (user.designation ?? '').toLowerCase().includes(term)
          : true,
      );
  }, [status, tab, table.debouncedSearch, users]);

  const paged = paginate(filtered, table.page, table.pageSize);

  const tabs = useMemo(() => {
    const entries: Array<[TabId, string]> = [
      ['all', 'Everyone'],
      ['admin', 'Admins'],
      ['principal', 'Principals'],
      ['teacher_incharge', 'Incharges'],
      ['teacher', 'Teachers'],
      ['student', 'Students'],
      ['parent', 'Parents'],
    ];
    return entries.map(([id, label]) => ({
      id,
      label,
      badge: id === 'all' ? users.length : users.filter((user) => user.role === id).length,
    }));
  }, [users]);
  const columns: Array<Column<User>> = [
    {
      key: 'name',
      header: 'Name',
      sortValue: (row) => row.name,
      render: (row) => (
        <PersonCell
          name={row.name}
          subtitle={row.designation ?? (row.rollNo ? `Roll ${row.rollNo}` : ROLE_LABELS[row.role])}
          color={row.avatarColor}
        />
      ),
    },
    {
      key: 'email',
      header: 'Contact',
      sortValue: (row) => row.email,
      render: (row) => (
        <div className="text-xs">
          <p className="text-slate-700">{row.email}</p>
          <p className="text-slate-500">{row.phone ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortValue: (row) => row.role,
      render: (row) => <Badge className={ROLE_BADGE[row.role]}>{ROLE_LABELS[row.role]}</Badge>,
    },
    {
      key: 'class',
      header: 'Class / Child',
      render: (row) => {
        if (row.role === 'student') {
          return (
            <span className="text-xs text-slate-600">
              {classLabel(classes.find((item) => item.id === row.classId))}
            </span>
          );
        }
        if (row.role === 'parent') {
          return (
            <span className="text-xs text-slate-600">
              {(row.childIds ?? []).map((id) => userName(users, id)).join(', ') || '—'}
            </span>
          );
        }
        const classNames = (row.classIds ?? [])
          .map((id) => classes.find((item) => item.id === id)?.name)
          .filter(Boolean)
          .join(', ');
        return <span className="text-xs text-slate-600">{classNames || '—'}</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      render: (row) => <Badge tone={statusTone(row.status)}>{row.status === 'active' ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'joinedAt',
      header: 'Joined',
      sortValue: (row) => row.joinedAt,
      render: (row) => <span className="text-xs text-slate-600">{formatDate(row.joinedAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end">
          <Dropdown
            items={[
              {
                id: 'edit',
                label: canManage ? 'Edit user' : 'View details',
                icon: canManage ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />,
                onSelect: () => {
                  setEditing(row);
                  setFormOpen(true);
                },
              },
              {
                id: 'delete',
                label: 'Delete user',
                icon: <Trash2 className="h-4 w-4" />,
                danger: true,
                disabled: !canManage,
                dividerBefore: true,
                onSelect: () => setPendingDelete(row),
              },
            ]}
            trigger={({ toggle }) => (
              <IconButton label={`Actions for ${row.name}`} size="sm" variant="ghost" onClick={toggle}>
                <MoreHorizontal className="h-4 w-4" aria-hidden />
              </IconButton>
            )}
          />
        </div>
      ),
    },
  ];

  const counts = useMemo(
    () => ({
      teachers: users.filter((item) => item.role === 'teacher' || item.role === 'teacher_incharge').length,
      students: users.filter((item) => item.role === 'student').length,
      parents: users.filter((item) => item.role === 'parent').length,
      admins: users.filter((item) => item.role === 'admin' || item.role === 'super_admin').length,
    }),
    [users],
  );

  const openAddForm = () => {
    setEditing(null);
    setFormOpen(true);
  };
  return (
    <div>
      <PageHeader
        title="Users"
        description="Every person in the school — admins, principals, teachers, students and parents."
        icon={<Users className="h-5 w-5" aria-hidden />}
        actions={canManage ? <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openAddForm}>Add user</Button> : <Badge tone="neutral">View only</Badge>}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Admins</p>
            <p className="text-2xl font-semibold text-slate-900">{counts.admins}</p>
          </div>
          <UserPlus className="h-5 w-5 text-primary-500" aria-hidden />
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Teachers</p>
            <p className="text-2xl font-semibold text-slate-900">{counts.teachers}</p>
          </div>
          <Users className="h-5 w-5 text-emerald-500" aria-hidden />
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Students</p>
            <p className="text-2xl font-semibold text-slate-900">{counts.students}</p>
          </div>
          <Users className="h-5 w-5 text-amber-500" aria-hidden />
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Parents</p>
            <p className="text-2xl font-semibold text-slate-900">{counts.parents}</p>
          </div>
          <Users className="h-5 w-5 text-rose-500" aria-hidden />
        </Card>
      </div>

      <Card>
        <Tabs items={tabs} value={tab} onChange={(id) => setTab(id as TabId)} ariaLabel="User roles" />

        <div className="my-4 flex flex-wrap items-end gap-3">
          <SearchInput
            value={table.search}
            onChange={table.setSearch}
            placeholder="Search name, email or roll no."
            label="Search users"
          />
          <FilterSelect
            label="Status"
            value={status}
            onChange={(value) => setStatus(value as typeof status)}
            options={[
              { label: 'All statuses', value: 'all' },
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ]}
          />
        </div>

        <DataTable
          columns={columns}
          rows={paged.items}
          rowKey={(row) => row.id}
          loading={isLoading}
          emptyTitle={isError ? 'Could not load users' : 'No users match your filters'}
          emptyDescription={
            isError
              ? 'Something went wrong while loading the user list.'
              : 'Try a different search term, or add the first account for this role.'
          }
          emptyAction={
            isError ? (
              <Button variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
            ) : canManage ? (
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openAddForm}>
                Add user
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
      </Card>

      <UserFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        user={editing}
        lockedRole={tab === 'all' ? undefined : tab}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={`Delete ${pendingDelete?.name ?? 'user'}?`}
        description="They will be removed from every class and list."
        confirmLabel="Delete user"
        loading={deleteUser.isPending}
        onConfirm={async () => {
          if (!pendingDelete) return;
          const target = pendingDelete;
          try {
            await deleteUser.mutateAsync(target.id);
            toast.success('User deleted', `${target.name} was removed.`);
          } catch (error) {
            toast.error('Could not delete user', error instanceof Error ? error.message : undefined);
          } finally {
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );

}
