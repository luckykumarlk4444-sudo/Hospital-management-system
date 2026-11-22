import { NextRequest, NextResponse } from 'next/server';
import { loadHospitalState, saveHospitalState, logAction } from '@/lib/store';
import { sendRegistrationEmail } from '@/lib/email';

// POST /api/email/retry - Retry sending email notification for a registration ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, email, forceRetry = true } = body;

    if (!ticketId || typeof ticketId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Ticket ID or Token Number is required to retry email' },
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

    // Update email if new address was provided
    if (email && typeof email === 'string' && email.trim()) {
      ticket.email = email.trim().toLowerCase();
    }

    const recipientEmail = ticket.email;
    if (!recipientEmail) {
      return NextResponse.json(
        { success: false, error: 'No registered email address found for this ticket. Please provide an email address.' },
        { status: 400 }
      );
    }

    const doctor = state.doctors.find(d => d.id === ticket.doctorId);
    const regDate = new Date(ticket.checkInTime).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const previousRetryCount = ticket.emailNotification?.retryCount || 0;

    const emailResult = await sendRegistrationEmail({
      ticketId: ticket.id,
      patientName: ticket.patientName,
      tokenNumber: ticket.ticketNumber,
      email: recipientEmail,
      doctorName: doctor?.name || null,
      registrationDate: regDate,
      alreadySent: ticket.emailNotification?.status === 'SENT',
      forceRetry
    });

    ticket.emailNotification = {
      status: emailResult.status,
      recipientEmail: emailResult.recipientEmail,
      subject: emailResult.subject,
      bodyText: emailResult.bodyText,
      provider: emailResult.provider,
      messageId: emailResult.messageId,
      sentAt: emailResult.sentAt,
      error: emailResult.error,
      retryCount: previousRetryCount + 1
    };

    if (emailResult.success) {
      logAction(
        state,
        'EMAIL_RETRY_SENT',
        'Staff / Patient Kiosk',
        `Resent registration email to ${emailResult.recipientEmail} for ${ticket.patientName} (${ticket.ticketNumber}) via ${emailResult.provider} (Attempt #${previousRetryCount + 1})`,
        ticket
      );
    } else {
      logAction(
        state,
        'EMAIL_RETRY_FAILED',
        'Staff / Patient Kiosk',
        `Email retry failed to ${emailResult.recipientEmail} for Token ${ticket.ticketNumber}: ${emailResult.error || 'Transmission failed'}`,
        ticket
      );
    }

    saveHospitalState(state);

    return NextResponse.json({
      success: emailResult.success,
      message: emailResult.success
        ? `Registration email resent to ${emailResult.recipientEmail}`
        : `Email delivery failed: ${emailResult.error}`,
      email: emailResult,
      data: ticket
    });
  } catch (error: any) {
    console.error('Error retrying email:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process email retry' },
      { status: 500 }
    );
  }
}
