'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Navbar, { ViewMode } from '@/components/Navbar';
import PatientView from '@/components/PatientView';
import DoctorView from '@/components/DoctorView';
import ReceptionView from '@/components/ReceptionView';
import DisplayView from '@/components/DisplayView';
import AnalyticsView from '@/components/AnalyticsView';
import { 
  QueueTicket, 
  Doctor, 
  Department, 
  HospitalAnnouncement, 
  AuditLog, 
  PriorityLevel,
  TicketStatus
} from '@/lib/types';
import { announcePatientCall, unlockAudio } from '@/lib/audio';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [currentView, setCurrentView] = useState<ViewMode>('reception');
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [announcements, setAnnouncements] = useState<HospitalAnnouncement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Fetch all live data
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const t = Date.now();
      const fetchOpts: RequestInit = {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache'
        }
      };
      const [ticketsRes, docsRes, deptsRes, annRes, auditRes] = await Promise.all([
        fetch(`/api/queue?_t=${t}`, fetchOpts),
        fetch(`/api/doctors?_t=${t}`, fetchOpts),
        fetch(`/api/departments?_t=${t}`, fetchOpts),
        fetch(`/api/announcements?_t=${t}`, fetchOpts),
        fetch(`/api/audit?_t=${t}`, fetchOpts)
      ]);

      if (ticketsRes.ok) {
        const data = await ticketsRes.json();
        setTickets(data.data || []);
      }
      if (docsRes.ok) {
        const data = await docsRes.json();
        const serverDocs: Doctor[] = data.data || [];
        try {
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('pulsequeue_doctor_overrides');
            if (stored) {
              const overrides = JSON.parse(stored);
              const now = Date.now();
              const merged = serverDocs.map(doc => {
                const override = overrides[doc.id];
                if (override && (now - (override._updatedAt || 0) < 60 * 60 * 1000)) {
                  return {
                    ...doc,
                    ...(override.status ? { status: override.status } : {}),
                    ...(override.delayMinutes !== undefined ? { delayMinutes: override.delayMinutes } : {}),
                    ...(override.delayReason !== undefined ? { delayReason: override.delayReason } : {})
                  };
                }
                return doc;
              });
              setDoctors(merged);
            } else {
              setDoctors(serverDocs);
            }
          } else {
            setDoctors(serverDocs);
          }
        } catch {
          setDoctors(serverDocs);
        }
      }
      if (deptsRes.ok) {
        const data = await deptsRes.json();
        setDepartments(data.data || []);
      }
      if (annRes.ok) {
        const data = await annRes.json();
        setAnnouncements(data.data || []);
      }
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching live queue data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load and periodic polling every 4 seconds
  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => {
      fetchData(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handler: Patient Check-In
  const handleCheckIn = async (data: any): Promise<QueueTicket | null> => {
    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Check-in failed');
      }

      // Automatic SMS & Email Notification feedback
      if (result.sms) {
        if (result.sms.success) {
          showToast(`Generated token ${result.data.ticketNumber}! 📱 SMS sent to ${result.sms.recipientNumber}`, 'success');
        } else {
          showToast(`Token ${result.data.ticketNumber} generated. ⚠️ SMS failed: ${result.sms.error || 'Delivery error'}`, 'error');
        }
      }

      if (result.email) {
        if (result.email.success) {
          showToast(`📧 Email confirmation sent to ${result.email.recipientEmail}`, 'success');
        } else {
          showToast(`📧 Email notification queued for ${result.email.recipientEmail}`, 'info');
        }
      }

      if (!result.sms && !result.email) {
        showToast(`Generated token ${result.data.ticketNumber} for ${result.data.patientName}!`, 'success');
      }

      await fetchData(true);
      return result.data;
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  // Handler: Retry SMS Notification
  const handleRetrySMS = async (ticketId: string, contactNumber?: string) => {
    try {
      const res = await fetch('/api/sms/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, contactNumber, forceRetry: true })
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to resend SMS notification');
      }
      showToast(`📱 SMS confirmation resent to ${result.data.contactNumber}!`, 'success');
      await fetchData(true);
      return result.data;
    } catch (err: any) {
      showToast(err.message || 'SMS retry failed', 'error');
      throw err;
    }
  };

  // Handler: Retry Email Notification
  const handleRetryEmail = async (ticketId: string, email?: string) => {
    try {
      const res = await fetch('/api/email/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, email, forceRetry: true })
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to resend email notification');
      }
      showToast(`📧 Confirmation email resent to ${result.data.email}!`, 'success');
      await fetchData(true);
      return result.data;
    } catch (err: any) {
      showToast(err.message || 'Email retry failed', 'error');
      throw err;
    }
  };

  // Handler: Doctor Calls Next
  const handleCallNext = async (doctorId: string, autoCompleteCurrent: boolean = true) => {
    try {
      unlockAudio();
      const res = await fetch('/api/queue/call-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId, autoCompleteCurrent })
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to call next patient');
      }
      showToast(result.message, 'success');
      await fetchData(true);
      return result;
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  // Handler: Update Ticket Status
  const handleUpdateTicketStatus = async (
    ticketId: string, 
    status: string, 
    notes?: string, 
    holdReason?: string
  ) => {
    // Instant optimistic update
    setTickets(prev =>
      prev.map(t =>
        t.id === ticketId
          ? {
              ...t,
              status: status as TicketStatus,
              doctorNotes: notes !== undefined ? notes : t.doctorNotes,
              holdReason: holdReason !== undefined ? holdReason : t.holdReason
            }
          : t
      )
    );
    try {
      const res = await fetch(`/api/queue/${encodeURIComponent(ticketId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, doctorNotes: notes, holdReason })
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to update ticket status');
      }
      showToast(result.message, 'success');
      await fetchData(true);
      return result.data;
    } catch (err: any) {
      showToast(err.message, 'error');
      await fetchData(true);
      throw err;
    }
  };

  // Handler: Update Priority (Triage Escalation)
  const handleUpdatePriority = async (ticketId: string, priority: PriorityLevel) => {
    // Instant optimistic update
    setTickets(prev =>
      prev.map(t => (t.id === ticketId ? { ...t, priority } : t))
    );
    try {
      const res = await fetch(`/api/queue/${encodeURIComponent(ticketId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority })
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to update priority');
      }
      showToast(`Updated ${result.data.ticketNumber} priority to ${priority}!`, 'info');
      await fetchData(true);
      return result.data;
    } catch (err: any) {
      showToast(err.message, 'error');
      await fetchData(true);
      throw err;
    }
  };

  // Handler: Reassign Doctor
  const handleReassignDoctor = async (ticketId: string, doctorId: string) => {
    // Instant optimistic update
    setTickets(prev =>
      prev.map(t => (t.id === ticketId ? { ...t, doctorId } : t))
    );
    try {
      const res = await fetch(`/api/queue/${encodeURIComponent(ticketId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId })
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to reassign doctor');
      }
      showToast(`Reassigned ${result.data.ticketNumber} to new physician!`, 'info');
      await fetchData(true);
      return result.data;
    } catch (err: any) {
      showToast(err.message, 'error');
      await fetchData(true);
      throw err;
    }
  };

  // Handler: Update Doctor (Delay or Status)
  const handleUpdateDoctor = async (doctorId: string, data: any) => {
    // 1. Instant optimistic update so UI toggles immediately on phone & laptop
    setDoctors(prev =>
      prev.map(doc => (doc.id === doctorId ? { ...doc, ...data } : doc))
    );

    // Persist in localStorage so background polls never revert user's deliberate action
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('pulsequeue_doctor_overrides');
        const overrides = stored ? JSON.parse(stored) : {};
        overrides[doctorId] = {
          ...overrides[doctorId],
          ...data,
          _updatedAt: Date.now()
        };
        localStorage.setItem('pulsequeue_doctor_overrides', JSON.stringify(overrides));
      }
    } catch {}

    try {
      const payload = { doctorId, id: doctorId, ...data };
      const res = await fetch(`/api/doctors/${encodeURIComponent(doctorId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to update doctor profile');
      }
      if (result.data) {
        setDoctors(prev =>
          prev.map(doc => (doc.id === doctorId ? { ...doc, ...result.data } : doc))
        );
      }
      const toastType = data.status === 'AVAILABLE' ? 'success' : 'info';
      showToast(result.message, toastType);
      fetchData(true);
      return result.data;
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  // Handler: Broadcast Announcement
  const handleBroadcastAnnouncement = async (
    message: string, 
    severity: string = 'info', 
    departmentId?: string
  ) => {
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, severity, departmentId })
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to post announcement');
      }
      showToast('Announcement broadcasted across hospital screens!', 'success');
      await fetchData(true);
      return result.data;
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  // Quick Demo Scenario 1: Quick Patient Check-In
  const handleQuickPatient = async () => {
    const demoPatients: { patientName: string; gender: 'Male' | 'Female' }[] = [
      { patientName: 'Neha Agarwal', gender: 'Female' },
      { patientName: 'Arjun Kapoor', gender: 'Male' },
      { patientName: 'Siddharth Rao', gender: 'Male' },
      { patientName: 'Rohit Sen', gender: 'Male' },
      { patientName: 'Maya Menon', gender: 'Female' }
    ];
    const demoPatient = demoPatients[Math.floor(Math.random() * demoPatients.length)];
    const randomAge = Math.floor(Math.random() * 45) + 20;
    const defaultDept = departments[0]?.id || 'dept-gen';

    try {
      const ticket = await handleCheckIn({
        patientName: demoPatient.patientName,
        age: randomAge,
        gender: demoPatient.gender,
        contactNumber: '+91 98765 11223',
        email: `${demoPatient.patientName.toLowerCase().replace(/\s+/g, '.')}@pulsequeue.local`,
        departmentId: defaultDept,
        priority: 'NORMAL',
        chiefComplaint: 'Mild seasonal allergies and headache'
      });
      if (ticket) {
        setSelectedTicketId(ticket.id);
        setCurrentView('patient');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Demo Scenario 2: Quick Doctor Call Next
  const handleCallNextQuick = async () => {
    unlockAudio();
    const activeDoc = doctors[0];
    if (!activeDoc) return;
    try {
      const res = await handleCallNext(activeDoc.id, true);
      if (res && res.data && res.data.ticket) {
        announcePatientCall(
          res.data.ticket.ticketNumber, 
          activeDoc.roomNumber, 
          res.data.ticket.patientName
        );
      }
      setCurrentView('doctor');
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Demo Scenario 3: Simulate Emergency Triage
  const handleSimulateEmergency = async () => {
    const defaultDept = departments[0]?.id || 'dept-gen';
    try {
      const ticket = await handleCheckIn({
        patientName: 'Devendra Singhania (CRITICAL)',
        age: 56,
        gender: 'Male',
        contactNumber: '+91 99999 10800',
        departmentId: defaultDept,
        priority: 'EMERGENCY',
        chiefComplaint: 'Acute chest pain radiating to left arm, sweating, BP 160/100'
      });
      if (ticket) {
        setSelectedTicketId(ticket.id);
        setCurrentView('reception');
        showToast('🚨 EMERGENCY CASE ENTERED! Jumps to position #1 in queue.', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Demo Scenario 4: Reset & Seed Data
  const handleResetData = async () => {
    if (!confirm('Reset entire queue and seed fresh demo hospital data?')) return;
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        showToast('Hospital database reset & re-seeded with realistic data!', 'success');
        await fetchData(true);
      }
    } catch (err) {
      showToast('Failed to reset data', 'error');
    }
  };

  const waitingCount = tickets.filter(t => t.status === 'WAITING').length;

  return (
    <div className="min-h-screen flex flex-col medical-bg-mesh text-slate-900 selection:bg-teal-500 selection:text-white">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 text-xs font-semibold ${
            toastMessage.type === 'error'
              ? 'bg-rose-950/90 text-rose-100 border-rose-500/40 glow-rose'
              : toastMessage.type === 'info'
              ? 'bg-slate-900/90 text-slate-100 border-slate-700/60 shadow-lg'
              : 'bg-emerald-950/90 text-emerald-100 border-emerald-500/40 glow-teal'
          }`}>
            {toastMessage.type === 'error' ? (
              <div className="w-6 h-6 rounded-lg bg-rose-500/20 flex items-center justify-center shrink-0 border border-rose-500/30">
                <AlertCircle className="w-4 h-4 text-rose-400" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              </div>
            )}
            <span className="tracking-wide">{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <Navbar
        currentView={currentView}
        onViewChange={setCurrentView}
        onQuickPatient={handleQuickPatient}
        onCallNextQuick={handleCallNextQuick}
        onSimulateEmergency={handleSimulateEmergency}
        onResetData={handleResetData}
        isRefreshing={isRefreshing}
        onManualRefresh={() => fetchData()}
        waitingCount={waitingCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 pb-28 md:pb-12 transition-all">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-28 text-slate-500">
            <div className="relative mb-4">
              <div className="w-14 h-14 border-4 border-teal-500/20 border-t-teal-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 bg-teal-500 rounded-full animate-ping"></div>
              </div>
            </div>
            <p className="text-sm font-semibold tracking-wide text-slate-700">Connecting to Outpatient Engine...</p>
            <p className="text-xs text-slate-400 mt-1">Synchronizing live queue, active rooms and triage status</p>
          </div>
        ) : (
          <>
            {currentView === 'reception' && (
              <ReceptionView
                tickets={tickets}
                departments={departments}
                doctors={doctors}
                onCheckIn={handleCheckIn}
                onUpdateTicketStatus={handleUpdateTicketStatus}
                onUpdatePriority={handleUpdatePriority}
                onReassignDoctor={handleReassignDoctor}
                onBroadcastAnnouncement={handleBroadcastAnnouncement}
                onSelectTicket={(id) => {
                  setSelectedTicketId(id);
                  setCurrentView('patient');
                }}
                onRetrySMS={handleRetrySMS}
                onRetryEmail={handleRetryEmail}
              />
            )}

            {currentView === 'doctor' && (
              <DoctorView
                doctors={doctors}
                tickets={tickets}
                departments={departments}
                onCallNext={handleCallNext}
                onUpdateTicketStatus={handleUpdateTicketStatus}
                onUpdateDoctor={handleUpdateDoctor}
              />
            )}

            {currentView === 'patient' && (
              <PatientView
                departments={departments}
                doctors={doctors}
                tickets={tickets}
                onCheckIn={handleCheckIn}
                activeTicketId={selectedTicketId}
                onSelectTicket={setSelectedTicketId}
                onRetrySMS={handleRetrySMS}
                onRetryEmail={handleRetryEmail}
              />
            )}

            {currentView === 'display' && (
              <DisplayView
                doctors={doctors}
                tickets={tickets}
                departments={departments}
                announcements={announcements}
              />
            )}

            {currentView === 'analytics' && (
              <AnalyticsView
                departments={departments}
                doctors={doctors}
                tickets={tickets}
                auditLogs={auditLogs}
              />
            )}
          </>
        )}
      </main>

      {/* Hospital Footer */}
      <footer className="backdrop-blur-md bg-white/80 border-t border-slate-200/80 mt-auto py-5 text-xs text-slate-500 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span className="font-semibold text-slate-700">PulseQueue Clinical Operations Suite</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">Smart Healthcare Queue Management System</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-slate-600">Next.js 16</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-slate-600">React 19</span>
            <span className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200/80 text-teal-700 font-semibold">Web Audio Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
