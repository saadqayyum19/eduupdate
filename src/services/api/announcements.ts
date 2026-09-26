import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Announcement, Role } from '@/types';
import { http } from '../http';

export const announcementKeys = {
  all: ['announcements'] as const,
  list: () => [...announcementKeys.all, 'list'] as const,
};

export interface AnnouncementInput {
  title: string;
  body: string;
  audience: Role[] | 'all';
  classIds?: string[];
  priority: Announcement['priority'];
  pinned?: boolean;
}

interface RawAnnouncement extends Omit<Announcement, 'audience'> {
  audience: string[];
}

/** The API stores "everyone" as `['all']`; the UI works with the `'all'` sentinel. */
function toAnnouncement(raw: RawAnnouncement): Announcement {
  return {
    ...raw,
    audience: raw.audience.includes('all') || raw.audience.length === 0 ? 'all' : (raw.audience as Role[]),
  };
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const { data } = await http.get<{ items: RawAnnouncement[] }>('/announcements', { params: { pageSize: 200 } });
  return data.items.map(toAnnouncement);
}

export async function createAnnouncement(input: AnnouncementInput): Promise<Announcement> {
  const { data } = await http.post<{ announcement: RawAnnouncement }>('/announcements', input);
  return toAnnouncement(data.announcement);
}

export async function updateAnnouncement(id: string, input: Partial<AnnouncementInput>): Promise<Announcement> {
  const { data } = await http.patch<{ announcement: RawAnnouncement }>(`/announcements/${id}`, input);
  return toAnnouncement(data.announcement);
}

export async function deleteAnnouncement(id: string): Promise<{ id: string }> {
  await http.delete(`/announcements/${id}`);
  return { id };
}

// ---------------------------------------------------------------------------- hooks

export function useAnnouncements() {
  return useQuery({ queryKey: announcementKeys.list(), queryFn: fetchAnnouncements });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
