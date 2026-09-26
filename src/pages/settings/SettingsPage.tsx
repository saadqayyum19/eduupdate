import { useState } from 'react';
import { BookOpen, ClipboardCheck, Download, Globe2, Receipt, Save } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useSettings, useUpdateFeatures, useUpdateSettings, downloadBackup, wipeAllData } from '@/services/api';
import { ACADEMIC_TERMS, CURRENCIES, DEFAULT_GRADE_BANDS, TIMEZONES, type GradeBand } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { SkeletonText } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { INSTITUTION_FEATURES, type InstitutionFeature } from '@/services/institutionFeatures';

const FEATURE_LABELS: Record<InstitutionFeature, string> = {
  fees: 'Fees & invoices', attendance: 'Attendance', timetable: 'Timetable', marks: 'Marks & results',
  quizzes: 'Quizzes & tests', assignments: 'Assignments', exams: 'Exams', announcements: 'Announcements',
  reports: 'Reports', analytics: 'Analytics', library: 'Library', transport: 'Transport',
  hostel: 'Hostel', chat: 'Messaging',
};

/** System settings: profile, academics, grading, fees, attendance rules, modules, backup. */
export default function SettingsPage() {
  const { can } = usePermissions();
  const toast = useToast();
  const allowed = can('settings.manage');
  const { data: settings, isLoading } = useSettings(allowed);
  const updateSettings = useUpdateSettings();
  const updateFeatures = useUpdateFeatures();

  const [tab, setTab] = useState('institution');
  const [bands, setBands] = useState<GradeBand[] | null>(null);

  if (!allowed) return null;

  if (isLoading || !settings) {
    return (
      <div>
        <PageHeader title="System settings" description="Loading your institution configuration…" />
        <Card className="p-5">
          <SkeletonText lines={6} />
        </Card>
      </div>
    );
  }

  const gradeBands = bands ?? (settings.gradeBands.length ? settings.gradeBands : DEFAULT_GRADE_BANDS);

  const save = async (patch: Record<string, unknown>, message = 'Settings saved') => {
    try {
      await updateSettings.mutateAsync(patch);
      toast.success(message);
    } catch (caught) {
      toast.error('Could not save', caught instanceof Error ? caught.message : undefined);
    }
  };

  return (
    <div>
      <PageHeader
        title="System settings"
        description="Every module reads its defaults from here — nothing is hard-coded."
        icon={<Globe2 className="h-5 w-5" />}
        crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'System settings' }]}
      />

      <Tabs
        ariaLabel="Settings sections"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'institution', label: 'Institution', icon: <Globe2 className="h-4 w-4" /> },
          { id: 'academics', label: 'Academics & grading', icon: <BookOpen className="h-4 w-4" /> },
          { id: 'rules', label: 'Fees & attendance', icon: <Receipt className="h-4 w-4" /> },
          { id: 'features', label: 'Modules', icon: <ClipboardCheck className="h-4 w-4" /> },
          { id: 'data', label: 'Backup & data', icon: <Download className="h-4 w-4" /> },
        ]}
        className="mb-5"
      />

      {tab === 'institution' && (
        <Card>
          <CardHeader title="Institution profile" subtitle="Appears on invoices, receipts and result cards." />
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              void save({
                institution: {
                  name: String(data.get('name') ?? ''),
                  type: String(data.get('type') ?? 'school'),
                  address: String(data.get('address') ?? ''),
                  phone: String(data.get('phone') ?? ''),
                  email: String(data.get('email') ?? ''),
                  logoUrl: String(data.get('logoUrl') ?? ''),
                },
              });
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Institution name" name="name" required defaultValue={settings.institution.name} />
              <Select
                label="Type"
                name="type"
                defaultValue={settings.institution.type}
                options={[
                  { label: 'School', value: 'school' },
                  { label: 'College', value: 'college' },
                  { label: 'University', value: 'university' },
                ]}
              />
            </div>
            <Input label="Address" name="address" defaultValue={settings.institution.address} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Phone" name="phone" defaultValue={settings.institution.phone} />
              <Input label="Email" name="email" type="email" defaultValue={settings.institution.email} />
            </div>
            <Input label="Logo URL" name="logoUrl" placeholder="https://…" defaultValue={settings.institution.logoUrl} />
            <div className="flex justify-end">
              <Button type="submit" loading={updateSettings.isPending} leftIcon={<Save className="h-4 w-4" />}>
                Save institution
              </Button>
            </div>
          </form>
        </Card>
      )}
      {tab === 'academics' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Academic year" subtitle="Shown in the sidebar and on every report." />
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                void save({
                  academicYearStart: String(data.get('start') ?? ''),
                  academicYearEnd: String(data.get('end') ?? ''),
                  term: String(data.get('term') ?? ''),
                  currency: String(data.get('currency') ?? ''),
                  timezone: String(data.get('timezone') ?? ''),
                });
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Starts" name="start" required defaultValue={settings.academicYearStart} />
                <Input label="Ends" name="end" required defaultValue={settings.academicYearEnd} />
              </div>
              <Select
                label="Current term"
                name="term"
                defaultValue={settings.term}
                options={ACADEMIC_TERMS.map((term) => ({ label: term, value: term }))}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Currency"
                  name="currency"
                  defaultValue={settings.currency}
                  options={CURRENCIES.map((code) => ({ label: code, value: code }))}
                />
                <Select
                  label="Timezone"
                  name="timezone"
                  defaultValue={settings.timezone}
                  options={TIMEZONES.map((zone) => ({ label: zone, value: zone }))}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" loading={updateSettings.isPending} leftIcon={<Save className="h-4 w-4" />}>
                  Save academic year
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader title="Grade bands" subtitle="Used for report cards, rankings and dashboards." />
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Grade</span>
                <span>From %</span>
                <span>To %</span>
                <span>GPA</span>
              </div>
              {gradeBands.map((band, index) => (
                <div key={`${band.grade}-${index}`} className="grid grid-cols-4 gap-2">
                  <Input
                    value={band.grade}
                    onChange={(event) =>
                      setBands(gradeBands.map((item, position) =>
                        position === index ? { ...item, grade: event.target.value } : item,
                      ))
                    }
                  />
                  <Input
                    type="number"
                    value={band.min}
                    onChange={(event) =>
                      setBands(gradeBands.map((item, position) =>
                        position === index ? { ...item, min: Number(event.target.value) } : item,
                      ))
                    }
                  />
                  <Input
                    type="number"
                    value={band.max}
                    onChange={(event) =>
                      setBands(gradeBands.map((item, position) =>
                        position === index ? { ...item, max: Number(event.target.value) } : item,
                      ))
                    }
                  />
                  <Input
                    type="number"
                    step="0.1"
                    value={band.gpa}
                    onChange={(event) =>
                      setBands(gradeBands.map((item, position) =>
                        position === index ? { ...item, gpa: Number(event.target.value) } : item,
                      ))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between">
              <Button variant="outline" onClick={() => setBands([...gradeBands, { grade: 'G', gpa: 0, min: 0, max: 0 }])}>
                Add band
              </Button>
              <Button
                loading={updateSettings.isPending}
                onClick={() => void save({ gradeBands }, 'Grade bands saved')}
                leftIcon={<Save className="h-4 w-4" />}
              >
                Save grade bands
              </Button>
            </div>
          </Card>
        </div>
      )}
      {tab === 'rules' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Fee defaults" subtitle="Default tax and late-payment charges applied to new invoices." />
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                void save({
                  feeDefaults: {
                    lateFeePercent: Number(data.get('lateFeePercent') ?? 0),
                    taxPercent: Number(data.get('taxPercent') ?? 0),
                  },
                }, 'Fee defaults saved');
              }}
            >
              <Input
                label="Late fee percentage (%)"
                name="lateFeePercent"
                type="number"
                step="0.1"
                min="0"
                max="100"
                defaultValue={settings.feeDefaults.lateFeePercent}
                hint="Applied once an invoice passes its due date without full payment."
              />
              <Input
                label="Tax percentage (%)"
                name="taxPercent"
                type="number"
                step="0.1"
                min="0"
                max="100"
                defaultValue={settings.feeDefaults.taxPercent}
                hint="Added automatically to new fee invoices if set."
              />
              <div className="flex justify-end">
                <Button type="submit" loading={updateSettings.isPending} leftIcon={<Save className="h-4 w-4" />}>
                  Save fee defaults
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader title="Attendance rules" subtitle="Working schedule and thresholds for attendance calculations." />
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                void save({
                  attendanceRules: {
                    lateThresholdMin: Number(data.get('lateThresholdMin') ?? 15),
                    minAttendancePercent: Number(data.get('minAttendancePercent') ?? 75),
                  },
                }, 'Attendance rules saved');
              }}
            >
              <Input
                label="Late threshold (minutes)"
                name="lateThresholdMin"
                type="number"
                min="0"
                max="120"
                defaultValue={settings.attendanceRules.lateThresholdMin}
                hint="Arrivals after this many minutes past class start are marked Late."
              />
              <Input
                label="Minimum attendance requirement (%)"
                name="minAttendancePercent"
                type="number"
                min="0"
                max="100"
                defaultValue={settings.attendanceRules.minAttendancePercent}
                hint="Flag students below this threshold on reports and exam roll sheets."
              />
              <div className="flex justify-end">
                <Button type="submit" loading={updateSettings.isPending} leftIcon={<Save className="h-4 w-4" />}>
                  Save attendance rules
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {tab === 'features' && (
        <Card>
          <CardHeader
            title="Active modules"
            subtitle="Toggle institutional features to show or hide them from menus and workflows."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {INSTITUTION_FEATURES.map((feature) => {
              const active = settings.features[feature];
              return (
                <label
                  key={feature}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                    active ? 'border-primary-300 bg-primary-50/40 text-slate-900' : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <span className="text-sm font-medium">{FEATURE_LABELS[feature] || feature}</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    checked={active}
                    onChange={(event) => {
                      const enabled = event.target.checked;
                      void updateFeatures.mutateAsync({ [feature]: enabled });
                      toast.success(`${FEATURE_LABELS[feature] || feature} ${enabled ? 'enabled' : 'disabled'}`);
                    }}
                  />
                </label>
              );
            })}
          </div>
        </Card>
      )}

      {tab === 'data' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Backup system" subtitle="Export your entire institution database into a JSON archive." />
            <p className="text-sm text-slate-600">
              Backups include all users, classes, subjects, enrollments, marks, fees, and system settings. Keep this file in a secure location.
            </p>
            <div className="mt-4">
              <Button onClick={() => void onBackup()} leftIcon={<Download className="h-4 w-4" />}>
                Download complete backup
              </Button>
            </div>
          </Card>

          <Card className="border-rose-200 bg-rose-50/20">
            <CardHeader
              title="Danger Zone: Wipe institution data"
              subtitle="Irreversibly erase all students, marks, fees, and timetable records."
            />
            <p className="text-sm text-rose-700">
              This action cannot be undone. To prevent accidental data loss, please type the institution name{' '}
              <strong className="underline">{settings.institution.name}</strong> below to confirm.
            </p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const typed = String(data.get('confirmName') ?? '').trim();
                if (typed !== settings.institution.name.trim()) {
                  toast.error('Confirmation mismatch', 'The typed name does not match the institution name.');
                  return;
                }
                void onWipe(typed);
              }}
            >
              <Input
                placeholder={`Type "${settings.institution.name}"`}
                name="confirmName"
                required
              />
              <Button type="submit" variant="danger">
                Permanently wipe school data
              </Button>
            </form>
          </Card>
        </div>
      )}


    </div>
  );
}
