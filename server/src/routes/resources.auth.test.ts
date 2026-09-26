import request from 'supertest';
import { createApp } from '../app';
import { Attendance } from '../models/Attendance';
import { Assignment, AssignmentSubmission } from '../models/Assignment';
import { ClassRoom } from '../models/ClassRoom';
import { Institution } from '../models/Institution';
import { FeeInvoice } from '../models/Fee';
import { RefreshToken } from '../models/AuditLog';
import { Mark } from '../models/Mark';
import { Subject } from '../models/Subject';
import { User } from '../models/User';
import { signAccessToken } from '../services/tokens';

describe('resource write authorization', () => {
  it('denies class writes to a teacher with view-only class access', async () => {
    const token = signAccessToken({ sub: 'teacher-id', role: 'teacher', inst: 'institution-id' });

    await request(createApp())
      .post('/api/v1/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Unauthorized class' })
      .expect(403)
      .expect(({ body }) => {
        expect(body.error).toBe('FORBIDDEN');
      });
  });

  it('blocks an institution route when its feature is disabled', async () => {
    const lookup = jest.spyOn(Institution, 'findById').mockReturnValue({
      lean: async () => ({ active: true, features: { attendance: false } }),
    } as never);
    const token = signAccessToken({ sub: 'admin-id', role: 'admin', inst: 'institution-id' });

    try {
      await request(createApp())
        .get('/api/v1/attendance')
        .set('Authorization', `Bearer ${token}`)
        .expect(403)
        .expect(({ body }) => {
          expect(body.error).toBe('FEATURE_DISABLED');
        });
    } finally {
      lookup.mockRestore();
    }
  });

  it('rejects CSV admission rows missing both identity numbers', async () => {
    const token = signAccessToken({ sub: 'admin-id', role: 'admin', inst: 'institution-id' });
    const csv = [
      'name,email,password,classId,rollNo,registrationNo,fatherName,cnic,bform,dob,address,photoUrl',
      'Test Student,test@student.test,temporary-pass,507f1f77bcf86cd799439011,10A-01,REG-001,Test Father,,,2008-01-01,Gujranwala,',
    ].join('\n');

    await request(createApp())
      .post('/api/v1/users/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(csv), { filename: 'students.csv', contentType: 'text/csv' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toContain('CSV row 2');
        expect(body.error).toBe('BAD_REQUEST');
      });
  });

  it('adds the caller institution to attendance queries', async () => {
    const institutionLookup = jest.spyOn(Institution, 'findById').mockReturnValue({
      lean: async () => ({ active: true, features: { attendance: true } }),
    } as never);
    const query = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    };
    const attendanceQuery = jest.spyOn(Attendance, 'find').mockReturnValue(query as never);
    const count = jest.spyOn(Attendance, 'countDocuments').mockReturnValue(Promise.resolve(0) as never);
    const token = signAccessToken({ sub: 'admin-id', role: 'admin', inst: 'institution-id' });

    try {
      await request(createApp())
        .get('/api/v1/attendance?classId=class-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(attendanceQuery).toHaveBeenCalledWith(expect.objectContaining({
        institutionId: 'institution-id',
        classId: 'class-id',
      }));
    } finally {
      institutionLookup.mockRestore();
      attendanceQuery.mockRestore();
      count.mockRestore();
    }
  });

  it('forces students to read only their own attendance', async () => {
    const institutionLookup = jest.spyOn(Institution, 'findById').mockReturnValue({
      lean: async () => ({ active: true, features: { attendance: true } }),
    } as never);
    const query = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    };
    const attendanceQuery = jest.spyOn(Attendance, 'find').mockReturnValue(query as never);
    const count = jest.spyOn(Attendance, 'countDocuments').mockReturnValue(Promise.resolve(0) as never);
    const token = signAccessToken({ sub: 'student-id', role: 'student', inst: 'institution-id' });

    try {
      await request(createApp())
        .get('/api/v1/attendance?studentId=another-student')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(attendanceQuery).toHaveBeenCalledWith(expect.objectContaining({
        institutionId: 'institution-id',
        studentId: 'student-id',
      }));
    } finally {
      institutionLookup.mockRestore();
      attendanceQuery.mockRestore();
      count.mockRestore();
    }
  });

  it('forces students to read only their own institution-scoped marks', async () => {
    const institutionLookup = jest.spyOn(Institution, 'findById').mockReturnValue({
      lean: async () => ({ active: true, features: { marks: true } }),
    } as never);
    const query = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    };
    const markQuery = jest.spyOn(Mark, 'find').mockReturnValue(query as never);
    const count = jest.spyOn(Mark, 'countDocuments').mockReturnValue(Promise.resolve(0) as never);
    const token = signAccessToken({ sub: 'student-id', role: 'student', inst: 'institution-id' });

    try {
      await request(createApp())
        .get('/api/v1/marks?studentId=another-student')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(markQuery).toHaveBeenCalledWith(expect.objectContaining({
        institutionId: 'institution-id',
        studentId: 'student-id',
      }));
    } finally {
      institutionLookup.mockRestore();
      markQuery.mockRestore();
      count.mockRestore();
    }
  });

  it('denies teachers mark entry for classes they do not teach', async () => {
    const institutionLookup = jest.spyOn(Institution, 'findById').mockReturnValue({
      lean: async () => ({ active: true, features: { marks: true } }),
    } as never);
    const classLookup = jest.spyOn(ClassRoom, 'findOne').mockReturnValue({
      lean: async () => ({ institutionId: 'institution-id', teacherIds: [], subjectIds: ['subject-id'] }),
    } as never);
    const token = signAccessToken({ sub: 'teacher-id', role: 'teacher', inst: 'institution-id' });

    try {
      await request(createApp())
        .post('/api/v1/marks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          classId: '507f1f77bcf86cd799439011',
          studentId: '507f1f77bcf86cd799439012',
          subjectId: 'subject-id',
          examType: 'sessional',
          score: 80,
          total: 100,
          date: '2026-09-26',
        })
        .expect(403)
        .expect(({ body }) => {
          expect(body.error).toBe('FORBIDDEN');
        });
    } finally {
      institutionLookup.mockRestore();
      classLookup.mockRestore();
    }
  });

  it('returns a PDF result card for a student', async () => {
    const institutionLookup = jest.spyOn(Institution, 'findById').mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: async () => ({ name: 'Technical Institute', active: true, features: { marks: true } }),
    } as never);
    const studentLookup = jest.spyOn(User, 'findOne').mockReturnValue({
      lean: async () => ({
        _id: 'student-id',
        name: 'Test Student',
        rollNo: 'CIT-01',
        registrationNo: 'REG-001',
        classId: 'class-id',
      }),
    } as never);
    const markQuery = jest.spyOn(Mark, 'find').mockReturnValue({
      lean: async () => [{
        subjectId: 'subject-id',
        examType: 'sessional',
        score: 80,
        total: 100,
      }],
    } as never);
    const subjectQuery = jest.spyOn(Subject, 'find').mockReturnValue({
      lean: async () => [{ _id: 'subject-id', name: 'Mathematics', creditHours: 3 }],
    } as never);
    const token = signAccessToken({ sub: 'student-id', role: 'student', inst: 'institution-id' });

    try {
      const response = await request(createApp())
        .get('/api/v1/marks/result/pdf')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect('Content-Type', /application\/pdf/);
      expect(response.body.toString('ascii', 0, 4)).toBe('%PDF');
    } finally {
      institutionLookup.mockRestore();
      studentLookup.mockRestore();
      markQuery.mockRestore();
      subjectQuery.mockRestore();
    }
  });

  it('limits parent invoice queries to linked children and their institution', async () => {
    const institutionLookup = jest.spyOn(Institution, 'findById').mockReturnValue({
      lean: async () => ({ active: true, features: { fees: true } }),
    } as never);
    const parentLookup = jest.spyOn(User, 'findById').mockReturnValue({
      lean: async () => ({ childIds: ['child-id'] }),
    } as never);
    const query = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    };
    const invoiceQuery = jest.spyOn(FeeInvoice, 'find').mockReturnValue(query as never);
    const count = jest.spyOn(FeeInvoice, 'countDocuments').mockReturnValue(Promise.resolve(0) as never);
    const token = signAccessToken({ sub: 'parent-id', role: 'parent', inst: 'institution-id' });

    try {
      await request(createApp())
        .get('/api/v1/fees/invoices?studentId=unrelated-student')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(invoiceQuery).toHaveBeenCalledWith(expect.objectContaining({
        institutionId: 'institution-id',
        studentId: { $in: ['child-id'] },
      }));
    } finally {
      institutionLookup.mockRestore();
      parentLookup.mockRestore();
      invoiceQuery.mockRestore();
      count.mockRestore();
    }
  });

  it('creates assignment submissions for the authenticated student only', async () => {
    const institutionLookup = jest.spyOn(Institution, 'findById').mockReturnValue({
      lean: async () => ({ active: true, features: { assignments: true } }),
    } as never);
    const studentQuery = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ classId: 'class-id' }),
    };
    const studentLookup = jest.spyOn(User, 'findOne').mockReturnValue(studentQuery as never);
    const assignmentQuery = {
      lean: jest.fn().mockResolvedValue({
        _id: 'assignment-id',
        institutionId: 'institution-id',
        dueDate: '2099-01-01',
      }),
    };
    const assignmentLookup = jest.spyOn(Assignment, 'findOne').mockReturnValue(assignmentQuery as never);
    const submissionCreate = jest.spyOn(AssignmentSubmission, 'create').mockResolvedValue({
      _id: 'submission-id',
      studentId: 'student-id',
    } as never);
    const token = signAccessToken({ sub: 'student-id', role: 'student', inst: 'institution-id' });

    try {
      await request(createApp())
        .post('/api/v1/assignment-submissions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          assignmentId: '507f1f77bcf86cd799439011',
          content: 'Completed work',
          studentId: 'another-student',
        })
        .expect(201);
      expect(submissionCreate).toHaveBeenCalledWith(expect.objectContaining({
        institutionId: 'institution-id',
        studentId: 'student-id',
      }));
    } finally {
      institutionLookup.mockRestore();
      studentLookup.mockRestore();
      assignmentLookup.mockRestore();
      submissionCreate.mockRestore();
    }
  });

  it('prevents institution admins from creating Super Admin accounts', async () => {
    const token = signAccessToken({ sub: 'admin-id', role: 'admin', inst: 'institution-id' });

    await request(createApp())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Escalated User',
        email: 'escalated@example.test',
        password: 'temporary-password',
        role: 'super_admin',
      })
      .expect(403)
      .expect(({ body }) => {
        expect(body.error).toBe('FORBIDDEN');
      });
  });

  it('prevents institution admins from promoting an existing user to Super Admin', async () => {
    const token = signAccessToken({ sub: 'admin-id', role: 'admin', inst: 'institution-id' });

    await request(createApp())
      .patch('/api/v1/users/target-user')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'super_admin' })
      .expect(403)
      .expect(({ body }) => {
        expect(body.error).toBe('FORBIDDEN');
      });
  });

  it('returns actual role and active-session counts to the Super Admin', async () => {
    const institutionCount = jest.spyOn(Institution, 'countDocuments').mockImplementation((filter) => {
      const type = (filter as { type?: string } | undefined)?.type;
      return Promise.resolve(type === 'school' ? 2 : type === 'college' ? 1 : type === 'university' ? 3 : 6) as never;
    });
    const userCount = jest.spyOn(User, 'countDocuments').mockReturnValue(Promise.resolve(55) as never);
    const roleCounts = jest.spyOn(User, 'aggregate').mockReturnValue(Promise.resolve([
      { _id: 'student', count: 40 },
      { _id: 'teacher', count: 12 },
      { _id: 'admin', count: 3 },
    ]) as never);
    const activeSessionCount = jest.spyOn(RefreshToken, 'countDocuments').mockReturnValue(Promise.resolve(7) as never);
    const token = signAccessToken({ sub: 'super-id', role: 'super_admin', inst: null });

    try {
      const response = await request(createApp())
        .get('/api/v1/institutions/meta/global-stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.data).toMatchObject({
        totalInstitutions: 6,
        totalUsers: 55,
        activeSessions: 7,
        byType: { school: 2, college: 1, university: 3 },
        byRole: { student: 40, teacher: 12, admin: 3 },
      });
    } finally {
      institutionCount.mockRestore();
      userCount.mockRestore();
      roleCounts.mockRestore();
      activeSessionCount.mockRestore();
    }
  });

  it('allows a teacher to see only their own assigned workload', async () => {
    const institutionLookup = jest.spyOn(Institution, 'findById').mockReturnValue({
      lean: async () => ({ active: true, features: { analytics: true } }),
    } as never);
    const teacherQuery = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ classIds: ['class-id'] }),
    };
    const currentTeacher = jest.spyOn(User, 'findById').mockReturnValue(teacherQuery as never);
    const classQuery = {
      lean: jest.fn().mockResolvedValue([{
        _id: 'class-id',
        teacherIds: ['teacher-id'],
        inchargeId: 'teacher-id',
      }]),
    };
    const classLookup = jest.spyOn(ClassRoom, 'find').mockReturnValue(classQuery as never);
    const teachersQuery = {
      lean: jest.fn().mockResolvedValue([{
        _id: 'teacher-id',
        name: 'Teacher One',
        classIds: ['class-id'],
        subjectIds: ['subject-id'],
      }]),
    };
    const teacherList = jest.spyOn(User, 'find').mockReturnValue(teachersQuery as never);
    const token = signAccessToken({ sub: 'teacher-id', role: 'teacher', inst: 'institution-id' });

    try {
      const response = await request(createApp())
        .get('/api/v1/analytics/workload')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.data.teachers).toHaveLength(1);
      expect(teacherList).toHaveBeenCalledWith(expect.objectContaining({
        _id: { $in: ['teacher-id'] },
      }));
    } finally {
      institutionLookup.mockRestore();
      currentTeacher.mockRestore();
      classLookup.mockRestore();
      teacherList.mockRestore();
    }
  });

  it('generates an institution-branded student ID card PDF', async () => {
    const institutionQuery = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        name: 'Technical Institute',
        primaryColor: '#2563eb',
        academicYear: '2025-2026',
        active: true,
        features: { reports: true },
      }),
    };
    const institutionLookup = jest.spyOn(Institution, 'findById').mockReturnValue(institutionQuery as never);
    const studentQuery = {
      lean: jest.fn().mockResolvedValue({
        _id: 'student-id',
        institutionId: 'institution-id',
        name: 'Test Student',
        fatherName: 'Test Father',
        rollNo: 'CIT-01',
        registrationNo: 'REG-001',
        classId: 'class-id',
      }),
    };
    const studentLookup = jest.spyOn(User, 'findOne').mockReturnValue(studentQuery as never);
    const classQuery = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ name: 'DAE CIT Year 1', section: 'A' }),
    };
    const classLookup = jest.spyOn(ClassRoom, 'findOne').mockReturnValue(classQuery as never);
    const token = signAccessToken({ sub: 'student-id', role: 'student', inst: 'institution-id' });

    try {
      const response = await request(createApp())
        .get('/api/v1/documents/students/student-id/id-card')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect('Content-Type', /application\/pdf/);
      expect(response.body.toString('ascii', 0, 4)).toBe('%PDF');
    } finally {
      institutionLookup.mockRestore();
      studentLookup.mockRestore();
      classLookup.mockRestore();
    }
  });

  it('generates a certificate PDF for an authorized principal', async () => {
    const institutionQuery = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        name: 'Technical Institute',
        primaryColor: '#2563eb',
        active: true,
        features: { reports: true },
      }),
    };
    const institutionLookup = jest.spyOn(Institution, 'findById').mockReturnValue(institutionQuery as never);
    const studentQuery = {
      lean: jest.fn().mockResolvedValue({
        _id: 'student-id',
        institutionId: 'institution-id',
        name: 'Test Student',
        registrationNo: 'REG-001',
        classId: 'class-id',
      }),
    };
    const studentLookup = jest.spyOn(User, 'findOne').mockReturnValue(studentQuery as never);
    const classQuery = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ name: 'DAE CIT Year 1', section: 'A' }),
    };
    const classLookup = jest.spyOn(ClassRoom, 'findOne').mockReturnValue(classQuery as never);
    const token = signAccessToken({ sub: 'principal-id', role: 'principal', inst: 'institution-id' });

    try {
      const response = await request(createApp())
        .get('/api/v1/documents/students/student-id/certificate?title=Completion')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect('Content-Type', /application\/pdf/);
      expect(response.body.toString('ascii', 0, 4)).toBe('%PDF');
    } finally {
      institutionLookup.mockRestore();
      studentLookup.mockRestore();
      classLookup.mockRestore();
    }
  });
});