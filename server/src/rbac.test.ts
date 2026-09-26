import { can, capabilitiesFor, type Role } from './rbac';

describe('RBAC capability map', () => {
  it('denies missing roles and capabilities', () => {
    expect(can(null, 'users.manage')).toBe(false);
    expect(can('student', 'users.manage')).toBe(false);
    expect(can('parent', 'fees.manage')).toBe(false);
  });

  it('grants platform and self-service capabilities to the intended roles', () => {
    expect(can('super_admin', 'institutions.manage')).toBe(true);
    expect(can('student', 'results.viewOwn')).toBe(true);
    expect(can('parent', 'fees.viewOwn')).toBe(true);
    expect(can('teacher', 'attendance.take')).toBe(true);
    expect(can('teacher', 'users.manage')).toBe(false);
  });

  it('returns a copy of a role capability list', () => {
    const role: Role = 'student';
    const capabilities = capabilitiesFor(role);
    capabilities.push('users.manage');

    expect(can(role, 'users.manage')).toBe(false);
  });
});