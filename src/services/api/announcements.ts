import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Announcement, Role } from '@/types';
import { getDb, mockDelay, nextId } from '../mockDb';

export const announcementKeys = {
  all: ['announcements'] as const,
  list: (role?: Role) => [...announcementKeys.all, 'list', role ?? 'all'] as const,
};

export interface AnnouncementInput {
  title: string;
  body: string;
  audience: Role[] | 'all';
  priority: Announcement['priority'];
  pinned?: boolean;
  authorId: string;
}

export async function fetchAnnouncements(role?: Role): Promise<Announcement[]> {
  await mockDelay();
  return getDb()
    .announcements.filter((item) =>
      role && item.audience !== 'all' ? item.audience.includes(role) : true,
    )
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
}

export async function createAnnouncement(input: AnnouncementInput): Promise<Announcement> {
  await mockDelay(350);
  const announcement: Announcement = {
    ...input,
    id: nextId('an'),
    createdAt: new Date().toISOString(),
  };
  getDb().announcements.unshift(announcement);
  return announcement;
}

export async function updateAnnouncement(
  id: string,
  input: Partial<AnnouncementInput>,
): Promise<Announcement> {
  await mockDelay(300);
  const items = getDb().announcements;
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) throw new Error('That announcement could not be found.');
  items[index] = { ...items[index], ...input };
  return items[index];
}

export async function deleteAnnouncement(id: string): Promise<{ id: string }> {
  await mockDelay(300);
  const db = getDb();
  db.announcements = db.announcements.filter((item) => item.id !== id);
  return { id };
}

// ---------------------------------------------------------------------------- hooks

export function useAnnouncements(role?: Role) {
  return useQuery({ queryKey: announcementKeys.list(role), queryFn: () => fetchAnnouncements(role) });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: announcementKeys.all }),
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AnnouncementInput> }) =>
      updateAnnouncement(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: announcementKeys.all }),
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: announcementKeys.all }),
  });
}
