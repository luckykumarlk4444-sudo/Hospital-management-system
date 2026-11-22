import { NextRequest, NextResponse } from 'next/server';
import { 
  loadHospitalState, 
  saveHospitalState, 
  logAction,
  getPriorityWeight 
} from '@/lib/store';

// POST /api/queue/call-next
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { doctorId, autoCompleteCurrent = false } = body;

    if (!doctorId) {
      return NextResponse.json(
        { success: false, error: 'Doctor ID is required' },
        { status: 400 }
      );
    }

    const state = loadHospitalState();
    const doctor = state.doctors.find(d => d.id === doctorId);

    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'Doctor not found' },
        { status: 404 }
      );
    }

    // If currently consulting a patient and autoCompleteCurrent is true, complete previous ticket
    if (doctor.currentTicketId && autoCompleteCurrent) {
      const currentTicket = state.tickets.find(t => t.id === doctor.currentTicketId);
      if (currentTicket && (currentTicket.status === 'IN_CONSULTATION' || currentTicket.status === 'CALLED')) {
        currentTicket.status = 'COMPLETED';
        currentTicket.completedTime = new Date().toISOString();
        logAction(
          state,
          'CONSULTATION_COMPLETED',
          doctor.name,
          `Completed session for ${currentTicket.patientName} (${currentTicket.ticketNumber})`,
          currentTicket
        );
      }
    }

    // Find all waiting tickets for this doctor
    const waitingTickets = state.tickets.filter(
      t => t.doctorId === doctorId && t.status === 'WAITING'
    );

    if (waitingTickets.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `No waiting patients in queue for ${doctor.name}. Queue is clear!` 
        },
        { status: 404 }
      );
    }

    // Sort by priority weight (desc) and checkInTime (asc)
    waitingTickets.sort((a, b) => {
      const weightDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
      if (weightDiff !== 0) return weightDiff;
      return new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime();
    });

    const nextTicket = waitingTickets[0];
    nextTicket.status = 'CALLED';
    nextTicket.calledTime = new Date().toISOString();

    doctor.status = 'CONSULTING';
    doctor.currentTicketId = nextTicket.id;

    logAction(
      state,
      'PATIENT_CALLED',
      doctor.name,
      `Called ${nextTicket.patientName} (${nextTicket.ticketNumber}) to ${doctor.roomNumber}. Priority: ${nextTicket.priority}`,
      nextTicket
    );

    saveHospitalState(state);

    return NextResponse.json({
      success: true,
      message: `Called ${nextTicket.patientName} (${nextTicket.ticketNumber}) to ${doctor.roomNumber}`,
      data: {
        ticket: nextTicket,
        doctor: {
          id: doctor.id,
          name: doctor.name,
          roomNumber: doctor.roomNumber,
          status: doctor.status
        }
      }
    });
  } catch (error: any) {
    console.error('Error calling next patient:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to call next patient' },
      { status: 500 }
    );
  }
}
