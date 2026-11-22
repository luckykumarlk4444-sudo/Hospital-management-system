import { NextResponse } from 'next/server';
import { loadHospitalState } from '@/lib/store';

// GET /api/audit
export async function GET() {
  try {
    const state = loadHospitalState();
    return NextResponse.json(
      {
        success: true,
        count: state.auditLogs.length,
        data: state.auditLogs
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        }
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
