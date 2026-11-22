'use client';

import React, { useState, useEffect } from 'react';
import { 
  Doctor, 
  QueueTicket, 
  Department, 
  DoctorStatus,
  PriorityLevel 
} from '@/lib/types';
import { 
  Stethoscope, 
  PhoneCall, 
  CheckCircle2, 
  Clock, 
  PauseCircle, 
  UserX, 
  FileText,
  Volume2,
  Coffee,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { announcePatientCall, announceDoctorStatus, announceDoctorDelay, unlockAudio } from '@/lib/audio';

interface DoctorViewProps {
  doctors: Doctor[];
  tickets: QueueTicket[];
  departments: Department[];
  onCallNext: (doctorId: string, autoCompleteCurrent: boolean) => Promise<{ success: boolean; data?: { ticket?: QueueTicket }; message?: string }>;
  onUpdateTicketStatus: (ticketId: string, status: string, notes?: string, holdReason?: string) => Promise<unknown>;
  onUpdateDoctor: (doctorId: string, data: Partial<Doctor>) => Promise<unknown>;
}

export default function DoctorView({
  doctors,
  tickets,
  departments,
  onCallNext,
  onUpdateTicketStatus,
  onUpdateDoctor
}: DoctorViewProps) {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctors[0]?.id || '');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [delayInputMinutes, setDelayInputMinutes] = useState('15');
  const [delayReasonInput, setDelayReasonInput] = useState('Emergency clinical review');
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [isCallingNext, setIsCallingNext] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Keep selectedDoctorId in sync when doctors load or change
  useEffect(() => {
    if ((!selectedDoctorId || !doctors.some(d => d.id === selectedDoctorId)) && doctors.length > 0) {
      setSelectedDoctorId(doctors[0].id);
    }
  }, [doctors, selectedDoctorId]);

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId) || doctors[0];
  const doctorDept = selectedDoctor ? departments.find(d => d.id === selectedDoctor.departmentId) : null;

  // Active tickets for this doctor
  const doctorTickets = tickets.filter(t => t.doctorId === selectedDoctor?.id);
  const waitingTickets = doctorTickets.filter(t => t.status === 'WAITING' || t.status === 'CALLED');
  const currentTicket = doctorTickets.find(
    t => t.id === selectedDoctor?.currentTicketId || t.status === 'IN_CONSULTATION' || t.status === 'CALLED'
  );

  const handleCallNext = async () => {
    if (!selectedDoctor) return;
    unlockAudio();
    setIsCallingNext(true);
    try {
      const res = await onCallNext(selectedDoctor.id, true);
      if (res && res.data && res.data.ticket) {
        // Trigger hospital chime and natural female voice announcement with patient name!
        announcePatientCall(
          res.data.ticket.ticketNumber, 
          selectedDoctor.roomNumber, 
          res.data.ticket.patientName
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not call next patient.';
      alert(msg);
    } finally {
      setIsCallingNext(false);
    }
  };

  const handleStartConsultation = async () => {
    if (!currentTicket) return;
    await onUpdateTicketStatus(currentTicket.id, 'IN_CONSULTATION');
  };

  const handleCompleteConsultation = async () => {
    if (!currentTicket) return;
    await onUpdateTicketStatus(currentTicket.id, 'COMPLETED', doctorNotes);
    setDoctorNotes('');
  };

  const handleHoldConsultation = async () => {
    if (!currentTicket) return;
    await onUpdateTicketStatus(currentTicket.id, 'ON_HOLD', undefined, holdReason || 'Sent for laboratory / radiological investigation');
    setShowHoldModal(false);
    setHoldReason('');
  };

  const handleNoShow = async () => {
    if (!currentTicket) return;
    if (confirm(`Mark ${currentTicket.patientName} (${currentTicket.ticketNumber}) as No-Show?`)) {
      await onUpdateTicketStatus(currentTicket.id, 'NO_SHOW');
    }
  };

  const handleSaveDelay = async () => {
    if (!selectedDoctor) return;
    const mins = parseInt(delayInputMinutes, 10) || 0;

    unlockAudio();
    setShowDelayModal(false); // Close dialog instantly so user does not need to click Cancel manually

    // Immediate female voice announcement with chime for delay
    announceDoctorDelay(mins, delayReasonInput);

    try {
      await onUpdateDoctor(selectedDoctor.id, {
        delayMinutes: mins,
        delayReason: delayReasonInput
      });
    } catch (err) {
      console.error('Error broadcasting doctor delay:', err);
    }
  };

  const handleStatusChange = async (status: DoctorStatus) => {
    if (!selectedDoctor || isUpdatingStatus) return;

    unlockAudio();

    // Immediate female voice announcement for Active vs Break
    if (status === 'AVAILABLE') {
      announceDoctorStatus('ACTIVE');
    } else if (status === 'ON_BREAK') {
      announceDoctorStatus('BREAK');
    }

    setIsUpdatingStatus(true);
    try {
      await onUpdateDoctor(selectedDoctor.id, { status });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'EMERGENCY':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse glow-rose">EMERGENCY</span>;
      case 'URGENT':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-2xs">URGENT</span>;
      case 'SENIOR_CITIZEN':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-600 text-white shadow-2xs">SENIOR 65+</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">NORMAL</span>;
    }
  };

  if (!selectedDoctor) {
    return <div className="p-8 text-center text-slate-500">No doctor profiles found.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Doctor Header & Selector */}
      <div className="glass-panel rounded-3xl border border-slate-200/90 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-teal-500/25 border border-teal-400/40">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{selectedDoctor.name}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-teal-100 text-teal-800 border border-teal-200 shadow-2xs">
                {selectedDoctor.roomNumber}
              </span>
              {selectedDoctor.status === 'ON_BREAK' ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                  <Coffee className="w-3 h-3 text-amber-700" />
                  On Break
                </span>
              ) : selectedDoctor.status === 'CONSULTING' ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-teal-100 text-teal-900 border border-teal-300 flex items-center gap-1 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                  In Consultation
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {selectedDoctor.specialty} • {doctorDept?.name}
            </p>
          </div>
        </div>

        {/* Doctor Switcher & Status */}
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-end gap-3 w-full md:w-auto">
          <div className="w-full sm:w-auto">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Switch Doctor Room:</label>
            <select
              value={selectedDoctorId}
              onChange={e => setSelectedDoctorId(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-800 shadow-2xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
            >
              {doctors.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.roomNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Room Status:</label>
            <div className="flex sm:inline-flex rounded-xl border border-slate-200 p-1 bg-slate-100/90 text-xs shadow-inner">
              <button
                onClick={() => handleStatusChange('AVAILABLE')}
                disabled={isUpdatingStatus}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedDoctor.status !== 'ON_BREAK' && selectedDoctor.status !== 'OFFLINE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title="Set room to Active and ready for consultations"
              >
                Active
              </button>
              <button
                onClick={() => handleStatusChange('ON_BREAK')}
                disabled={isUpdatingStatus}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedDoctor.status === 'ON_BREAK'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title="Pause room consultations and set to Break"
              >
                <Coffee className="w-3.5 h-3.5" />
                Break
              </button>
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <button
              onClick={() => {
                unlockAudio();
                setDelayInputMinutes(selectedDoctor.delayMinutes > 0 ? String(selectedDoctor.delayMinutes) : '15');
                setDelayReasonInput(selectedDoctor.delayReason || 'Emergency clinical review');
                setShowDelayModal(true);
              }}
              className={`w-full sm:w-auto px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                selectedDoctor.delayMinutes > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 glow-amber'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              {selectedDoctor.delayMinutes > 0 ? `Delayed (+${selectedDoctor.delayMinutes}m)` : 'Set Delay Alert'}
            </button>
          </div>
        </div>
      </div>

      {/* Break Alert Banner when doctor is on break */}
      {selectedDoctor.status === 'ON_BREAK' && (
        <div className="bg-amber-50/90 border border-amber-300/80 rounded-2xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0 shadow-2xs">
              <Coffee className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <span className="font-extrabold text-amber-950 text-sm block">Room Status: On Break</span>
              <span className="text-amber-800 font-medium">Consultations in {selectedDoctor.roomNumber.toLowerCase().startsWith('room') ? selectedDoctor.roomNumber : `Room ${selectedDoctor.roomNumber}`} are temporarily paused. Patients in queue are notified.</span>
            </div>
          </div>
          <button
            onClick={() => handleStatusChange('AVAILABLE')}
            disabled={isUpdatingStatus}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
          >
            Resume Room (Set Active)
          </button>
        </div>
      )}

      {/* Main Grid: Active Consultation & Call Next */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Consultation Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Big Action Bar */}
          <div className="relative rounded-3xl p-6.5 text-white shadow-xl overflow-hidden bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 border border-teal-800/50">
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs uppercase font-extrabold text-teal-300 tracking-wider mb-1.5 bg-teal-950/80 px-2.5 py-0.5 rounded-full border border-teal-700/50">
                  <Sparkles className="w-3 h-3 text-teal-400" />
                  Queue Dispatch
                </div>
                <h2 className="text-2xl font-black tracking-tight">
                  {waitingTickets.length} Patients in Line
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-md font-medium">
                  Automated priority scheduling actively places Emergency and Urgent cases ahead of routine visits.
                </p>
              </div>

              <button
                onClick={handleCallNext}
                disabled={isCallingNext || waitingTickets.length === 0}
                className="w-full sm:w-auto px-7 py-4 bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-teal-500/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer whitespace-nowrap glow-teal active:scale-95"
              >
                <PhoneCall className={`w-4 h-4 ${isCallingNext ? 'animate-bounce' : ''}`} />
                <span>{isCallingNext ? 'Summoning...' : 'CALL NEXT PATIENT'}</span>
              </button>
            </div>
          </div>

          {/* Current Patient In Room Card */}
          {currentTicket ? (
            <div className="glass-panel rounded-3xl border-2 border-teal-500/60 shadow-xl p-6 relative overflow-hidden glow-teal">
              <div className="absolute top-0 right-0 px-4 py-1.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-[11px] font-black rounded-bl-2xl uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                Active Consultation Room
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="text-3xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-700 to-cyan-700">
                      {currentTicket.ticketNumber}
                    </span>
                    {getPriorityBadge(currentTicket.priority)}
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      currentTicket.status === 'CALLED'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}>
                      {currentTicket.status === 'CALLED' ? 'Called (Waiting Entry)' : 'In Consultation'}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {currentTicket.patientName} <span className="text-slate-400 font-normal">({currentTicket.age} yrs, {currentTicket.gender})</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Contact: {currentTicket.contactNumber}</p>
                </div>

                <div className="text-right text-xs text-slate-500 font-medium">
                  <div>Checked-in: {new Date(currentTicket.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  {currentTicket.calledTime && (
                    <div className="text-teal-700 font-bold mt-0.5">
                      Called: {new Date(currentTicket.calledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>

              {/* Chief Complaint */}
              <div className="mb-4 bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Chief Complaint</span>
                <p className="text-xs text-slate-800 font-medium">{currentTicket.chiefComplaint}</p>
              </div>

              {/* Clinical Notes Input */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-teal-600" />
                  Doctor Consultation Notes &amp; Prescription Summary:
                </label>
                <textarea
                  rows={3}
                  placeholder="Record vitals, diagnosis, prescriptions, or follow-up instructions..."
                  value={doctorNotes}
                  onChange={e => setDoctorNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    unlockAudio();
                    announcePatientCall(currentTicket.ticketNumber, selectedDoctor.roomNumber, currentTicket.patientName);
                  }}
                  className="px-3.5 py-2.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 rounded-xl text-xs font-bold border border-cyan-200 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="Re-broadcast hospital chime & voice announcement to waiting lobby"
                >
                  <Volume2 className="w-4 h-4 text-cyan-600" />
                  <span>Announce Voice</span>
                </button>

                {currentTicket.status === 'CALLED' && (
                  <button
                    onClick={handleStartConsultation}
                    className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Patient Entered (Begin)</span>
                  </button>
                )}

                <button
                  onClick={handleCompleteConsultation}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete &amp; Save</span>
                </button>

                <button
                  onClick={() => setShowHoldModal(true)}
                  className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl text-xs font-bold border border-purple-200 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <PauseCircle className="w-4 h-4 text-purple-600" />
                  <span>Hold (Lab / ECG)</span>
                </button>

                <button
                  onClick={handleNoShow}
                  className="px-3.5 py-2.5 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl text-xs font-medium border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
                >
                  <UserX className="w-4 h-4 text-rose-500" />
                  <span>No-Show</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-3xl border border-slate-200/90 p-10 text-center shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center mx-auto mb-3">
                <Stethoscope className="w-7 h-7 text-teal-600" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Patient Currently in Consultation Room</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4 font-medium">
                Click <strong>&quot;CALL NEXT PATIENT&quot;</strong> above to summon the highest priority patient from the waiting line.
              </p>
            </div>
          )}
        </div>

        {/* Right Col: Waiting Queue for this Doctor */}
        <div className="space-y-4">
          <div className="glass-panel rounded-3xl border border-slate-200/90 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Assigned Queue ({waitingTickets.length})</h3>
                <p className="text-[11px] text-slate-500 font-medium">Prioritized for {selectedDoctor.name}</p>
              </div>
              <span className="text-xs px-2.5 py-0.5 bg-teal-50 text-teal-800 font-bold rounded-full border border-teal-200">
                ~{doctorDept?.avgConsultationMinutes || 12}m/pt
              </span>
            </div>

            {waitingTickets.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-600">Queue is completely clear!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No pending patients assigned.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {waitingTickets.map((t, idx) => (
                  <div
                    key={t.id}
                    className={`p-3.5 rounded-2xl border text-xs transition-all ${
                      t.priority === 'EMERGENCY'
                        ? 'bg-rose-50/80 border-rose-300 shadow-xs'
                        : t.priority === 'URGENT'
                        ? 'bg-amber-50/80 border-amber-300'
                        : t.priority === 'SENIOR_CITIZEN'
                        ? 'bg-cyan-50/80 border-cyan-300'
                        : 'bg-white/80 border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {t.ticketNumber}
                        </span>
                        {getPriorityBadge(t.priority)}
                      </div>
                      <span className="font-bold text-teal-700 text-[11px]">
                        Pos #{idx + 1} (~{t.estimatedWaitMinutes}m)
                      </span>
                    </div>

                    <div className="text-slate-900 font-bold truncate">
                      {t.patientName} <span className="text-slate-500 font-normal">({t.age}y, {t.gender})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                      {t.chiefComplaint}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Set Doctor Delay */}
      {showDelayModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              Broadcast Delay Alert
            </h3>
            <p className="text-xs text-slate-500 mb-5 font-medium">
              Notifies waiting patients and dynamically updates estimated wait times on patient tracker and lobby TV screens.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Delay Duration (Minutes):</label>
                <div className="grid grid-cols-4 gap-2">
                  {['0', '10', '15', '30'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDelayInputMinutes(m)}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        delayInputMinutes === m
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {m === '0' ? 'No Delay (0)' : `+${m} min`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Clinical Delay Reason:</label>
                <input
                  type="text"
                  placeholder="e.g. Critical ICU trauma case, emergency code review"
                  value={delayReasonInput}
                  onChange={e => setDelayReasonInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowDelayModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDelay}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-extrabold shadow-md shadow-amber-600/30 transition-all cursor-pointer active:scale-95"
              >
                Broadcast Delay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Put Consultation on Hold */}
      {showHoldModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center">
                <PauseCircle className="w-5 h-5 text-purple-600" />
              </div>
              Hold for Diagnostics
            </h3>
            <p className="text-xs text-slate-500 mb-5 font-medium">
              Patient will be paused while they get blood tests, ECG, or X-rays done, allowing you to consult the next patient.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Hold Investigation / Reason:</label>
              <input
                type="text"
                placeholder="e.g. Sent to 2nd Floor for 12-lead ECG & Cardiac Troponin"
                value={holdReason}
                onChange={e => setHoldReason(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowHoldModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleHoldConsultation}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-xs font-extrabold shadow-md shadow-purple-600/30 transition-all cursor-pointer active:scale-95"
              >
                Confirm Hold
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
