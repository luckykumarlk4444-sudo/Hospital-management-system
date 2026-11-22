import { NextRequest, NextResponse } from 'next/server';
import { 
  loadHospitalState, 
  saveHospitalState, 
  logAction 
} from '@/lib/store';
import { PriorityLevel, QueueTicket } from '@/lib/types';
import { sendRegistrationSMS } from '@/lib/sms';
import { sendRegistrationEmail } from '@/lib/email';

// GET /api/queue?departmentId=...&doctorId=...&status=...&search=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    const doctorId = searchParams.get('doctorId');
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.toLowerCase();

    const state = loadHospitalState();
    let tickets = [...state.tickets];

    if (departmentId) {
      tickets = tickets.filter(t => t.departmentId === departmentId);
    }

    if (doctorId) {
      tickets = tickets.filter(t => t.doctorId === doctorId);
    }

    if (status) {
      const statuses = status.split(',');
      tickets = tickets.filter(t => statuses.includes(t.status));
    }

    if (search) {
      tickets = tickets.filter(t => 
        t.patientName.toLowerCase().includes(search) ||
        t.ticketNumber.toLowerCase().includes(search) ||
        t.contactNumber.includes(search) ||
        t.chiefComplaint.toLowerCase().includes(search)
      );
    }

    // Sort order: active tickets (IN_CONSULTATION, CALLED, WAITING, ON_HOLD) first
    const statusOrder: Record<string, number> = {
      'CALLED': 1,
      'IN_CONSULTATION': 2,
      'WAITING': 3,
      'ON_HOLD': 4,
      'COMPLETED': 5,
      'NO_SHOW': 6,
      'CANCELLED': 7
    };

    tickets.sort((a, b) => {
      const orderA = statusOrder[a.status] || 99;
      const orderB = statusOrder[b.status] || 99;
      if (orderA !== orderB) return orderA - orderB;
      if (a.status === 'WAITING' && b.status === 'WAITING') {
        return a.queuePosition - b.queuePosition;
      }
      return new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime();
    });

    return NextResponse.json(
      {
        success: true,
        count: tickets.length,
        data: tickets
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        }
      }
    );
  } catch (error: any) {
    console.error('Error fetching queue:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch queue tickets' },
      { status: 500 }
    );
  }
}

// POST /api/queue - Patient Check-In
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      patientName, 
      age, 
      gender, 
      contactNumber, 
      email,
      departmentId, 
      doctorId, 
      priority = 'NORMAL', 
      chiefComplaint = '' 
    } = body;

    // Strict validation
    if (!patientName || typeof patientName !== 'string' || patientName.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Patient name is required' },
        { status: 400 }
      );
    }

    const parsedAge = Number(age);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 130) {
      return NextResponse.json(
        { success: false, error: 'Valid age (0-130) is required' },
        { status: 400 }
      );
    }

    if (!departmentId) {
      return NextResponse.json(
        { success: false, error: 'Department selection is required' },
        { status: 400 }
      );
    }

    const state = loadHospitalState();
    const department = state.departments.find(d => d.id === departmentId);
    if (!department) {
      return NextResponse.json(
        { success: false, error: 'Invalid department specified' },
        { status: 400 }
      );
    }

    // Doctor assignment
    let assignedDoctorId = doctorId;
    if (!assignedDoctorId) {
      // Auto-assign to available doctor in this department with smallest queue
      const deptDoctors = state.doctors.filter(d => d.departmentId === departmentId);
      if (deptDoctors.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No doctors currently available in this department' },
          { status: 400 }
        );
      }

      // Pick doctor with fewest waiting patients
      let minQueueCount = Infinity;
      let bestDoctor = deptDoctors[0];

      for (const doc of deptDoctors) {
        const count = state.tickets.filter(
          t => t.doctorId === doc.id && (t.status === 'WAITING' || t.status === 'CALLED')
        ).length;
        if (count < minQueueCount) {
          minQueueCount = count;
          bestDoctor = doc;
        }
      }
      assignedDoctorId = bestDoctor.id;
    } else {
      const docExists = state.doctors.find(d => d.id === assignedDoctorId);
      if (!docExists) {
        return NextResponse.json(
          { success: false, error: 'Specified doctor does not exist' },
          { status: 400 }
        );
      }
    }

    // Generate unique Ticket Number, e.g. GEN-104
    const existingDeptTickets = state.tickets.filter(t => t.departmentId === departmentId);
    const nextSeq = 100 + existingDeptTickets.length + 1;
    const ticketNumber = `${department.code}-${nextSeq}`;

    // Auto-detect Senior Citizen priority if not emergency/urgent
    let finalPriority: PriorityLevel = priority;
    if (parsedAge >= 65 && finalPriority === 'NORMAL') {
      finalPriority = 'SENIOR_CITIZEN';
    }

    let normalizedGender: 'Male' | 'Female' | 'Other' = 'Other';
    if (gender) {
      const g = String(gender).trim().toLowerCase();
      if (g === 'male' || g === 'm') normalizedGender = 'Male';
      else if (g === 'female' || g === 'f') normalizedGender = 'Female';
      else if (g === 'other' || g === 'o') normalizedGender = 'Other';
      else if (gender === 'Male' || gender === 'Female' || gender === 'Other') normalizedGender = gender;
    }

    const newTicket: QueueTicket = {
      id: `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ticketNumber,
      patientName: patientName.trim(),
      age: parsedAge,
      gender: normalizedGender,
      contactNumber: contactNumber?.trim() || 'N/A',
      email: email && typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : undefined,
      departmentId,
      doctorId: assignedDoctorId,
      priority: finalPriority,
      chiefComplaint: chiefComplaint?.trim() || 'General health consultation',
      status: 'WAITING',
      checkInTime: new Date().toISOString(),
      calledTime: null,
      startTime: null,
      completedTime: null,
      estimatedWaitMinutes: 0,
      queuePosition: 1
    };

    state.tickets.push(newTicket);
    logAction(
      state,
      'PATIENT_CHECKED_IN',
      'Reception Desk / Self Kiosk',
      `Checked in ${newTicket.patientName} (${newTicket.ticketNumber}) for ${department.name}. Priority: ${finalPriority}`,
      newTicket
    );

    // Automatic SMS Notification dispatch after successful registration & token generation (Requirement 1 & 4)
    const assignedDoc = state.doctors.find(d => d.id === newTicket.doctorId);
    const regDate = new Date(newTicket.checkInTime).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const smsResult = await sendRegistrationSMS({
      ticketId: newTicket.id,
      patientName: newTicket.patientName,
      tokenNumber: newTicket.ticketNumber,
      contactNumber: newTicket.contactNumber,
      doctorName: assignedDoc?.name || null,
      registrationDate: regDate,
      alreadySent: false
    });

    newTicket.smsNotification = {
      status: smsResult.status,
      recipientNumber: smsResult.recipientNumber,
      messageText: smsResult.messageText,
      gateway: smsResult.gateway,
      messageId: smsResult.messageId,
      sentAt: smsResult.sentAt,
      error: smsResult.error,
      retryCount: 0
    };

    if (smsResult.success) {
      logAction(
        state,
        'SMS_NOTIFICATION_SENT',
        'SMS Notification Gateway',
        `Sent registration SMS to ${smsResult.recipientNumber} for Token ${newTicket.ticketNumber} via ${smsResult.gateway}`,
        newTicket
      );
    } else {
      logAction(
        state,
        'SMS_NOTIFICATION_FAILED',
        'SMS Notification Gateway',
        `SMS delivery failed to ${smsResult.recipientNumber} for Token ${newTicket.ticketNumber}: ${smsResult.error || 'Delivery error'}`,
        newTicket
      );
    }

    // Automatic Email Notification dispatch after successful registration & token generation (Requirements 1 & 4)
    let emailResult: any = null;
    if (newTicket.email) {
      emailResult = await sendRegistrationEmail({
        ticketId: newTicket.id,
        patientName: newTicket.patientName,
        tokenNumber: newTicket.ticketNumber,
        email: newTicket.email,
        doctorName: assignedDoc?.name || null,
        registrationDate: regDate,
        alreadySent: false
      });

      newTicket.emailNotification = {
        status: emailResult.status,
        recipientEmail: emailResult.recipientEmail,
        subject: emailResult.subject,
        bodyText: emailResult.bodyText,
        provider: emailResult.provider,
        messageId: emailResult.messageId,
        sentAt: emailResult.sentAt,
        error: emailResult.error,
        retryCount: 0
      };

      if (emailResult.success) {
        logAction(
          state,
          'EMAIL_NOTIFICATION_SENT',
          'Email Notification Service',
          `Sent registration email to ${emailResult.recipientEmail} for Token ${newTicket.ticketNumber} via ${emailResult.provider}`,
          newTicket
        );
      } else {
        logAction(
          state,
          'EMAIL_NOTIFICATION_FAILED',
          'Email Notification Service',
          `Email delivery failed to ${emailResult.recipientEmail} for Token ${newTicket.ticketNumber}: ${emailResult.error || 'Delivery error'}`,
          newTicket
        );
      }
    }

    saveHospitalState(state);

    // Reload state after recalculateQueues to get calculated wait & position
    const refreshedTicket = state.tickets.find(t => t.id === newTicket.id);

    return NextResponse.json(
      { 
        success: true, 
        message: 'Patient registered successfully into the queue', 
        data: refreshedTicket || newTicket,
        sms: {
          success: smsResult.success,
          status: smsResult.status,
          recipientNumber: smsResult.recipientNumber,
          message: smsResult.success
            ? `SMS confirmation sent to ${smsResult.recipientNumber}`
            : `SMS delivery failed: ${smsResult.error}`,
          error: smsResult.error,
          gateway: smsResult.gateway
        },
        email: emailResult ? {
          success: emailResult.success,
          status: emailResult.status,
          recipientEmail: emailResult.recipientEmail,
          message: emailResult.success
            ? `Email confirmation sent to ${emailResult.recipientEmail}`
            : `Email delivery failed: ${emailResult.error}`,
          error: emailResult.error,
          provider: emailResult.provider
        } : null
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error during patient check-in:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error processing check-in' },
      { status: 500 }
    );
  }
}
