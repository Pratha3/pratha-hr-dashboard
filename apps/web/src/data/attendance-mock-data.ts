import { Employee, AttendanceRecord, CompanyHoliday, AttendanceStatus } from '@/types/attendance';

export const MOCK_DEPARTMENTS = [
  'All',
  'Engineering',
  'Product & Design',
  'Sales & Marketing',
  'Human Resources',
  'Finance & Ops'
] as const;

export const STATUS_CONFIG: Record<
  AttendanceStatus,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    border: string;
    dotColor: string;
    chipBg: string;
    icon: string;
    description: string;
  }
> = {
  'in-office': {
    label: 'In-Office',
    badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-500',
    dotColor: 'bg-emerald-500',
    chipBg: 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 border-emerald-500/40',
    icon: '🏢',
    description: 'Working on-site at headquarters'
  },
  'wfh': {
    label: 'Remote / WFH',
    badgeBg: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
    badgeText: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-500',
    dotColor: 'bg-blue-500',
    chipBg: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-800 dark:text-blue-300 border-blue-500/40',
    icon: '🏠',
    description: 'Remote / Home office'
  },
  'pto': {
    label: 'Planned PTO',
    badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    badgeText: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-500',
    dotColor: 'bg-amber-500',
    chipBg: 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 border-amber-500/40',
    icon: '🌴',
    description: 'Approved paid vacation / personal time'
  },
  'sick': {
    label: 'Sick Leave',
    badgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    badgeText: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-500',
    dotColor: 'bg-rose-500',
    chipBg: 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-800 dark:text-rose-300 border-rose-500/40',
    icon: '🤒',
    description: 'Medical or sick leave'
  },
  'holiday': {
    label: 'Company Holiday',
    badgeBg: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
    badgeText: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-500',
    dotColor: 'bg-purple-500',
    chipBg: 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-800 dark:text-purple-300 border-purple-500/40',
    icon: '🎉',
    description: 'Official corporate / public holiday'
  }
};

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    name: 'Alex Morgan',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    department: 'Engineering',
    role: 'Staff Fullstack Engineer',
    email: 'alex.morgan@nexus.com'
  },
  {
    id: 'emp-2',
    name: 'Sarah Jenkins',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    department: 'Human Resources',
    role: 'VP of People & Talent',
    email: 'sarah.jenkins@nexus.com'
  },
  {
    id: 'emp-3',
    name: 'David Chen',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    department: 'Engineering',
    role: 'Lead Cloud Architect',
    email: 'david.chen@nexus.com'
  },
  {
    id: 'emp-4',
    name: 'Elena Rostova',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    department: 'Product & Design',
    role: 'Principal UX Designer',
    email: 'elena.rostova@nexus.com'
  },
  {
    id: 'emp-5',
    name: 'Marcus Vance',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    department: 'Sales & Marketing',
    role: 'Enterprise Account Director',
    email: 'marcus.vance@nexus.com'
  },
  {
    id: 'emp-6',
    name: 'Priya Sharma',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    department: 'Engineering',
    role: 'Senior Backend Engineer',
    email: 'priya.sharma@nexus.com'
  },
  {
    id: 'emp-7',
    name: 'Jordan Miller',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    department: 'Finance & Ops',
    role: 'Head of Financial Planning',
    email: 'jordan.miller@nexus.com'
  },
  {
    id: 'emp-8',
    name: 'Aaliyah Bennett',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    department: 'Product & Design',
    role: 'Group Product Manager',
    email: 'aaliyah.bennett@nexus.com'
  },
  {
    id: 'emp-9',
    name: 'Liam Gallagher',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    department: 'Engineering',
    role: 'Security & DevOps Lead',
    email: 'liam.gallagher@nexus.com'
  },
  {
    id: 'emp-10',
    name: 'Chloe Dubois',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    department: 'Sales & Marketing',
    role: 'Brand & Growth Strategist',
    email: 'chloe.dubois@nexus.com'
  }
];

// Helper to format Date to YYYY-MM-DD
export function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Generate dynamic holidays based on year
export function getCompanyHolidays(year: number): CompanyHoliday[] {
  return [
    { id: 'hol-1', name: "New Year's Day", date: `${year}-01-01`, type: 'public' },
    { id: 'hol-2', name: 'Martin Luther King Jr. Day', date: `${year}-01-19`, type: 'public' },
    { id: 'hol-3', name: "Presidents' Day", date: `${year}-02-16`, type: 'public' },
    { id: 'hol-4', name: 'Spring Wellness Day', date: `${year}-04-03`, type: 'company' },
    { id: 'hol-5', name: 'Memorial Day', date: `${year}-05-25`, type: 'public' },
    { id: 'hol-6', name: 'Juneteenth National Day', date: `${year}-06-19`, type: 'public' },
    { id: 'hol-7', name: 'Independence Day', date: `${year}-07-04`, type: 'public' },
    { id: 'hol-8', name: 'Labor Day', date: `${year}-09-07`, type: 'public' },
    { id: 'hol-9', name: 'Autumn Hackathon / Innovation Day', date: `${year}-10-16`, type: 'company' },
    { id: 'hol-10', name: 'Veterans Day', date: `${year}-11-11`, type: 'public' },
    { id: 'hol-11', name: 'Thanksgiving Day', date: `${year}-11-26`, type: 'public' },
    { id: 'hol-12', name: 'Day After Thanksgiving', date: `${year}-11-27`, type: 'company' },
    { id: 'hol-13', name: 'Christmas Eve & Day', date: `${year}-12-25`, type: 'public' },
    { id: 'hol-14', name: "New Year's Eve (Half Day)", date: `${year}-12-31`, type: 'company' }
  ];
}

// Generate initial mock attendance records for a dynamic 60-day window around today
export function generateInitialAttendanceRecords(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  const currentYear = today.getFullYear();
  const holidays = getCompanyHolidays(currentYear);
  const holidayDates = new Set(holidays.map((h) => h.date));

  // Base patterns for realistic company schedules
  MOCK_EMPLOYEES.forEach((emp, empIdx) => {
    // Generate records for past 20 days and next 40 days
    for (let offset = -20; offset <= 40; offset++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + offset);
      const dateKey = formatDateKey(targetDate);
      const dayOfWeek = targetDate.getDay(); // 0 = Sun, 6 = Sat

      // Weekends: skip or mark non-working
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue;
      }

      // Check Holiday
      if (holidayDates.has(dateKey)) {
        const h = holidays.find((item) => item.date === dateKey);
        records.push({
          id: `rec-${emp.id}-${dateKey}`,
          employeeId: emp.id,
          employeeName: emp.name,
          employeeAvatar: emp.avatar,
          department: emp.department,
          date: dateKey,
          status: 'holiday',
          notes: h?.name || 'Company Holiday'
        });
        continue;
      }

      let status: AttendanceStatus = 'in-office';
      let notes: string | undefined = undefined;

      // Realistic schedules per employee profile:
      // Alex Morgan (Dev): WFH on Mon/Fri, PTO around current week
      if (emp.id === 'emp-1') {
        if (dayOfWeek === 1 || dayOfWeek === 5) {
          status = 'wfh';
          notes = 'Scheduled remote engineering sprint';
        } else if (offset >= 8 && offset <= 12) {
          status = 'pto';
          notes = 'Annual Family Vacation (Approved by HR)';
        }
      }
      // Sarah Jenkins (HR): in-office mostly, WFH on Wed
      else if (emp.id === 'emp-2') {
        if (dayOfWeek === 3) {
          status = 'wfh';
          notes = 'Remote recruiting and interview screens';
        } else if (offset === -2 || offset === -1) {
          status = 'sick';
          notes = 'Doctor Appointment & Rest';
        }
      }
      // David Chen (Cloud): WFH Tue/Thu, PTO on upcoming Friday-Monday
      else if (emp.id === 'emp-3') {
        if (dayOfWeek === 2 || dayOfWeek === 4) {
          status = 'wfh';
          notes = 'Distributed infrastructure maintenance';
        } else if (offset >= 18 && offset <= 22) {
          status = 'pto';
          notes = 'Mountain Hiking Trek';
        }
      }
      // Elena Rostova (Design): PTO current days, WFH Mon
      else if (emp.id === 'emp-4') {
        if (offset >= -1 && offset <= 2) {
          status = 'pto';
          notes = 'Design Conference & Offsite';
        } else if (dayOfWeek === 1) {
          status = 'wfh';
          notes = 'Deep UI wireframing focus day';
        }
      }
      // Marcus Vance (Sales): frequently WFH or traveling
      else if (emp.id === 'emp-5') {
        if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
          status = 'wfh';
          notes = 'Client pipeline & demo meetings';
        } else if (offset === 4 || offset === 5) {
          status = 'pto';
          notes = 'Personal Day';
        }
      }
      // Priya Sharma (Eng): Sick leave today/tomorrow, WFH Wed
      else if (emp.id === 'emp-6') {
        if (offset === 0 || offset === 1) {
          status = 'sick';
          notes = 'Flu recovery & medical rest';
        } else if (dayOfWeek === 3) {
          status = 'wfh';
          notes = 'Backend API optimization';
        }
      }
      // Jordan Miller (Finance): WFH Fri, PTO in 2 weeks
      else if (emp.id === 'emp-7') {
        if (dayOfWeek === 5) {
          status = 'wfh';
          notes = 'Quarterly audit reports';
        } else if (offset >= 14 && offset <= 16) {
          status = 'pto';
          notes = 'Personal Leave';
        }
      }
      // Liam Gallagher (DevOps): WFH Thu/Fri
      else if (emp.id === 'emp-9') {
        if (dayOfWeek === 4 || dayOfWeek === 5) {
          status = 'wfh';
          notes = 'K8s cluster migration window';
        }
      }
      // Fallback pseudo-random for others
      else {
        const seed = (empIdx * 7 + offset * 13 + dayOfWeek) % 10;
        if (seed === 0) {
          status = 'pto';
          notes = 'Approved Time Off';
        } else if (seed === 1 || seed === 2) {
          status = 'wfh';
          notes = 'Remote Workday';
        } else {
          status = 'in-office';
        }
      }

      records.push({
        id: `rec-${emp.id}-${dateKey}`,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeAvatar: emp.avatar,
        department: emp.department,
        date: dateKey,
        status,
        notes
      });
    }
  });

  return records;
}
