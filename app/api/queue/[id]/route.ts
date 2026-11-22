import { NextRequest, NextResponse } from 'next/server';
import { 
  loadHospitalState, 
  saveHospitalState, 
  logAction 
} from '@/lib/store';
import { PriorityLevel, TicketStatus } from '@/lib/types';

// GET /api/queue/[id]
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const queryId = decodeURIComponent(id).trim();

    const state = loadHospitalState();
    const ticket = state.tickets.find(
      t => t.id === queryId || t.ticketNumber.toUpperCase() === queryId.toUpperCase()
    );

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: `Ticket not found for identifier "${queryId}"` },
        { status: 404 }
      );
    }

    const doctor = state.doctors.find(d => d.id === ticket.doctorId);
    const department = state.departments.find(d => d.id === ticket.departmentId);

    // Count how many patients are ahead in line for the same doctor
    const waitingTickets = state.tickets
      .filter(t => t.doctorId === ticket.doctorId && (t.status === 'WAITING' || t.status === 'CALLED'))
      .sort((a, b) => a.queuePosition - b.queuePosition);

    const aheadCount = waitingTickets.filter(t => t.queuePosition < ticket.queuePosition).length;

    return NextResponse.json({
      success: true,
      data: {
        ...ticket,
        doctor: doctor || null,
        department: department || null,
        patientsAhead: Math.max(0, aheadCount),
        isDoctorDelayed: (doctor?.delayMinutes ?? 0) > 0,
        doctorDelayMinutes: doctor?.delayMinutes ?? 0,
        doctorDelayReason: doctor?.delayReason ?? ''
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}

// PATCH /api/queue/[id]
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const queryId = decodeURIComponent(id).trim();
    const body = await request.json();

    const state = loadHospitalState();
    const ticketIndex = state.tickets.findIndex(
      t => t.id === queryId || t.ticketNumber.toUpperCase() === queryId.toUpperCase()
    );

    if (ticketIndex === -1) {
      return NextResponse.json(
        { success: false, error: `Ticket not found for identifier "${queryId}"` },
        { status: 404 }
      );
    }

    const ticket = state.tickets[ticketIndex];
    const prevStatus = ticket.status;
    const { 
      status, 
      priority, 
      doctorNotes, 
      holdReason, 
      doctorId, 
      patientName,
      gender,
      age,
      contactNumber,
      actor = 'Staff Member' 
    } = body;

    // Validate status transition
    if (status) {
      const validStatuses: TicketStatus[] = [
        'WAITING', 
        'CALLED', 
        'IN_CONSULTATION', 
        'ON_HOLD', 
        'COMPLETED', 
        'NO_SHOW', 
        'CANCELLED'
      ];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status: ${status}` },
          { status: 400 }
        );
      }

      ticket.status = status;

      if (status === 'CALLED') {
        ticket.calledTime = new Date().toISOString();
      } else if (status === 'IN_CONSULTATION') {
        ticket.startTime = new Date().toISOString();
        // Update assigned doctor's current ticket
        const doc = state.doctors.find(d => d.id === ticket.doctorId);
        if (doc) {
          doc.status = 'CONSULTING';
          doc.currentTicketId = ticket.id;
        }
      } else if (status === 'COMPLETED') {
        ticket.completedTime = new Date().toISOString();
        // Free up doctor
        const doc = state.doctors.find(d => d.id === ticket.doctorId);
        if (doc && doc.currentTicketId === ticket.id) {
          doc.status = 'AVAILABLE';
          doc.currentTicketId = null;
        }
      } else if (status === 'NO_SHOW' || status === 'CANCELLED') {
        const doc = state.doctors.find(d => d.id === ticket.doctorId);
        if (doc && doc.currentTicketId === ticket.id) {
          doc.status = 'AVAILABLE';
          doc.currentTicketId = null;
        }
      }
    }

    // Priority escalation
    if (priority) {
      const validPriorities: PriorityLevel[] = ['NORMAL', 'SENIOR_CITIZEN', 'URGENT', 'EMERGENCY'];
      if (validPriorities.includes(priority)) {
        ticket.priority = priority;
        logAction(
          state,
          'PRIORITY_CHANGED',
          actor,
          `Priority of ${ticket.ticketNumber} updated to ${priority}`,
          ticket
        );
      }
    }

    if (doctorNotes !== undefined) {
      ticket.doctorNotes = doctorNotes;
    }

    if (holdReason !== undefined) {
      ticket.holdReason = holdReason;
    }

    if (gender) {
      const g = String(gender).trim().toLowerCase();
      if (g === 'male' || g === 'm') ticket.gender = 'Male';
      else if (g === 'female' || g === 'f') ticket.gender = 'Female';
      else if (g === 'other' || g === 'o') ticket.gender = 'Other';
    }

    if (patientName && typeof patientName === 'string' && patientName.trim()) {
      ticket.patientName = patientName.trim();
    }

    if (age !== undefined) {
      const parsedAge = Number(age);
      if (!isNaN(parsedAge) && parsedAge >= 0 && parsedAge <= 130) {
        ticket.age = parsedAge;
      }
    }

    if (contactNumber !== undefined && typeof contactNumber === 'string') {
      ticket.contactNumber = contactNumber.trim();
    }

    if (doctorId && doctorId !== ticket.doctorId) {
      const newDoc = state.doctors.find(d => d.id === doctorId);
      if (newDoc) {
        ticket.doctorId = doctorId;
        logAction(
          state,
          'DOCTOR_REASSIGNED',
          actor,
          `Reassigned ${ticket.ticketNumber} to ${newDoc.name}`,
          ticket
        );
      }
    }

    if (status && status !== prevStatus) {
      logAction(
        state,
        `STATUS_${status}`,
        actor,
        `Ticket ${ticket.ticketNumber} moved from ${prevStatus} to ${status}`,
        ticket
      );
    }

    saveHospitalState(state);

    return NextResponse.json({
      success: true,
      message: `Ticket ${ticket.ticketNumber} updated successfully`,
      data: ticket
    });
  } catch (error: any) {
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update ticket' },
      { status: 500 }
    );
  }
}
