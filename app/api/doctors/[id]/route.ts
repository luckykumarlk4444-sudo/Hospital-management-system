import { NextRequest, NextResponse } from 'next/server';
import { loadHospitalState, saveHospitalState, logAction } from '@/lib/store';
import { DoctorStatus } from '@/lib/types';

// PATCH /api/doctors/[id]
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { status, delayMinutes, delayReason, roomNumber } = body;
    const targetId = String(id || body?.id || body?.doctorId || '').trim();

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
      const validStatuses: DoctorStatus[] = [
        'AVAILABLE', 
        'CONSULTING', 
        'ON_BREAK', 
        'EMERGENCY_DELAY', 
        'OFFLINE'
      ];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid doctor status: ${status}` },
          { status: 400 }
        );
      }
      doctor.status = status;

      const roomLabel = doctor.roomNumber.toLowerCase().startsWith('room') 
        ? doctor.roomNumber 
        : `Room ${doctor.roomNumber}`;

      if (status === 'AVAILABLE') {
        message = `${doctor.name} is now Active and ready for consultations in ${roomLabel}.`;
        logAction(
          state,
          'DOCTOR_STATUS_UPDATE',
          doctor.name,
          `Set status to ACTIVE in ${roomLabel}. Doctor is ready for consultations.`
        );
      } else if (status === 'ON_BREAK') {
        message = `${doctor.name} is now on Break. Consultations in ${roomLabel} are temporarily paused.`;
        logAction(
          state,
          'DOCTOR_STATUS_UPDATE',
          doctor.name,
          `Set status to ON_BREAK in ${roomLabel}. Consultations temporarily paused.`
        );
      } else if (status === 'CONSULTING') {
        message = `${doctor.name} is currently in consultation in ${roomLabel}.`;
        logAction(
          state,
          'DOCTOR_STATUS_UPDATE',
          doctor.name,
          `Set status to CONSULTING in ${roomLabel}.`
        );
      } else if (status === 'OFFLINE') {
        message = `${doctor.name} is now Offline (${roomLabel} closed).`;
        logAction(
          state,
          'DOCTOR_STATUS_UPDATE',
          doctor.name,
          `Set status to OFFLINE in ${roomLabel}.`
        );
      }
    }

    if (delayMinutes !== undefined) {
      const mins = Math.max(0, Number(delayMinutes) || 0);
      doctor.delayMinutes = mins;
      doctor.delayReason = delayReason || (mins > 0 ? 'Unexpected clinical emergency' : '');

      if (mins > 0) {
        // Add announcement for patients
        const department = state.departments.find(d => d.id === doctor.departmentId);
        state.announcements.unshift({
          id: `ann-${Date.now()}`,
          message: `${doctor.name} (${department?.name || 'OPD'}, ${doctor.roomNumber}) is delayed by ~${mins} minutes: ${doctor.delayReason}`,
          severity: 'warning',
          createdAt: new Date().toISOString(),
          departmentId: doctor.departmentId
        });
        message = `Doctor ${doctor.name} delay broadcasted (+${mins} mins): ${doctor.delayReason}`;
      } else {
        message = `Doctor ${doctor.name} delay cleared. Room ${doctor.roomNumber} is back on schedule.`;
      }

      logAction(
        state,
        'DOCTOR_DELAY_UPDATE',
        doctor.name,
        `Updated delay to ${mins} minutes. Reason: ${doctor.delayReason || 'None'}`
      );
    }

    if (roomNumber) {
      doctor.roomNumber = roomNumber.trim();
      message = `Doctor ${doctor.name} relocated to Room ${doctor.roomNumber}.`;
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
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to update doctor';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
