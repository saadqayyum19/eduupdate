import { z } from 'zod';

export const announcementSchema = z.object({
  title: z.string().trim().min(2, 'Enter a title').max(180),
  body: z.string().trim().min(2, 'Write the announcement').max(8000),
  audience: z.union([z.literal('all'), z.array(z.string())]).default('all'),
  classIds: z.array(z.string()).default([]),
  priority: z.enum(['normal', 'high']).default('normal'),
  pinned: z.boolean().default(false),
});

export const announcementUpdateSchema = announcementSchema.partial();

export const announcementQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().max(160).optional(),
  priority: z.enum(['normal', 'high']).optional(),
});

export type AnnouncementInput = z.infer<typeof announcementSchema>;
