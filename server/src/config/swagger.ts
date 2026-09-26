import SwaggerJSDoc from 'swagger-jsdoc';

const options: SwaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'EduCore Lite API',
      version: '1.0.0',
      description:
        'School / College / University management API. All responses use the envelope ' +
        '`{ success, data, message, error }`. Authenticate via `POST /api/v1/auth/login` — ' +
        'the JWT is returned in the body and as httpOnly cookies.',
      license: { name: 'MIT' },
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Local' },
      { url: '/api/v1', description: 'Relative' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'access_token' },
      },
      schemas: {
        Envelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { nullable: true },
            message: { type: 'string' },
            error: { nullable: true, type: 'string' },
          },
        },
        Paginated: {
          type: 'object',
          properties: {
            items: { type: 'array', items: {} },
            total: { type: 'integer' },
            page: { type: 'integer' },
            pageSize: { type: 'integer' },
            pageCount: { type: 'integer' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }, { cookieAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Login, refresh, logout, session' },
      { name: 'Institutions', description: 'Super Admin control panel' },
      { name: 'Resources', description: 'Users, programs, classes, subjects, timetable, announcements, assignments' },
      { name: 'Attendance', description: 'Daily / monthly / subject-wise attendance' },
      { name: 'Marks', description: 'Mark entry, results, GPA/CGPA' },
      { name: 'Fees', description: 'Structures, invoices, payments' },
      { name: 'Quizzes', description: 'Quizzes, attempts, marking' },
      { name: 'Search', description: 'Role-scoped global search' },
      { name: 'Analytics', description: 'Dashboards and workload' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = SwaggerJSDoc(options);
