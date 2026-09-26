import type { Announcement } from '@/types';

/**
 * Seed announcements dated relative to "now" so the notice board always shows
 * realistic "x days ago" timestamps instead of stale absolute dates (B-19).
 */
function isoDaysAgo(days: number, hour: number, minute: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export const announcements: Announcement[] = [
  {
    id: 'an-01',
    title: 'Half-yearly exams start 12 next month',
    body: 'The half-yearly examination begins on the 12th. Please collect the timetable from your class incharge. Students must carry their admit card and reach the hall 15 minutes early.',
    audience: 'all',
    authorId: 'u-principal',
    createdAt: isoDaysAgo(1, 9, 15),
    priority: 'high',
    pinned: true,
  },
  {
    id: 'an-02',
    title: 'Unit test 2 marks uploaded',
    body: 'Marks for Unit Test 2 have been added to the Marks & Results section. Parents can view subject-wise performance from their dashboard.',
    audience: ['student', 'parent', 'teacher', 'teacher_incharge'],
    authorId: 'u-admin',
    createdAt: isoDaysAgo(3, 14, 40),
    priority: 'normal',
  },
  {
    id: 'an-03',
    title: 'Staff meeting — Friday 3:30 PM',
    body: 'All teaching staff must attend the review meeting in the conference hall. Agenda: exam preparation, attendance follow-up and the annual day plan.',
    audience: ['teacher', 'teacher_incharge', 'principal', 'admin'],
    authorId: 'u-principal',
    createdAt: isoDaysAgo(5, 11, 5),
    priority: 'normal',
  },
  {
    id: 'an-04',
    title: 'Fee payment reminder',
    body: 'Transport fee for the current month is due on the 5th. Kindly pay at the accounts desk or online to avoid a late fee of ₹100.',
    audience: ['parent'],
    authorId: 'u-admin',
    createdAt: isoDaysAgo(8, 8, 30),
    priority: 'high',
  },
  {
    id: 'an-05',
    title: 'Annual sports day — volunteers needed',
    body: 'Sports day is on the 28th. Students interested in participating should give their names to the class incharge before the 20th.',
    audience: 'all',
    authorId: 'u-admin',
    createdAt: isoDaysAgo(12, 10, 0),
    priority: 'normal',
  },
];
