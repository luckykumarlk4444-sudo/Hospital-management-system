import { NextResponse } from 'next/server';
import { resetAndSeedState } from '@/lib/store';

// POST /api/seed
export async function POST() {
  try {
    const freshState = resetAndSeedState();
    return NextResponse.json({
      success: true,
      message: 'Hospital queue database reset and re-seeded successfully with demo data.',
      data: {
        departmentsCount: freshState.departments.length,
        doctorsCount: freshState.doctors.length,
        ticketsCount: freshState.tickets.length
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to re-seed demo data' },
      { status: 500 }
    );
  }
}
