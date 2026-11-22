import { NextRequest, NextResponse } from 'next/server';
import { loadHospitalState, saveHospitalState, logAction } from '@/lib/store';
import { HospitalAnnouncement } from '@/lib/types';

// GET /api/announcements
export async function GET() {
  try {
    const state = loadHospitalState();
    return NextResponse.json(
      {
        success: true,
        data: state.announcements || []
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        }
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch announcements' },
      { status: 500 }
    );
  }
}

// POST /api/announcements
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, severity = 'info', departmentId } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Announcement message is required' },
        { status: 400 }
      );
    }

    const state = loadHospitalState();
    const newAnnouncement: HospitalAnnouncement = {
      id: `ann-${Date.now()}`,
      message: message.trim(),
      severity: ['info', 'warning', 'alert'].includes(severity) ? severity : 'info',
      createdAt: new Date().toISOString(),
      departmentId: departmentId || undefined
    };

    state.announcements.unshift(newAnnouncement);
    logAction(
      state,
      'BROADCAST_ANNOUNCEMENT',
      'Hospital Operations',
      `Posted announcement: "${newAnnouncement.message}"`
    );

    saveHospitalState(state);

    return NextResponse.json(
      { success: true, message: 'Announcement broadcasted', data: newAnnouncement },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to post announcement' },
      { status: 500 }
    );
  }
}
