/**
 * Grading helpers — shared by the marks routes, results/report cards and seed.
 *
 * Weighting: sessional 40%, mid 20%, final 40% of the subject total.
 * GPA uses the standard 4.0 scale used by Pakistani institutions.
 */

export interface SubjectComponents {
  sessional: number; // obtained
  midterm: number;
  final: number;
  sessionalTotal: number;
  midtermTotal: number;
  finalTotal: number;
}

/** Combine components into a percentage for one subject. */
export function subjectPercentage(c: SubjectComponents): number {
  const obtained = c.sessional + c.midterm + c.final;
  const total = c.sessionalTotal + c.midtermTotal + c.finalTotal;
  if (!total) return 0;
  return Math.round((obtained / total) * 1000) / 10;
}

/** Letter grade from percentage (A+ … F). */
export function gradeFor(percent: number): string {
  if (percent >= 90) return 'A+';
  if (percent >= 80) return 'A';
  if (percent >= 70) return 'B';
  if (percent >= 60) return 'C';
  if (percent >= 50) return 'D';
  if (percent >= 40) return 'E';
  return 'F';
}

/** Grade point (4.0 scale) from percentage. */
export function gradePoint(percent: number): number {
  if (percent >= 85) return 4.0;
  if (percent >= 80) return 3.7;
  if (percent >= 75) return 3.3;
  if (percent >= 70) return 3.0;
  if (percent >= 65) return 2.7;
  if (percent >= 60) return 2.3;
  if (percent >= 55) return 2.0;
  if (percent >= 50) return 1.7;
  if (percent >= 45) return 1.3;
  if (percent >= 40) return 1.0;
  return 0.0;
}

export interface SubjectResult {
  subjectId: string;
  obtained: number;
  total: number;
  percentage: number;
  grade: string;
  gradePoint: number;
  creditHours: number;
}

/** CGPA — credit-hour weighted average of grade points. */
export function cgpa(results: SubjectResult[]): number {
  const graded = results.filter((r) => r.creditHours > 0);
  const weight = graded.reduce((sum, r) => sum + r.creditHours, 0);
  if (!weight) {
    // Fall back to a simple average when credit hours are not configured.
    if (!results.length) return 0;
    return Math.round((results.reduce((sum, r) => sum + r.gradePoint, 0) / results.length) * 100) / 100;
  }
  const points = graded.reduce((sum, r) => sum + r.gradePoint * r.creditHours, 0);
  return Math.round((points / weight) * 100) / 100;
}
