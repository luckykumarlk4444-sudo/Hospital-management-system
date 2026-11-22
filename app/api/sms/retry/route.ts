import { NextRequest, NextResponse } from 'next/server';
import { loadHospitalState, saveHospitalState, logAction } from '@/lib/store';
import { sendRegistrationSMS } from '@/lib/sms';

// POST /api/sms/retry - Retry sending SMS notification for a registration ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, contactNumber, forceRetry = true } = body;

    if (!ticketId || typeof ticketId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Ticket ID or Token Number is required to retry SMS' },
        { status: 400 }
      );
    }

    const state = loadHospitalState();
    const query = ticketId.trim();
    const ticket = state.tickets.find(
      t => t.id === query || t.ticketNumber.toUpperCase() === query.toUpperCase()
    );

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: `Ticket not found for identifier "${ticketId}"` },
        { status: 404 }
      );
    }

    // If updated contact number was provided, update ticket record
    if (contactNumber && typeof contactNumber === 'string' && contactNumber.trim()) {
      ticket.contactNumber = contactNumber.trim();
    }

    const doctor = state.doctors.find(d => d.id === ticket.doctorId);
    const regDate = new Date(ticket.checkInTime).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const previousRetryCount = ticket.smsNotification?.retryCount || 0;

    const smsResult = await sendRegistrationSMS({
      ticketId: ticket.id,
      patientName: ticket.patientName,
      tokenNumber: ticket.ticketNumber,
      contactNumber: ticket.contactNumber,
      doctorName: doctor?.name || null,
      registrationDate: regDate,
      alreadySent: ticket.smsNotification?.status === 'SENT',
      forceRetry
    });

    ticket.smsNotification = {
      status: smsResult.status,
      recipientNumber: smsResult.recipientNumber,
      messageText: smsResult.messageText,
      gateway: smsResult.gateway,
      messageId: smsResult.messageId,
      sentAt: smsResult.sentAt,
      error: smsResult.error,
      retryCount: previousRetryCount + 1
    };

    if (smsResult.success) {
      logAction(
        state,
        'SMS_RETRY_SENT',
        'Staff / Patient Kiosk',
        `Resent registration SMS to ${smsResult.recipientNumber} for ${ticket.patientName} (${ticket.ticketNumber}) via ${smsResult.gateway} (Attempt #${previousRetryCount + 1})`,
        ticket
      );
    } else {
      logAction(
        state,
        'SMS_RETRY_FAILED',
        'Staff / Patient Kiosk',
        `SMS retry failed to ${smsResult.recipientNumber} for Token ${ticket.ticketNumber}: ${smsResult.error || 'Delivery failed'}`,
        ticket
      );
    }

    saveHospitalState(state);

    if (smsResult.success) {
      return NextResponse.json({
        success: true,
        message: `SMS successfully sent to ${smsResult.recipientNumber} via ${smsResult.gateway}`,
        data: ticket,
        sms: smsResult
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: smsResult.error || 'SMS gateway could not deliver message. Please verify mobile number.',
        data: ticket,
        sms: smsResult
      },
      { status: 422 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal error processing SMS retry';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
