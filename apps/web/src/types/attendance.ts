export interface Employee {
  id: string;
  name: string;
  avatar: string;
  department: string;
  role: string;
  email: string;
}

export type AttendanceStatus = 'in-office' | 'wfh' | 'pto' | 'sick' | 'holiday';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  department: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  notes?: string;
}

export interface CompanyHoliday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  type: 'public' | 'company' | 'observance';
}

export type CalendarViewMode = 'month' | 'week' | 'timeline';

export interface AttendanceKPIData {
  totalEmployees: number;
  presentToday: number;
  presentPercentage: number;
  onLeaveToday: number;
  ptoToday: number;
  sickToday: number;
  wfhToday: number;
  wfhPercentage: number;
  upcomingHolidaysCount: number;
  nextHoliday?: CompanyHoliday;
}

export interface AttendanceFilterState {
  department: string;
  selectedStatuses: AttendanceStatus[];
  searchQuery: string;
}
