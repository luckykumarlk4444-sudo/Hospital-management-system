'use client';

import React, { useState } from 'react';
import { 
  QueueTicket, 
  Department, 
  Doctor, 
  PriorityLevel 
} from '@/lib/types';
import { 
  UserPlus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Stethoscope, 
  QrCode, 
  ShieldAlert, 
  BellRing,
  Sparkles,
  ArrowRight,
  UserCheck,
  RotateCw,
  Phone,
  Mail
} from 'lucide-react';

interface PatientViewProps {
  departments: Department[];
  doctors: Doctor[];
  tickets: QueueTicket[];
  onCheckIn: (data: {
    patientName: string;
    age: number;
    gender: string;
    contactNumber?: string;
    email?: string;
    departmentId: string;
    doctorId?: string;
    priority?: PriorityLevel;
    chiefComplaint?: string;
  }) => Promise<QueueTicket | null>;
  activeTicketId?: string | null;
  onSelectTicket?: (id: string) => void;
  onRetrySMS?: (ticketId: string, contactNumber?: string) => Promise<any>;
  onRetryEmail?: (ticketId: string, email?: string) => Promise<any>;
}

export default function PatientView({
  departments,
  doctors,
  tickets,
  onCheckIn,
  activeTicketId,
  onSelectTicket,
  onRetrySMS,
  onRetryEmail
}: PatientViewProps) {
  const [subTab, setSubTab] = useState<'kiosk' | 'tracker'>(activeTicketId ? 'tracker' : 'kiosk');
  const [searchTicket, setSearchTicket] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successTicket, setSuccessTicket] = useState<QueueTicket | null>(null);
  const [isRetryingSMS, setIsRetryingSMS] = useState(false);
  const [isRetryingEmail, setIsRetryingEmail] = useState(false);

  const handleTriggerRetrySMS = async () => {
    if (!selectedTicket || !onRetrySMS || isRetryingSMS) return;
    setIsRetryingSMS(true);
    try {
      await onRetrySMS(selectedTicket.id, selectedTicket.contactNumber);
    } catch {
      // toast already handled by page.tsx
    } finally {
      setIsRetryingSMS(false);
    }
  };

  const handleTriggerRetryEmail = async () => {
    if (!selectedTicket || !onRetryEmail || isRetryingEmail) return;
    setIsRetryingEmail(true);
    try {
      await onRetryEmail(selectedTicket.id, selectedTicket.email);
    } catch {
      // toast already handled by page.tsx
    } finally {
      setIsRetryingEmail(false);
    }
  };

  // Form states
  const [formData, setFormData] = useState({
    patientName: '',
    age: '',
    gender: 'Male',
    contactNumber: '',
    email: '',
    departmentId: departments[0]?.id || '',
    doctorId: '',
    priority: 'NORMAL' as PriorityLevel,
    chiefComplaint: ''
  });

  // Pick active ticket for tracker
  const selectedTicket = activeTicketId 
    ? tickets.find(t => t.id === activeTicketId || t.ticketNumber === activeTicketId) 
    : (successTicket || tickets.find(t => t.status === 'WAITING' || t.status === 'CALLED') || tickets[0]);

  // Filter doctors by selected department in form
  const availableDoctors = formData.departmentId 
    ? doctors.filter(d => d.departmentId === formData.departmentId) 
    : doctors;

  // Auto-fill Senior Citizen when age >= 65
  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const num = parseInt(val, 10);
    setFormData(prev => ({
      ...prev,
      age: val,
      priority: num >= 65 && prev.priority === 'NORMAL' ? 'SENIOR_CITIZEN' : prev.priority
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.patientName.trim()) {
      setErrorMessage('Please enter the patient full name.');
      return;
    }

    const ageNum = parseInt(formData.age, 10);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 125) {
      setErrorMessage('Please enter a valid age between 0 and 125.');
      return;
    }

    if (!formData.departmentId) {
      setErrorMessage('Please choose a hospital department.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onCheckIn({
        ...formData,
        age: ageNum
      });

      if (result) {
        setSuccessTicket(result);
        if (onSelectTicket) onSelectTicket(result.id);
        setSubTab('tracker');
        // Reset form
        setFormData({
          patientName: '',
          age: '',
          gender: 'Male',
          contactNumber: '',
          email: '',
          departmentId: departments[0]?.id || '',
          doctorId: '',
          priority: 'NORMAL',
          chiefComplaint: ''
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Check-in failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTicket.trim()) return;

    const found = tickets.find(
      t => t.ticketNumber.toUpperCase() === searchTicket.trim().toUpperCase() ||
           t.patientName.toLowerCase().includes(searchTicket.trim().toLowerCase())
    );

    if (found) {
      setSuccessTicket(found);
      if (onSelectTicket) onSelectTicket(found.id);
      setErrorMessage('');
    } else {
      setErrorMessage(`No active queue ticket found for "${searchTicket}".`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CALLED':
        return (
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/30 animate-pulse">
            <BellRing className="w-4 h-4 animate-bounce" />
            NOW CALLING - PROCEED TO ROOM
          </span>
        );
      case 'IN_CONSULTATION':
        return (
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md shadow-teal-500/30">
            <Stethoscope className="w-4 h-4" />
            In Consultation with Doctor
          </span>
        );
      case 'WAITING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-200 border border-sky-400/40 backdrop-blur-md">
            <Clock className="w-3.5 h-3.5 text-sky-300" />
            Waiting in Queue
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 backdrop-blur-md">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            Consultation Completed
          </span>
        );
      case 'ON_HOLD':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-200 border border-purple-400/40 backdrop-blur-md">
            <AlertTriangle className="w-3.5 h-3.5 text-purple-300" />
            On Hold (Diagnostics/Lab)
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-md">
            {status}
          </span>
        );
    }
  };

  // Find doctor and dept info for selected ticket
  const ticketDoctor = selectedTicket ? doctors.find(d => d.id === selectedTicket.doctorId) : null;
  const ticketDept = selectedTicket ? departments.find(d => d.id === selectedTicket.departmentId) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Subtab navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200/80 pb-4 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Patient Portal &amp; Live Pass</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
              Mobile Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Self check-in kiosk or track your live appointment queue position in real time
          </p>
        </div>

        <div className="inline-flex p-1 bg-slate-100/90 rounded-2xl border border-slate-200/90 shadow-inner">
          <button
            onClick={() => setSubTab('kiosk')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'kiosk'
                ? 'bg-white text-teal-700 shadow-sm border border-slate-200/80 ring-1 ring-teal-500/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Self Check-In Kiosk</span>
          </button>
          <button
            onClick={() => setSubTab('tracker')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'tracker'
                ? 'bg-white text-teal-700 shadow-sm border border-slate-200/80 ring-1 ring-teal-500/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Live Digital Ticket</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 text-[10px] font-black">
              {tickets.filter(t => t.status === 'WAITING' || t.status === 'CALLED').length}
            </span>
          </button>
        </div>
      </div>

      {/* Mode 1: Self Check-In Form */}
      {subTab === 'kiosk' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel rounded-3xl border border-slate-200/90 shadow-sm p-7">
            <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Patient Registration &amp; Check-In</h2>
                <p className="text-xs text-slate-500 font-medium">Complete quick details to receive an instant digital OPD ticket</p>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-5 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2.5 font-medium glow-rose">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Patient Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={formData.patientName}
                    onChange={e => setFormData({ ...formData, patientName: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Age <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="125"
                      placeholder="e.g. 45"
                      value={formData.age}
                      onChange={handleAgeChange}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={e => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-medium cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Phone / Contact Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={formData.contactNumber}
                    onChange={e => setFormData({ ...formData, contactNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email Address <span className="text-slate-400 font-normal">(for e-token &amp; receipt)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. patient@example.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Triage Urgency / Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as PriorityLevel })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-bold cursor-pointer"
                  >
                    <option value="NORMAL">Standard OPD (Normal)</option>
                    <option value="SENIOR_CITIZEN">Senior Citizen (Priority Call)</option>
                    <option value="URGENT">Urgent (Severe Pain / High Fever)</option>
                    <option value="EMERGENCY">Emergency (Immediate Intervention)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Department / Specialty <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.departmentId}
                    onChange={e => setFormData({ ...formData, departmentId: e.target.value, doctorId: '' })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-medium cursor-pointer"
                  >
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code}) - Avg ~{dept.avgConsultationMinutes}m
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Doctor (Optional)
                </label>
                <select
                  value={formData.doctorId}
                  onChange={e => setFormData({ ...formData, doctorId: e.target.value })}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-medium cursor-pointer"
                >
                  <option value="">Auto-Assign (Shortest Waiting Queue)</option>
                  {availableDoctors.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} ({doc.roomNumber}) {doc.delayMinutes > 0 ? `[+${doc.delayMinutes}m delay]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Chief Complaint / Reason for Consultation
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. High fever for 2 days, persistent headache, throat discomfort"
                  value={formData.chiefComplaint}
                  onChange={e => setFormData({ ...formData, chiefComplaint: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-5 bg-gradient-to-r from-teal-600 via-teal-700 to-cyan-700 hover:from-teal-500 hover:to-cyan-600 disabled:opacity-50 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-teal-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer glow-teal active:scale-95"
                >
                  {isSubmitting ? (
                    <span>Registering into Queue...</span>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 stroke-[3]" />
                      <span>Check-In &amp; Generate Token Pass</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right helper side card */}
          <div className="space-y-4">
            <div className="glass-panel-dark rounded-3xl p-6 text-slate-100 shadow-xl border border-slate-800">
              <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-2.5">
                <ShieldAlert className="w-4 h-4" />
                Intelligent Triage Engine
              </div>
              <h3 className="text-base font-bold text-white mb-2">How Queue Ordering Works</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4 font-medium">
                PulseQueue dynamically prioritizes patients based on clinical triage:
              </p>
              <ul className="text-xs text-slate-300 space-y-2.5">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0"></span>
                  <span><strong className="text-rose-400">Emergency cases</strong> jump ahead for immediate room call.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 mt-1 shrink-0"></span>
                  <span><strong className="text-amber-300">Urgent conditions</strong> are prioritized ahead of standard check-ups.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1 shrink-0"></span>
                  <span><strong className="text-cyan-300">Senior Citizens (65+)</strong> receive automated expedited slots.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0"></span>
                  <span>Standard OPD cases are served in fair <strong>FIFO order</strong>.</span>
                </li>
              </ul>
            </div>

            <div className="glass-panel rounded-3xl border border-teal-200/80 p-6 bg-gradient-to-br from-teal-50/60 to-cyan-50/40">
              <h4 className="text-xs font-black text-teal-900 uppercase tracking-wider mb-3">Live Department Wait Times</h4>
              <div className="space-y-2.5">
                {departments.slice(0, 4).map(d => {
                  const waitTickets = tickets.filter(t => t.departmentId === d.id && t.status === 'WAITING');
                  return (
                    <div key={d.id} className="flex items-center justify-between text-xs py-1.5 border-b border-teal-100/80 last:border-0">
                      <span className="text-slate-700 font-semibold">{d.name}</span>
                      <span className="font-mono font-bold text-teal-800 bg-white/80 px-2 py-0.5 rounded-lg border border-teal-100">
                        {waitTickets.length} waiting (~{waitTickets.length * d.avgConsultationMinutes}m)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Live Ticket Tracker */}
      {subTab === 'tracker' && (
        <div className="space-y-6">
          {/* Lookup Bar */}
          <div className="glass-panel rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto flex-1">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Enter Ticket Number (e.g. GEN-101, CARD-301) or Patient Name..."
                  value={searchTicket}
                  onChange={e => setSearchTicket(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                Find Pass
              </button>
            </form>

            {/* Quick switcher buttons for recent tickets */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              <span className="text-[11px] text-slate-500 font-semibold shrink-0">Recent:</span>
              {tickets.slice(0, 4).map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSuccessTicket(t);
                    if (onSelectTicket) onSelectTicket(t.id);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg border transition-all cursor-pointer active:scale-95 ${
                    selectedTicket?.id === t.id
                      ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  {t.ticketNumber}
                </button>
              ))}
            </div>
          </div>

          {selectedTicket ? (
            <div className="glass-panel rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden">
              {/* Ticket Header */}
              <div className="relative bg-gradient-to-r from-teal-900 via-slate-900 to-slate-950 text-white p-7 sm:p-9 overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
                      <span className="text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/30">
                        Official OPD Pass
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        Checked-in: {new Date(selectedTicket.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {selectedTicket.smsNotification?.status === 'SENT' && (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          SMS Dispatched ({selectedTicket.smsNotification.recipientNumber})
                        </span>
                      )}
                      {selectedTicket.smsNotification?.status === 'FAILED' && (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          SMS Failed
                          {onRetrySMS && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTriggerRetrySMS();
                              }}
                              disabled={isRetryingSMS}
                              className="ml-1 underline font-bold text-rose-200 hover:text-white cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <RotateCw className={`w-2.5 h-2.5 ${isRetryingSMS ? 'animate-spin' : ''}`} />
                              Retry
                            </button>
                          )}
                        </span>
                      )}
                      {selectedTicket.emailNotification?.status === 'SENT' && (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                          Email Sent ({selectedTicket.emailNotification.recipientEmail})
                        </span>
                      )}
                      {selectedTicket.emailNotification?.status === 'FAILED' && (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          Email Failed
                          {onRetryEmail && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTriggerRetryEmail();
                              }}
                              disabled={isRetryingEmail}
                              className="ml-1 underline font-bold text-rose-200 hover:text-white cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <RotateCw className={`w-2.5 h-2.5 ${isRetryingEmail ? 'animate-spin' : ''}`} />
                              Retry
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-baseline gap-3">
                      <span className="text-5xl sm:text-6xl font-black tracking-tight font-mono text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-200 to-teal-400 drop-shadow-md">
                        {selectedTicket.ticketNumber}
                      </span>
                      <span className="text-xl text-slate-200 font-bold">
                        {selectedTicket.patientName} <span className="text-slate-400 text-base font-normal">({selectedTicket.age}y, {selectedTicket.gender})</span>
                      </span>
                    </div>
                  </div>

                  <div>
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                </div>
              </div>

              {/* SMS Delivery Alert / Success Banner */}
              {selectedTicket.smsNotification?.status === 'FAILED' && (
                <div className="bg-rose-50 border-b border-rose-200 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <div>
                      <strong>SMS Notification Failed:</strong> Could not deliver registration token to{' '}
                      <strong>{selectedTicket.smsNotification.recipientNumber || selectedTicket.contactNumber}</strong>.{' '}
                      <span className="text-rose-700">(Reason: <em>{selectedTicket.smsNotification.error || 'Gateway network error'}</em>)</span>
                    </div>
                  </div>
                  {onRetrySMS && (
                    <button
                      type="button"
                      onClick={handleTriggerRetrySMS}
                      disabled={isRetryingSMS}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RotateCw className={`w-3 h-3 ${isRetryingSMS ? 'animate-spin' : ''}`} />
                      {isRetryingSMS ? 'Resending SMS...' : 'Retry SMS'}
                    </button>
                  )}
                </div>
              )}
              {selectedTicket.smsNotification?.status === 'SENT' && (
                <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center justify-between gap-3 text-emerald-900 text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>SMS Delivered:</strong> Registration token notification sent to <strong>{selectedTicket.smsNotification.recipientNumber}</strong> via {selectedTicket.smsNotification.gateway}.
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-mono hidden sm:inline">
                    {selectedTicket.smsNotification.sentAt
                      ? new Date(selectedTicket.smsNotification.sentAt).toLocaleTimeString()
                      : 'Delivered'}
                  </span>
                </div>
              )}

              {/* Email Delivery Alert / Success Banner */}
              {selectedTicket.emailNotification?.status === 'FAILED' && (
                <div className="bg-rose-50 border-b border-rose-200 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <div>
                      <strong>Email Notification Failed:</strong> Could not deliver registration token to{' '}
                      <strong>{selectedTicket.emailNotification.recipientEmail || selectedTicket.email}</strong>.{' '}
                      <span className="text-rose-700">(Reason: <em>{selectedTicket.emailNotification.error || 'SMTP delivery error'}</em>)</span>
                    </div>
                  </div>
                  {onRetryEmail && (
                    <button
                      type="button"
                      onClick={handleTriggerRetryEmail}
                      disabled={isRetryingEmail}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RotateCw className={`w-3 h-3 ${isRetryingEmail ? 'animate-spin' : ''}`} />
                      {isRetryingEmail ? 'Resending Email...' : 'Retry Email'}
                    </button>
                  )}
                </div>
              )}
              {selectedTicket.emailNotification?.status === 'SENT' && (
                <div className="bg-cyan-50 border-b border-cyan-200 px-6 py-2.5 flex items-center justify-between gap-3 text-cyan-950 text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />
                    <span>
                      <strong>Email Delivered:</strong> Registration confirmation sent to <strong>{selectedTicket.emailNotification.recipientEmail}</strong> via {selectedTicket.emailNotification.provider}.
                    </span>
                  </div>
                  <span className="text-[11px] text-cyan-700 font-mono hidden sm:inline">
                    {selectedTicket.emailNotification.sentAt
                      ? new Date(selectedTicket.emailNotification.sentAt).toLocaleTimeString()
                      : 'Delivered'}
                  </span>
                </div>
              )}

              {/* Doctor Delay Warning Alert Banner */}
              {ticketDoctor && ticketDoctor.delayMinutes > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-6 py-3.5 flex items-center gap-3 text-amber-900 text-xs font-medium">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 animate-bounce" />
                  <div>
                    <strong>Doctor Delay Notice:</strong> {ticketDoctor.name} is running{' '}
                    <strong>+{ticketDoctor.delayMinutes} mins</strong> delayed. Reason:{' '}
                    <em>{ticketDoctor.delayReason || 'Clinical emergency in ward'}</em>. Your estimated wait has been updated automatically.
                  </div>
                </div>
              )}

              {/* Progress Stepper */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/70">
                <div className="grid grid-cols-4 gap-3 text-center text-xs">
                  <div className={`p-3 rounded-2xl border transition-all ${
                    selectedTicket.status === 'WAITING' || selectedTicket.status === 'CALLED' || selectedTicket.status === 'IN_CONSULTATION' || selectedTicket.status === 'COMPLETED'
                      ? 'bg-teal-50 border-teal-300 text-teal-900 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}>
                    <div className="w-7 h-7 rounded-full bg-teal-600 text-white mx-auto mb-1.5 flex items-center justify-center text-xs font-bold shadow-xs">1</div>
                    <span>Checked In</span>
                  </div>

                  <div className={`p-3 rounded-2xl border transition-all ${
                    selectedTicket.status === 'WAITING' || selectedTicket.status === 'CALLED' || selectedTicket.status === 'IN_CONSULTATION' || selectedTicket.status === 'COMPLETED'
                      ? 'bg-teal-50 border-teal-300 text-teal-900 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}>
                    <div className={`w-7 h-7 rounded-full mx-auto mb-1.5 flex items-center justify-center text-xs font-bold shadow-xs ${
                      selectedTicket.status === 'WAITING' ? 'bg-teal-600 text-white animate-pulse' : 'bg-teal-600 text-white'
                    }`}>2</div>
                    <span>In Queue (#{selectedTicket.queuePosition || 1})</span>
                  </div>

                  <div className={`p-3 rounded-2xl border transition-all ${
                    selectedTicket.status === 'CALLED' || selectedTicket.status === 'IN_CONSULTATION' || selectedTicket.status === 'COMPLETED'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}>
                    <div className={`w-7 h-7 rounded-full mx-auto mb-1.5 flex items-center justify-center text-xs font-bold shadow-xs ${
                      selectedTicket.status === 'CALLED' ? 'bg-amber-500 text-white animate-ping' : (selectedTicket.status === 'IN_CONSULTATION' || selectedTicket.status === 'COMPLETED' ? 'bg-teal-600 text-white' : 'bg-slate-300 text-slate-600')
                    }`}>3</div>
                    <span>Called to Room</span>
                  </div>

                  <div className={`p-3 rounded-2xl border transition-all ${
                    selectedTicket.status === 'IN_CONSULTATION' || selectedTicket.status === 'COMPLETED'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}>
                    <div className={`w-7 h-7 rounded-full mx-auto mb-1.5 flex items-center justify-center text-xs font-bold shadow-xs ${
                      selectedTicket.status === 'COMPLETED' ? 'bg-emerald-600 text-white' : (selectedTicket.status === 'IN_CONSULTATION' ? 'bg-teal-600 text-white' : 'bg-slate-300 text-slate-600')
                    }`}>4</div>
                    <span>Consultation</span>
                  </div>
                </div>
              </div>

              {/* Main Ticket Vitals Body */}
              <div className="p-7 sm:p-9 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Metric 1: Queue Position */}
                <div className="glass-panel rounded-2xl p-6 text-center border border-slate-200/90 shadow-xs relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500"></div>
                  <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Queue Position</div>
                  <div className="text-4xl sm:text-5xl font-black text-slate-900 font-mono tracking-tight my-1">
                    {selectedTicket.status === 'CALLED' ? (
                      <span className="text-amber-500 animate-pulse">CALLING</span>
                    ) : selectedTicket.status === 'IN_CONSULTATION' ? (
                      <span className="text-teal-600">IN ROOM</span>
                    ) : selectedTicket.status === 'COMPLETED' ? (
                      <span className="text-emerald-600">DONE</span>
                    ) : (
                      `#${selectedTicket.queuePosition || 1}`
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-2">
                    {selectedTicket.status === 'CALLED'
                      ? '🔔 Doctor is calling! Please proceed to the room.'
                      : selectedTicket.queuePosition === 1
                      ? '⚡ You are NEXT in line! Please stand by near room.'
                      : `${Math.max(0, (selectedTicket.queuePosition || 1) - 1)} patient(s) ahead of you`}
                  </p>
                </div>

                {/* Metric 2: Estimated Wait */}
                <div className="glass-panel rounded-2xl p-6 text-center border border-teal-200/90 shadow-xs relative overflow-hidden bg-gradient-to-b from-teal-50/50 to-white">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500"></div>
                  <div className="text-[11px] font-extrabold text-teal-800 uppercase tracking-wider mb-2">Estimated Wait</div>
                  <div className="text-4xl sm:text-5xl font-black text-teal-900 font-mono tracking-tight my-1">
                    {selectedTicket.status === 'CALLED' || selectedTicket.status === 'IN_CONSULTATION' || selectedTicket.status === 'COMPLETED'
                      ? '0 min'
                      : `~${selectedTicket.estimatedWaitMinutes} min`}
                  </div>
                  <p className="text-xs text-teal-700 font-medium mt-2">
                    {selectedTicket.status === 'CALLED'
                      ? 'Immediate consultation in progress'
                      : 'Continuously updated based on real clinical speed'}
                  </p>
                </div>

                {/* Metric 3: Doctor & Room */}
                <div className="glass-panel rounded-2xl p-6 border border-slate-200/90 shadow-xs relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                  <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Consulting Doctor</div>
                  <div className="text-base font-extrabold text-slate-900">{ticketDoctor?.name || 'Assigned Physician'}</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">{ticketDoctor?.specialty}</div>
                  <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-100 text-teal-900 font-bold text-xs border border-teal-200 shadow-2xs">
                    <Stethoscope className="w-3.5 h-3.5 text-teal-700" />
                    <span>{ticketDoctor?.roomNumber || 'Room 101'} • {ticketDept?.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1.5 font-medium">{ticketDept?.location}</div>
                </div>
              </div>

              {/* Bottom Details Footer */}
              <div className="bg-slate-50 border-t border-slate-200/80 px-7 sm:px-9 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-800 shadow-2xs">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <span>Digital Pass Code: <strong className="font-mono text-slate-900 text-sm">{selectedTicket.id.slice(-6).toUpperCase()}</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  {selectedTicket.email && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {selectedTicket.email}
                    </span>
                  )}
                  <span>Complaint: <strong className="text-slate-800">{selectedTicket.chiefComplaint}</strong></span>
                </div>
                {selectedTicket.doctorNotes && (
                  <div className="text-teal-900 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200 font-semibold">
                    Doctor Note: {selectedTicket.doctorNotes}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-3xl border border-slate-200/90 p-14 text-center shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Clock className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Queue Ticket Selected</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5 font-medium">
                Please check-in as a new patient or enter an existing token number above.
              </p>
              <button
                onClick={() => setSubTab('kiosk')}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 hover:from-teal-500 hover:to-cyan-500 transition-all cursor-pointer"
              >
                Go to Self Check-In
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
