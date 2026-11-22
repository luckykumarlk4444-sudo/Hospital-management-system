import { NextRequest, NextResponse } from 'next/server';
import { loadHospitalState } from '@/lib/store';

// GET /api/departments
export async function GET() {
  try {
    const state = loadHospitalState();

    const departmentsWithStats = state.departments.map(dept => {
      const deptTickets = state.tickets.filter(t => t.departmentId === dept.id);
      const waiting = deptTickets.filter(t => t.status === 'WAITING');
      const inConsultation = deptTickets.filter(t => t.status === 'IN_CONSULTATION' || t.status === 'CALLED');
      const completed = deptTickets.filter(t => t.status === 'COMPLETED');
      const doctors = state.doctors.filter(d => d.departmentId === dept.id);

      const estimatedTotalWait = waiting.reduce((acc, t) => acc + t.estimatedWaitMinutes, 0);
      const avgWait = waiting.length > 0 ? Math.round(estimatedTotalWait / waiting.length) : 0;

      return {
        ...dept,
        stats: {
          waitingCount: waiting.length,
          inConsultationCount: inConsultation.length,
          completedCount: completed.length,
          doctorCount: doctors.length,
          averageWaitMinutes: avgWait
        }
      };
    });

    return NextResponse.json(
      {
        success: true,
        count: departmentsWithStats.length,
        data: departmentsWithStats
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        }
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch departments' },
      { status: 500 }
    );
  }
}
