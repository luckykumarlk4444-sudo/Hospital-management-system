import fs from 'fs';
import path from 'path';
import os from 'os';
import { 
  HospitalState, 
  Department, 
  Doctor, 
  QueueTicket, 
  AuditLog, 
  HospitalAnnouncement, 
  PriorityLevel 
} from './types';

const SEED_FILE = path.join(process.cwd(), 'data', 'hospital-queue-data.json');

function getDataPaths() {
  const isVercel = process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production';
  if (isVercel) {
    const tmpDir = path.join(os.tmpdir(), 'pulsequeue-data');
    return {
      dir: tmpDir,
      file: path.join(tmpDir, 'hospital-queue-data.json')
    };
  }
  const localDir = path.join(process.cwd(), 'data');
  return {
    dir: localDir,
    file: path.join(localDir, 'hospital-queue-data.json')
  };
}

let { dir: DATA_DIR, file: DATA_FILE } = getDataPaths();

const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'dept-gen',
    name: 'General Medicine OPD',
    code: 'GEN',
    avgConsultationMinutes: 10,
    location: 'Floor 1, Block A, Rooms 101-104',
    iconName: 'Stethoscope'
  },
  {
    id: 'dept-cardio',
    name: 'Cardiology Care',
    code: 'CARD',
    avgConsultationMinutes: 15,
    location: 'Floor 2, Block B, Rooms 201-203',
    iconName: 'HeartPulse'
  },
  {
    id: 'dept-ped',
    name: 'Pediatrics Clinic',
    code: 'PED',
    avgConsultationMinutes: 12,
    location: 'Floor 1, Block C, Child Wellness Wing',
    iconName: 'Baby'
  },
  {
    id: 'dept-ortho',
    name: 'Orthopedics & Trauma',
    code: 'ORTH',
    avgConsultationMinutes: 15,
    location: 'Floor 1, Block B, Rooms 110-112',
    iconName: 'Bone'
  },
  {
    id: 'dept-ent',
    name: 'ENT Specialist Clinic',
    code: 'ENT',
    avgConsultationMinutes: 10,
    location: 'Floor 2, Block A, Rooms 208-210',
    iconName: 'Ear'
  }
];

const INITIAL_DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Rajesh Sharma, MD',
    specialty: 'Senior General Physician',
    departmentId: 'dept-gen',
    roomNumber: 'Room 101',
    status: 'CONSULTING',
    currentTicketId: 'ticket-demo-1',
    delayMinutes: 0,
    delayReason: ''
  },
  {
    id: 'doc-2',
    name: 'Dr. Priya Nambiar, MD, DM',
    specialty: 'Consultant Cardiologist',
    departmentId: 'dept-cardio',
    roomNumber: 'Room 201',
    status: 'AVAILABLE',
    currentTicketId: null,
    delayMinutes: 15,
    delayReason: 'Emergency angioplasty review in CCU'
  },
  {
    id: 'doc-3',
    name: 'Dr. Vikram Malhotra, MD',
    specialty: 'Pediatric Specialist',
    departmentId: 'dept-ped',
    roomNumber: 'Room 105',
    status: 'AVAILABLE',
    currentTicketId: null,
    delayMinutes: 0,
    delayReason: ''
  },
  {
    id: 'doc-4',
    name: 'Dr. Ananya Roy, MS',
    specialty: 'Orthopedic Surgeon',
    departmentId: 'dept-ortho',
    roomNumber: 'Room 110',
    status: 'CONSULTING',
    currentTicketId: 'ticket-demo-2',
    delayMinutes: 10,
    delayReason: 'Complex fracture plaster application'
  }
];

const INITIAL_TICKETS: QueueTicket[] = [
  {
    id: 'ticket-demo-1',
    ticketNumber: 'GEN-101',
    patientName: 'Ramesh Gupta',
    age: 58,
    gender: 'Male',
    contactNumber: '+91 98201 12345',
    departmentId: 'dept-gen',
    doctorId: 'doc-1',
    priority: 'NORMAL',
    chiefComplaint: 'Flu symptoms, severe body ache for 3 days',
    status: 'IN_CONSULTATION',
    checkInTime: new Date(Date.now() - 40 * 60000).toISOString(),
    calledTime: new Date(Date.now() - 10 * 60000).toISOString(),
    startTime: new Date(Date.now() - 8 * 60000).toISOString(),
    estimatedWaitMinutes: 0,
    queuePosition: 0,
    doctorNotes: 'BP 130/85, checking chest congestion'
  },
  {
    id: 'ticket-demo-2',
    ticketNumber: 'ORTH-201',
    patientName: 'Sunita Mehra',
    age: 67,
    gender: 'Female',
    contactNumber: '+91 98112 56789',
    departmentId: 'dept-ortho',
    doctorId: 'doc-4',
    priority: 'SENIOR_CITIZEN',
    chiefComplaint: 'Right wrist fracture post-slip, swelling',
    status: 'IN_CONSULTATION',
    checkInTime: new Date(Date.now() - 35 * 60000).toISOString(),
    calledTime: new Date(Date.now() - 12 * 60000).toISOString(),
    startTime: new Date(Date.now() - 10 * 60000).toISOString(),
    estimatedWaitMinutes: 0,
    queuePosition: 0
  },
  {
    id: 'ticket-demo-3',
    ticketNumber: 'GEN-102',
    patientName: 'Aarav Verma',
    age: 24,
    gender: 'Male',
    contactNumber: '+91 97234 44556',
    departmentId: 'dept-gen',
    doctorId: 'doc-1',
    priority: 'NORMAL',
    chiefComplaint: 'Allergic rash and mild shortness of breath',
    status: 'WAITING',
    checkInTime: new Date(Date.now() - 25 * 60000).toISOString(),
    estimatedWaitMinutes: 10,
    queuePosition: 1
  },
  {
    id: 'ticket-demo-4',
    ticketNumber: 'CARD-301',
    patientName: 'Deepak Joshi',
    age: 62,
    gender: 'Male',
    contactNumber: '+91 99100 88776',
    departmentId: 'dept-cardio',
    doctorId: 'doc-2',
    priority: 'URGENT',
    chiefComplaint: 'Palpitations, chest tightness on exertion',
    status: 'WAITING',
    checkInTime: new Date(Date.now() - 20 * 60000).toISOString(),
    estimatedWaitMinutes: 15,
    queuePosition: 1
  },
  {
    id: 'ticket-demo-5',
    ticketNumber: 'PED-401',
    patientName: 'Anvi Deshmukh',
    age: 5,
    gender: 'Female',
    contactNumber: '+91 98980 11223',
    departmentId: 'dept-ped',
    doctorId: 'doc-3',
    priority: 'NORMAL',
    chiefComplaint: 'High fever 102°F and ear pain',
    status: 'WAITING',
    checkInTime: new Date(Date.now() - 15 * 60000).toISOString(),
    estimatedWaitMinutes: 12,
    queuePosition: 1
  },
  {
    id: 'ticket-demo-6',
    ticketNumber: 'GEN-103',
    patientName: 'Kavita Iyer',
    age: 72,
    gender: 'Female',
    contactNumber: '+91 98331 99001',
    departmentId: 'dept-gen',
    doctorId: 'doc-1',
    priority: 'SENIOR_CITIZEN',
    chiefComplaint: 'Uncontrolled diabetes checkup, dizziness',
    status: 'WAITING',
    checkInTime: new Date(Date.now() - 10 * 60000).toISOString(),
    estimatedWaitMinutes: 20,
    queuePosition: 2
  }
];

const INITIAL_ANNOUNCEMENTS: HospitalAnnouncement[] = [
  {
    id: 'ann-1',
    message: 'Dr. Priya Nambiar (Cardiology, Room 201) is delayed by ~15 mins due to urgent CCU ward rounds.',
    severity: 'warning',
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    departmentId: 'dept-cardio'
  },
  {
    id: 'ann-2',
    message: 'Senior citizens and emergency triage cases are given automated priority in queue scheduling.',
    severity: 'info',
    createdAt: new Date(Date.now() - 60 * 60000).toISOString()
  }
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 40 * 60000).toISOString(),
    ticketId: 'ticket-demo-1',
    ticketNumber: 'GEN-101',
    action: 'CHECK_IN',
    actor: 'Reception Triage Desk',
    details: 'Patient Ramesh Gupta registered for General Medicine'
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
    ticketId: 'ticket-demo-1',
    ticketNumber: 'GEN-101',
    action: 'CALLED_TO_ROOM',
    actor: 'Dr. Rajesh Sharma, MD',
    details: 'Called to Room 101 for consultation'
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
    ticketId: 'ticket-demo-1',
    ticketNumber: 'GEN-101',
    action: 'CONSULTATION_STARTED',
    actor: 'Dr. Rajesh Sharma, MD',
    details: 'Patient entered Room 101'
  }
];

// Helper to get priority weight (higher number = served first)
export function getPriorityWeight(priority: PriorityLevel): number {
  switch (priority) {
    case 'EMERGENCY':
      return 4000;
    case 'URGENT':
      return 3000;
    case 'SENIOR_CITIZEN':
      return 2000;
    case 'NORMAL':
    default:
      return 1000;
  }
}

// In-memory cache for fast access
let memoryState: HospitalState | null = null;

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to ensure data dir:', err);
  }
}

export function getInitialState(): HospitalState {
  return {
    departments: INITIAL_DEPARTMENTS,
    doctors: INITIAL_DOCTORS,
    tickets: INITIAL_TICKETS,
    auditLogs: INITIAL_AUDIT_LOGS,
    announcements: INITIAL_ANNOUNCEMENTS
  };
}

export function loadHospitalState(): HospitalState {
  try {
    ensureDataDir();
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      memoryState = JSON.parse(raw);
    } else if (fs.existsSync(SEED_FILE)) {
      // First run in /tmp or new container: seed from repository JSON
      const raw = fs.readFileSync(SEED_FILE, 'utf-8');
      memoryState = JSON.parse(raw);
      try {
        ensureDataDir();
        fs.writeFileSync(DATA_FILE, JSON.stringify(memoryState, null, 2), 'utf-8');
      } catch (writeErr) {
        console.error('Initial seed write to DATA_FILE failed:', writeErr);
      }
    } else if (!memoryState) {
      memoryState = getInitialState();
      saveHospitalState(memoryState);
    }
  } catch (err) {
    console.error('Error loading hospital state from disk, using fallback in-memory state:', err);
    if (!memoryState) {
      memoryState = getInitialState();
    }
  }

  recalculateQueues(memoryState!);
  return memoryState!;
}

export function saveHospitalState(state: HospitalState): void {
  recalculateQueues(state);
  memoryState = state;
  try {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write hospital data to primary disk, attempting /tmp fallback:', err);
    try {
      const fallbackDir = path.join(os.tmpdir(), 'pulsequeue-data');
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
      }
      DATA_DIR = fallbackDir;
      DATA_FILE = path.join(fallbackDir, 'hospital-queue-data.json');
      fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (fallbackErr) {
      console.error('Failed to write hospital data to fallback disk:', fallbackErr);
    }
  }
}

export function resetAndSeedState(): HospitalState {
  const fresh = getInitialState();
  saveHospitalState(fresh);
  return fresh;
}

/**
 * Re-indexes queue positions and computes accurate estimated wait times
 * using priority order and doctor consultation statistics.
 */
export function recalculateQueues(state: HospitalState): void {
  // Ensure patient records have consistent name and gender mapping
  for (const ticket of state.tickets) {
    if (ticket.patientName === 'Rohit Sen' && ticket.gender !== 'Male') {
      ticket.gender = 'Male';
    } else if (ticket.patientName === 'Arjun Kapoor' && ticket.gender !== 'Male') {
      ticket.gender = 'Male';
    } else if (ticket.patientName === 'Siddharth Rao' && ticket.gender !== 'Male') {
      ticket.gender = 'Male';
    }
  }

  const deptMap = new Map(state.departments.map(d => [d.id, d]));
  const docMap = new Map(state.doctors.map(d => [d.id, d]));

  // Group active waiting tickets by doctor
  const waitingByDoctor = new Map<string, QueueTicket[]>();

  for (const doc of state.doctors) {
    waitingByDoctor.set(doc.id, []);
  }

  // Active waiting tickets only
  for (const ticket of state.tickets) {
    if (ticket.status === 'WAITING' || ticket.status === 'CALLED') {
      const docList = waitingByDoctor.get(ticket.doctorId);
      if (docList) {
        docList.push(ticket);
      }
    }
  }

  // Sort each doctor's queue by priority weight (desc) and checkInTime (asc)
  waitingByDoctor.forEach((tickets, docId) => {
    tickets.sort((a, b) => {
      // CALLED tickets stay at top
      if (a.status === 'CALLED' && b.status !== 'CALLED') return -1;
      if (b.status === 'CALLED' && a.status !== 'CALLED') return 1;

      const weightDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
      if (weightDiff !== 0) return weightDiff;
      return new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime();
    });

    const doc = docMap.get(docId);
    const dept = doc ? deptMap.get(doc.departmentId) : undefined;
    const avgMins = dept ? dept.avgConsultationMinutes : 12;
    const docDelay = doc ? doc.delayMinutes : 0;

    let cumulativeWait = docDelay;

    tickets.forEach((t, idx) => {
      t.queuePosition = idx + 1;
      if (t.status === 'CALLED') {
        t.estimatedWaitMinutes = 0;
      } else {
        cumulativeWait += avgMins;
        t.estimatedWaitMinutes = cumulativeWait;
      }
    });
  });

  // For tickets not in WAITING or CALLED
  for (const ticket of state.tickets) {
    if (ticket.status === 'IN_CONSULTATION') {
      ticket.queuePosition = 0;
      ticket.estimatedWaitMinutes = 0;
    } else if (ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED' || ticket.status === 'NO_SHOW') {
      ticket.queuePosition = 0;
      ticket.estimatedWaitMinutes = 0;
    }
  }
}

export function logAction(
  state: HospitalState,
  action: string,
  actor: string,
  details: string,
  ticket?: QueueTicket
): void {
  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    ticketId: ticket?.id,
    ticketNumber: ticket?.ticketNumber,
    action,
    actor,
    details
  };
  state.auditLogs.unshift(newLog);
  // Keep last 100 logs
  if (state.auditLogs.length > 100) {
    state.auditLogs = state.auditLogs.slice(0, 100);
  }
}
