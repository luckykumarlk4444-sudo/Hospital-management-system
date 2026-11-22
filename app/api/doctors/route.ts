import { NextRequest, NextResponse } from 'next/server';
import { loadHospitalState, saveHospitalState } from '@/lib/store';

// GET /api/doctors
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');

    const state = loadHospitalState();
    let doctors = state.doctors;

    if (departmentId) {
      doctors = doctors.filter(d => d.departmentId === departmentId);
    }

    // Enhance doctors with active queue count and current ticket details
    const doctorsWithStats = doctors.map(doc => {
      const activeTickets = state.tickets.filter(
        t => t.doctorId === doc.id && (t.status === 'WAITING' || t.status === 'CALLED')
      );
      const currentTicket = doc.currentTicketId 
        ? state.tickets.find(t => t.id === doc.currentTicketId) 
        : null;
      const department = state.departments.find(d => d.id === doc.departmentId);

      return {
        ...doc,
        departmentName: department?.name || 'General',
        waitingCount: activeTickets.length,
        currentTicket: currentTicket || null
      };
    });

    return NextResponse.json(
      {
        success: true,
        count: doctorsWithStats.length,
        data: doctorsWithStats
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        }
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch doctors' },
      { status: 500 }
    );
  }
}

// PATCH /api/doctors
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, doctorId, status, delayMinutes, delayReason, roomNumber } = body;
    const targetId = String(id || doctorId || '').trim();

    if (!targetId) {
      return NextResponse.json(
        { success: false, error: 'Doctor ID is required' },
        { status: 400 }
      );
    }

    const state = loadHospitalState();
    const doctor = state.doctors.find(
      d => d.id === targetId || d.id.toLowerCase() === targetId.toLowerCase()
    );

    if (!doctor) {
      return NextResponse.json(
        { success: false, error: `Doctor with id ${targetId} not found` },
        { status: 404 }
      );
    }

    let message = `Doctor ${doctor.name} updated successfully`;

    if (status) {
      doctor.status = status;
      const roomLabel = doctor.roomNumber.toLowerCase().startsWith('room') 
        ? doctor.roomNumber 
        : `Room ${doctor.roomNumber}`;

      if (status === 'AVAILABLE') {
        message = `${doctor.name} is now Active and ready for consultations in ${roomLabel}.`;
      } else if (status === 'ON_BREAK') {
        message = `${doctor.name} is now on Break. Consultations in ${roomLabel} are temporarily paused.`;
      }
    }

    if (delayMinutes !== undefined) {
      const mins = Math.max(0, Number(delayMinutes) || 0);
      doctor.delayMinutes = mins;
      doctor.delayReason = delayReason || (mins > 0 ? 'Unexpected clinical emergency' : '');
      message = mins > 0 
        ? `Doctor ${doctor.name} delay broadcasted (+${mins} mins): ${doctor.delayReason}`
        : `Doctor ${doctor.name} delay cleared. Room ${doctor.roomNumber} is back on schedule.`;
    }

    if (roomNumber) {
      doctor.roomNumber = roomNumber.trim();
    }

    saveHospitalState(state);

    return NextResponse.json(
      {
        success: true,
        message,
        data: doctor
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        }
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update doctor' },
      { status: 500 }
    );
  }
}
