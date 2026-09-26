import type { Quiz, QuizSubmission } from '@/types';
import { dateOffset, toISODate } from '@/lib/utils';

/**
 * 2 published quizzes with real questions, plus student submissions.
 * Some submissions are still unmarked so the teacher marking screen has work to do.
 */

export const quizzes: Quiz[] = [
  {
    id: 'q-algebra',
    title: 'Algebra Basics Quiz',
    subjectId: 's-math',
    classId: 'c-10a',
    teacherId: 'u-t-priya',
    date: dateOffset(-2),
    durationMin: 30,
    totalMarks: 10,
    status: 'published',
    instructions: 'Attempt all 5 questions. Each question carries 2 marks.',
    questions: [
      {
        id: 'qq1',
        type: 'mcq',
        text: 'Solve for x:  2x + 6 = 18',
        options: ['4', '6', '8', '12'],
        answer: '6',
        marks: 2,
      },
      {
        id: 'qq2',
        type: 'mcq',
        text: 'Which of these is a polynomial?',
        options: ['1/x + 2', 'x² + 3x + 1', '√x + 5', '2/x'],
        answer: 'x² + 3x + 1',
        marks: 2,
      },
      {
        id: 'qq3',
        type: 'mcq',
        text: 'What is the degree of 4x³ + x?',
        options: ['1', '2', '3', '4'],
        answer: '3',
        marks: 2,
      },
      {
        id: 'qq4',
        type: 'mcq',
        text: 'Factorise:  x² − 9',
        options: ['(x−3)(x−3)', '(x+3)(x+3)', '(x−3)(x+3)', 'x(x−9)'],
        answer: '(x−3)(x+3)',
        marks: 2,
      },
      {
        id: 'qq5',
        type: 'short',
        text: 'If x = 3, what is the value of 5x − 4?',
        answer: '11',
        marks: 2,
      },
    ],
  },
  {
    id: 'q-plants',
    title: 'Plant Life Quiz',
    subjectId: 's-sci',
    classId: 'c-9a',
    teacherId: 'u-t-rakesh',
    date: dateOffset(-5),
    durationMin: 20,
    totalMarks: 8,
    status: 'closed',
    instructions: 'Choose the best answer. One short question carries 2 marks.',
    questions: [
      {
        id: 'pq1',
        type: 'mcq',
        text: 'Which part of the plant makes food?',
        options: ['Root', 'Leaf', 'Stem', 'Flower'],
        answer: 'Leaf',
        marks: 2,
      },
      {
        id: 'pq2',
        type: 'mcq',
        text: 'Which gas do plants take in during photosynthesis?',
        options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'],
        answer: 'Carbon dioxide',
        marks: 2,
      },
      {
        id: 'pq3',
        type: 'mcq',
        text: 'Roots mainly help the plant to…',
        options: ['Make food', 'Absorb water', 'Attract bees', 'Store sunlight'],
        answer: 'Absorb water',
        marks: 2,
      },
      {
        id: 'pq4',
        type: 'short',
        text: 'Name the green pigment present in leaves.',
        answer: 'chlorophyll',
        marks: 2,
      },
    ],
  },
];

export const quizSubmissions: QuizSubmission[] = [
  // ---- Algebra Basics Quiz (Class 10A)
  {
    id: 'qs-01',
    quizId: 'q-algebra',
    studentId: 'u-s-01',
    answers: {
      qq1: '6',
      qq2: 'x² + 3x + 1',
      qq3: '3',
      qq4: '(x−3)(x+3)',
      qq5: '11',
    },
    submittedAt: `${dateOffset(-2)}T09:35:00`,
    score: 10,
    feedback: 'Perfect! Keep it up.',
  },
  {
    id: 'qs-02',
    quizId: 'q-algebra',
    studentId: 'u-s-02',
    answers: {
      qq1: '6',
      qq2: '1/x + 2',
      qq3: '3',
      qq4: '(x−3)(x+3)',
      qq5: '11',
    },
    submittedAt: `${dateOffset(-2)}T09:40:00`,
    score: 8,
    feedback: 'Revise polynomial definitions.',
  },
  {
    id: 'qs-03',
    quizId: 'q-algebra',
    studentId: 'u-s-03',
    answers: {
      qq1: '8',
      qq2: 'x² + 3x + 1',
      qq3: '3',
      qq4: '(x−3)(x−3)',
      qq5: '12',
    },
    submittedAt: `${dateOffset(-2)}T09:44:00`,
    score: null,
  },
  {
    id: 'qs-04',
    quizId: 'q-algebra',
    studentId: 'u-s-04',
    answers: {
      qq1: '6',
      qq2: 'x² + 3x + 1',
      qq3: '2',
      qq4: '(x−3)(x+3)',
      qq5: '11',
    },
    submittedAt: `${dateOffset(-2)}T09:50:00`,
    score: null,
  },

  // ---- Plant Life Quiz (Class 9A)
  {
    id: 'qs-05',
    quizId: 'q-plants',
    studentId: 'u-s-05',
    answers: {
      pq1: 'Leaf',
      pq2: 'Carbon dioxide',
      pq3: 'Absorb water',
      pq4: 'chlorophyll',
    },
    submittedAt: `${dateOffset(-5)}T10:15:00`,
    score: null,
  },
  {
    id: 'qs-06',
    quizId: 'q-plants',
    studentId: 'u-s-06',
    answers: {
      pq1: 'Leaf',
      pq2: 'Carbon dioxide',
      pq3: 'Make food',
      pq4: 'chlorophyll',
    },
    submittedAt: `${dateOffset(-5)}T10:18:00`,
    score: null,
  },
];

/** Today's date — handy for "quiz scheduled today" filters. */
export const TODAY = toISODate(new Date());
