export type PriorityLevel = 'NORMAL' | 'SENIOR_CITIZEN' | 'URGENT' | 'EMERGENCY';

export type TicketStatus = 
  | 'WAITING' 
  | 'CALLED' 
  | 'IN_CONSULTATION' 
  | 'ON_HOLD' 
  | 'COMPLETED' 
  | 'NO_SHOW' 
  | 'CANCELLED';

export type DoctorStatus = 
  | 'AVAILABLE' 
  | 'CONSULTING' 
  | 'ON_BREAK' 
  | 'EMERGENCY_DELAY' 
  | 'OFFLINE';

export interface Department {
  id: string;
  name: string;
  code: string;
  avgConsultationMinutes: number;
  location: string;
  iconName?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  departmentId: string;
  roomNumber: string;
  status: DoctorStatus;
  currentTicketId: string | null;
  delayMinutes: number;
  delayReason?: string;
}

export interface SMSNotificationRecord {
  status: 'SENT' | 'FAILED' | 'PENDING' | 'SKIPPED';
  recipientNumber: string;
  messageText: string;
  gateway: string;
  messageId?: string;
  sentAt?: string;
  error?: string;
  retryCount?: number;
}

export interface EmailNotificationRecord {
  status: 'SENT' | 'FAILED' | 'PENDING' | 'SKIPPED';
  recipientEmail: string;
  subject: string;
  bodyText: string;
  provider: string;
  messageId?: string;
  sentAt?: string;
  error?: string;
  retryCount?: number;
}

export interface QueueTicket {
  id: string;
  ticketNumber: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  contactNumber: string;
  email?: string;
  departmentId: string;
  doctorId: string;
  priority: PriorityLevel;
  chiefComplaint: string;
  status: TicketStatus;
  checkInTime: string; // ISO String
  calledTime?: string | null;
  startTime?: string | null;
  completedTime?: string | null;
  estimatedWaitMinutes: number;
  queuePosition: number;
  doctorNotes?: string;
  holdReason?: string;
  smsNotification?: SMSNotificationRecord;
  emailNotification?: EmailNotificationRecord;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  ticketId?: string;
  ticketNumber?: string;
  action: string;
  actor: string;
  details: string;
}

export interface HospitalAnnouncement {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'alert';
  createdAt: string;
  departmentId?: string;
}

export interface HospitalState {
  departments: Department[];
  doctors: Doctor[];
  tickets: QueueTicket[];
  auditLogs: AuditLog[];
  announcements: HospitalAnnouncement[];
}
