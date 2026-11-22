import { NextResponse } from 'next/server';
import { loadHospitalState } from '@/lib/store';

// GET /api/stats
export async function GET() {
  try {
    const state = loadHospitalState();

    const totalTickets = state.tickets.length;
    const waitingTickets = state.tickets.filter(t => t.status === 'WAITING');
    const calledTickets = state.tickets.filter(t => t.status === 'CALLED');
    const consultingTickets = state.tickets.filter(t => t.status === 'IN_CONSULTATION');
    const onHoldTickets = state.tickets.filter(t => t.status === 'ON_HOLD');
    const completedTickets = state.tickets.filter(t => t.status === 'COMPLETED');
    const urgentTickets = state.tickets.filter(
      t => (t.priority === 'URGENT' || t.priority === 'EMERGENCY') && 
           (t.status === 'WAITING' || t.status === 'CALLED')
    );

    const activeWaitTimes = waitingTickets.map(t => t.estimatedWaitMinutes);
    const avgWaitMinutes = activeWaitTimes.length > 0 
      ? Math.round(activeWaitTimes.reduce((a, b) => a + b, 0) / activeWaitTimes.length) 
      : 0;

    const activeDoctors = state.doctors.filter(d => d.status === 'CONSULTING' || d.status === 'AVAILABLE').length;

    return NextResponse.json({
      success: true,
      data: {
        totalTickets,
        waitingCount: waitingTickets.length,
        calledCount: calledTickets.length,
        consultingCount: consultingTickets.length,
        onHoldCount: onHoldTickets.length,
        completedCount: completedTickets.length,
        urgentWaitingCount: urgentTickets.length,
        activeDoctorsCount: activeDoctors,
        totalDoctorsCount: state.doctors.length,
        avgWaitMinutes,
        auditLogsCount: state.auditLogs.length
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
