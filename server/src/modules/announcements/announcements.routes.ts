import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../lib/ApiError';
import { asyncHandler } from '../../lib/asyncHandler';
import { combineFilters, paginate, searchOr, skipOf } from '../../lib/pagination';
import { serialiseList, serialiseOne } from '../../lib/serialise';
import { authenticate } from '../../middleware/auth';
import { requireCapability } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { Announcement } from '../../models/Announcement';
import { announcementQuerySchema, announcementSchema, announcementUpdateSchema } from './announcements.schema';

const idParam = z.object({ id: z.string().min(8) });

interface Query {
  page: number;
  pageSize: number;
  search?: string;
  priority?: string;
}

/** Everyone sees the notices addressed to their role — targeting is enforced here. */
const listAnnouncements = asyncHandler(async (req, res) => {
  const query = req.query as never as Query;
  const role = req.user!.role;
  const search = searchOr(['title', 'body'], query.search);

  const filters = combineFilters(
    { $or: [{ audience: 'all' }, { audience: role }, { audience: { $size: 0 } }] },
    query.priority ? { priority: query.priority } : undefined,
    search ? { $or: search } : undefined,
  );

  const [items, total] = await Promise.all([
    Announcement.find(filters)
      .sort({ pinned: -1, createdAt: -1 })
      .skip(skipOf(query as never))
      .limit(query.pageSize)
      .lean(),
    Announcement.countDocuments(filters),
  ]);

  res.json(paginate(serialiseList(items), total, query as never));
});

const createAnnouncement = asyncHandler(async (req, res) => {
  const input = req.body as { audience: 'all' | string[]; title: string };
  const announcement = await Announcement.create({
    ...input,
    authorId: req.user!.id,
    audience: input.audience === 'all' ? ['all'] : input.audience,
  });
  res.status(201).json({ announcement: serialiseOne(announcement.toObject()) });
});

const updateAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) throw ApiError.notFound('That announcement could not be found.');

  const input = req.body as Record<string, unknown> & { audience?: 'all' | string[] };
  if (input.audience !== undefined) {
    announcement.audience = input.audience === 'all' ? ['all'] : (input.audience as string[]);
    delete input.audience;
  }

  Object.assign(announcement, input);
  await announcement.save();
  res.json({ announcement: serialiseOne(announcement.toObject()) });
});

const deleteAnnouncement = asyncHandler(async (req, res) => {
  const removed = await Announcement.deleteOne({ _id: req.params.id });
  if (!removed.deletedCount) throw ApiError.notFound('That announcement could not be found.');
  res.status(204).send();
});

export const announcementsRouter = Router();

announcementsRouter.use(authenticate);
announcementsRouter.get('/', requireCapability('announcements.view'), validate({ query: announcementQuerySchema }), listAnnouncements);
announcementsRouter.post('/', requireCapability('announcements.manage'), validate({ body: announcementSchema }), createAnnouncement);
announcementsRouter.patch(
  '/:id',
  requireCapability('announcements.manage'),
  validate({ params: idParam, body: announcementUpdateSchema }),
  updateAnnouncement,
);
announcementsRouter.delete('/:id', requireCapability('announcements.manage'), validate({ params: idParam }), deleteAnnouncement);
