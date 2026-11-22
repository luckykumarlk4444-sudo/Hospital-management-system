'use client';

import React, { useState } from 'react';
import { 
  QueueTicket, 
  Department, 
  Doctor, 
  PriorityLevel 
} from '@/lib/types';
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Plus, 
  Stethoscope, 
  UserPlus, 
  Megaphone,
  Eye,
  Filter,
  Sparkles,
  Phone,
  AlertCircle,
  RotateCw,
  Mail,
  Volume2
} from 'lucide-react';
import { announcePatientCall, unlockAudio } from '@/lib/audio';

interface ReceptionViewProps {
  tickets: QueueTicket[];
  departments: Department[];
  doctors: Doctor[];
  onCheckIn: (data: any) => Promise<any>;
  onUpdateTicketStatus: (ticketId: string, status: string, notes?: string, holdReason?: string) => Promise<any>;
  onUpdatePriority: (ticketId: string, priority: PriorityLevel) => Promise<any>;
  onReassignDoctor: (ticketId: string, doctorId: string) => Promise<any>;
  onBroadcastAnnouncement: (message: string, severity: string, departmentId?: string) => Promise<any>;
  onSelectTicket: (id: string) => void;
  onRetrySMS?: (ticketId: string, contactNumber?: string) => Promise<any>;
  onRetryEmail?: (ticketId: string, email?: string) => Promise<any>;
}

export default function ReceptionView({
  tickets,
  departments,
  doctors,
  onCheckIn,
  onUpdateTicketStatus,
  onUpdatePriority,
  onBroadcastAnnouncement,
  onSelectTicket,
  onRetrySMS,
  onRetryEmail
}: ReceptionViewProps) {
  // Filtering states
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ACTIVE');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [announcementSeverity, setAnnouncementSeverity] = useState('warning');
  const [announcementDept, setAnnouncementDept] = useState('');
  const [retryingTicketId, setRetryingTicketId] = useState<string | null>(null);
  const [retryingEmailTicketId, setRetryingEmailTicketId] = useState<string | null>(null);

  const handleTriggerRetrySMS = async (ticketId: string, contactNumber?: string) => {
    if (!onRetrySMS || retryingTicketId) return;
    setRetryingTicketId(ticketId);
    try {
      await onRetrySMS(ticketId, contactNumber);
    } catch {
      // toast handled in page.tsx
    } finally {
      setRetryingTicketId(null);
    }
  };

  const handleTriggerRetryEmail = async (ticketId: string, email?: string) => {
    if (!onRetryEmail || retryingEmailTicketId) return;
    setRetryingEmailTicketId(ticketId);
    try {
      await onRetryEmail(ticketId, email);
    } catch {
      // toast handled in page.tsx
    } finally {
      setRetryingEmailTicketId(null);
    }
  };

  // Fast intake form state
  const [intakeData, setIntakeData] = useState({
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

  // Calculate Metrics
  const waitingTickets = tickets.filter(t => t.status === 'WAITING');
  const calledTickets = tickets.filter(t => t.status === 'CALLED');
  const consultingTickets = tickets.filter(t => t.status === 'IN_CONSULTATION');
  const completedTickets = tickets.filter(t => t.status === 'COMPLETED');
  const urgentTickets = tickets.filter(
    t => (t.priority === 'URGENT' || t.priority === 'EMERGENCY') && 
         (t.status === 'WAITING' || t.status === 'CALLED')
  );

  const activeWaitSum = waitingTickets.reduce((a, b) => a + b.estimatedWaitMinutes, 0);
  const avgWait = waitingTickets.length > 0 ? Math.round(activeWaitSum / waitingTickets.length) : 0;

  // Filtered tickets
  const filteredTickets = tickets.filter(t => {
    if (selectedDept !== 'ALL' && t.departmentId !== selectedDept) return false;
    if (selectedPriority !== 'ALL' && t.priority !== selectedPriority) return false;

    if (selectedStatus === 'ACTIVE') {
      if (t.status === 'COMPLETED' || t.status === 'CANCELLED' || t.status === 'NO_SHOW') return false;
    } else if (selectedStatus !== 'ALL') {
      if (t.status !== selectedStatus) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.patientName.toLowerCase().includes(q);
      const matchNum = t.ticketNumber.toLowerCase().includes(q);
      const matchPhone = t.contactNumber.includes(q);
      const matchComplaint = t.chiefComplaint.toLowerCase().includes(q);
      if (!matchName && !matchNum && !matchPhone && !matchComplaint) return false;
    }

    return true;
  });

  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intakeData.patientName.trim()) return;

    await onCheckIn({
      ...intakeData,
      age: parseInt(intakeData.age, 10) || 30
    });

    setShowIntakeModal(false);
    setIntakeData({
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
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementMsg.trim()) return;
    await onBroadcastAnnouncement(announcementMsg, announcementSeverity, announcementDept || undefined);
    setShowAnnouncementModal(false);
    setAnnouncementMsg('');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Central Reception &amp; Triage</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
              Live Dispatch
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time OPD queue orchestration, patient intake &amp; triage management
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowAnnouncementModal(true)}
            className="flex-1 sm:flex-none px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs border border-slate-300 shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Megaphone className="w-3.5 h-3.5 text-slate-500" />
            <span>Public Notice</span>
          </button>

          <button
            onClick={() => setShowIntakeModal(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-teal-600 via-teal-700 to-cyan-700 hover:from-teal-500 hover:to-cyan-600 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-teal-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 glow-teal"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Register Patient</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        {/* Waiting */}
        <div className="glass-panel glass-card-interactive rounded-2xl p-3.5 sm:p-4.5 border border-slate-200/90 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500"></div>
          <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-semibold">In Waiting</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center transition-transform group-hover:scale-110">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">{waitingTickets.length}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
            <span className="text-[10px] sm:text-[11px] text-teal-700 font-medium">Ready for calling</span>
          </div>
        </div>

        {/* In Consultation */}
        <div className="glass-panel glass-card-interactive rounded-2xl p-3.5 sm:p-4.5 border border-slate-200/90 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
          <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-semibold">Consulting</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center transition-transform group-hover:scale-110">
              <Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
            {consultingTickets.length + calledTickets.length}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span className="text-[10px] sm:text-[11px] text-blue-700 font-medium">Inside OPD rooms</span>
          </div>
        </div>

        {/* Avg Wait */}
        <div className="glass-panel glass-card-interactive rounded-2xl p-3.5 sm:p-4.5 border border-slate-200/90 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
          <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-semibold">Avg OPD Wait</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center transition-transform group-hover:scale-110">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">~{avgWait}m</div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-1 truncate">All departments</div>
        </div>

        {/* Triage Alerts */}
        <div className="glass-panel glass-card-interactive rounded-2xl p-3.5 sm:p-4.5 border border-slate-200/90 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600"></div>
          <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-semibold">Triage Alerts</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center transition-transform group-hover:scale-110">
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-heartbeat text-rose-600" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 font-mono tracking-tight">{urgentTickets.length}</div>
          <div className="text-[10px] sm:text-[11px] text-rose-600 font-semibold mt-1 truncate">Urgent &amp; Emergency</div>
        </div>

        {/* Served Today */}
        <div className="glass-panel glass-card-interactive rounded-2xl p-3.5 sm:p-4.5 border border-slate-200/90 relative overflow-hidden group col-span-2 sm:col-span-1">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
          <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-semibold">Served Today</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center transition-transform group-hover:scale-110">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono tracking-tight">{completedTickets.length}</div>
          <div className="text-[10px] sm:text-[11px] text-emerald-600 font-medium mt-1">Completed visits</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by patient name, token number (GEN-101), phone, or complaint..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white/90 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
            />
          </div>

          {/* Department, Status, Priority Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold shrink-0">
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filter:</span>
            </div>

            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
            >
              <option value="ALL">All Departments ({departments.length})</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
            >
              <option value="ACTIVE">Active (Waiting &amp; In Room)</option>
              <option value="ALL">All Statuses</option>
              <option value="WAITING">Waiting Only</option>
              <option value="IN_CONSULTATION">In Consultation</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="NO_SHOW">No Show</option>
            </select>

            <select
              value={selectedPriority}
              onChange={e => setSelectedPriority(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="EMERGENCY">Emergency Only</option>
              <option value="URGENT">Urgent Only</option>
              <option value="SENIOR_CITIZEN">Senior Citizen</option>
              <option value="NORMAL">Normal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Queue Table */}
      <div className="glass-panel rounded-3xl border border-slate-200/90 shadow-md overflow-hidden">
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
              Live Queue Roster
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200">
              {filteredTickets.length} Tickets
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            💡 Select priority to escalate triage • Click token to preview digital patient pass
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100/80 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Token #</th>
                <th className="px-5 py-3.5">Patient Details</th>
                <th className="px-5 py-3.5">Department &amp; Doctor</th>
                <th className="px-5 py-3.5">Triage Priority</th>
                <th className="px-5 py-3.5">Queue Status</th>
                <th className="px-5 py-3.5">Est. Wait</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/70">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Users className="w-5 h-5" />
                      </div>
                      <p className="font-semibold text-slate-600">No tickets match current filters</p>
                      <p className="text-xs text-slate-400">Try adjusting your department or search query.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTickets.map(t => {
                  const doc = doctors.find(d => d.id === t.doctorId);
                  const dept = departments.find(d => d.id === t.departmentId);

                  return (
                    <tr key={t.id} className="hover:bg-teal-50/40 transition-colors">
                      {/* Token */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() => onSelectTicket(t.id)}
                          className="font-mono font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1.5 cursor-pointer bg-teal-50 hover:bg-teal-100/80 px-2.5 py-1 rounded-lg border border-teal-200 transition-colors w-fit"
                          title="View live patient pass"
                        >
                          <span>{t.ticketNumber}</span>
                          <Eye className="w-3 h-3 text-teal-600" />
                        </button>
                        <span className="text-[10px] text-slate-400 block font-medium mt-1">
                          {new Date(t.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Patient */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 text-sm">{t.patientName}</div>
                        <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span>{t.age} yrs</span>
                          <span>•</span>
                          <span>{t.gender}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            {t.contactNumber}
                          </span>
                          {t.smsNotification?.status === 'SENT' && (
                            <span 
                              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
                              title={
                                t.smsNotification.sentAt
                                  ? `SMS delivered to ${t.smsNotification.recipientNumber} at ${new Date(t.smsNotification.sentAt).toLocaleTimeString()}`
                                  : `SMS delivered to ${t.smsNotification.recipientNumber}`
                              }
                            >
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> SMS
                            </span>
                          )}
                          {t.smsNotification?.status === 'FAILED' && (
                            <button
                              onClick={() => handleTriggerRetrySMS(t.id, t.contactNumber)}
                              disabled={retryingTicketId === t.id}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                              title={`SMS failed: ${t.smsNotification.error || 'Delivery error'}. Click to retry.`}
                            >
                              <RotateCw className={`w-2.5 h-2.5 text-rose-600 ${retryingTicketId === t.id ? 'animate-spin' : ''}`} />
                              Retry SMS
                            </button>
                          )}
                          {(!t.smsNotification || t.smsNotification?.status === 'PENDING') && t.contactNumber && (
                            <button
                              onClick={() => handleTriggerRetrySMS(t.id, t.contactNumber)}
                              disabled={retryingTicketId === t.id}
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                              title="Send SMS notification"
                            >
                              <RotateCw className={`w-2.5 h-2.5 text-slate-500 ${retryingTicketId === t.id ? 'animate-spin' : ''}`} />
                              Send SMS
                            </button>
                          )}
                          {t.emailNotification?.status === 'SENT' && (
                            <span 
                              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200"
                              title={
                                t.emailNotification.sentAt
                                  ? `Email sent to ${t.emailNotification.recipientEmail} at ${new Date(t.emailNotification.sentAt).toLocaleTimeString()}`
                                  : `Email sent to ${t.emailNotification.recipientEmail}`
                              }
                            >
                              <CheckCircle2 className="w-2.5 h-2.5 text-cyan-600" /> Email
                            </span>
                          )}
                          {t.emailNotification?.status === 'FAILED' && (
                            <button
                              onClick={() => handleTriggerRetryEmail(t.id, t.email)}
                              disabled={retryingEmailTicketId === t.id}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                              title={`Email failed: ${t.emailNotification.error || 'Transmission failed'}. Click to retry.`}
                            >
                              <RotateCw className={`w-2.5 h-2.5 text-rose-600 ${retryingEmailTicketId === t.id ? 'animate-spin' : ''}`} />
                              Retry Email
                            </button>
                          )}
                          {t.email && (!t.emailNotification || t.emailNotification?.status === 'PENDING') && (
                            <button
                              onClick={() => handleTriggerRetryEmail(t.id, t.email)}
                              disabled={retryingEmailTicketId === t.id}
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                              title={`Send email notification to ${t.email}`}
                            >
                              <RotateCw className={`w-2.5 h-2.5 text-slate-500 ${retryingEmailTicketId === t.id ? 'animate-spin' : ''}`} />
                              Send Email
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate max-w-xs mt-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                          {t.chiefComplaint}
                        </div>
                      </td>

                      {/* Dept & Doctor */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">{dept?.name}</div>
                        <div className="text-[11px] text-teal-700 font-medium flex items-center gap-1.5 mt-1 bg-teal-50/60 px-2 py-0.5 rounded-md border border-teal-100 w-fit">
                          <Stethoscope className="w-3 h-3 text-teal-600" />
                          <span>{doc?.name} ({doc?.roomNumber})</span>
                        </div>
                      </td>

                      {/* Priority with 1-click Escalation */}
                      <td className="px-5 py-4">
                        <select
                          value={t.priority}
                          onChange={e => onUpdatePriority(t.id, e.target.value as PriorityLevel)}
                          className={`text-[11px] font-bold rounded-xl px-2.5 py-1.5 border shadow-2xs cursor-pointer transition-all ${
                            t.priority === 'EMERGENCY'
                              ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white border-rose-700 glow-rose animate-heartbeat'
                              : t.priority === 'URGENT'
                              ? 'bg-amber-500 text-white border-amber-600'
                              : t.priority === 'SENIOR_CITIZEN'
                              ? 'bg-cyan-600 text-white border-cyan-700'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          <option value="NORMAL">Normal Priority</option>
                          <option value="SENIOR_CITIZEN">Senior 65+ Triage</option>
                          <option value="URGENT">Urgent Priority</option>
                          <option value="EMERGENCY">Emergency Priority</option>
                        </select>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          t.status === 'CALLED'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse shadow-xs'
                            : t.status === 'IN_CONSULTATION'
                            ? 'bg-teal-100 text-teal-900 border border-teal-300'
                            : t.status === 'WAITING'
                            ? 'bg-sky-50 text-sky-800 border border-sky-200'
                            : t.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            : t.status === 'ON_HOLD'
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            t.status === 'CALLED' ? 'bg-amber-500 animate-ping' :
                            t.status === 'IN_CONSULTATION' ? 'bg-teal-500' :
                            t.status === 'WAITING' ? 'bg-sky-500' : 'bg-slate-400'
                          }`}></span>
                          {t.status === 'CALLED' ? 'Summoned to Room' : t.status}
                        </span>
                      </td>

                      {/* Wait time */}
                      <td className="px-5 py-4">
                        <span className="font-mono font-extrabold text-slate-900 text-sm">
                          {t.status === 'WAITING' ? `~${t.estimatedWaitMinutes}m` : '—'}
                        </span>
                        {t.status === 'WAITING' && (
                          <span className="text-[10px] font-semibold text-slate-500 block">
                            Pos #{t.queuePosition || 1} in line
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {t.status === 'WAITING' && (
                            <button
                              onClick={() => {
                                unlockAudio();
                                onUpdateTicketStatus(t.id, 'CALLED');
                                announcePatientCall(t.ticketNumber, doc?.roomNumber || 'Room 101', t.patientName);
                              }}
                              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                              title="Direct summon to room with voice announcement"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Call Now</span>
                            </button>
                          )}

                          {t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.status !== 'NO_SHOW' && (
                            <button
                              onClick={() => {
                                if (confirm(`Mark ${t.ticketNumber} as No-Show?`)) {
                                  onUpdateTicketStatus(t.id, 'NO_SHOW');
                                }
                              }}
                              className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
                              title="Cancel / No-show"
                            >
                              No-Show
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Patient Cards List (Optimized for Phones) */}
        <div className="block md:hidden divide-y divide-slate-100 bg-white/70">
          {filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2">
                <Users className="w-5 h-5" />
              </div>
              <p className="font-semibold text-slate-600 text-xs">No tickets match current filters</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your department or search query.</p>
            </div>
          ) : (
            filteredTickets.map(t => {
              const doc = doctors.find(d => d.id === t.doctorId);
              const dept = departments.find(d => d.id === t.departmentId);

              return (
                <div key={`m-${t.id}`} className="p-3.5 space-y-2.5 hover:bg-teal-50/30 transition-colors">
                  {/* Card Header: Token, Time, Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectTicket(t.id)}
                        className="font-mono font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 active:scale-95 cursor-pointer"
                        title="View digital patient pass"
                      >
                        <span>{t.ticketNumber}</span>
                        <Eye className="w-3 h-3 text-teal-600" />
                      </button>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(t.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      t.status === 'CALLED'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                        : t.status === 'IN_CONSULTATION'
                        ? 'bg-teal-100 text-teal-900 border border-teal-300'
                        : t.status === 'WAITING'
                        ? 'bg-sky-50 text-sky-800 border border-sky-200'
                        : t.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        t.status === 'CALLED' ? 'bg-amber-500 animate-ping' :
                        t.status === 'IN_CONSULTATION' ? 'bg-teal-500' :
                        t.status === 'WAITING' ? 'bg-sky-500' : 'bg-slate-400'
                      }`}></span>
                      {t.status === 'CALLED' ? 'Summoned' : t.status}
                    </span>
                  </div>

                  {/* Patient Name and Vitals */}
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm flex items-center justify-between">
                      <span>{t.patientName}</span>
                      <span className="text-xs font-mono font-bold text-slate-600">
                        {t.status === 'WAITING' ? `~${t.estimatedWaitMinutes}m wait` : ''}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span>{t.age} yrs</span>
                      <span>•</span>
                      <span>{t.gender}</span>
                      {t.contactNumber && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            {t.contactNumber}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-600 font-medium mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-semibold">{dept?.name || 'General OPD'}</span>
                      <span>•</span>
                      <span className="text-teal-700 font-semibold flex items-center gap-1">
                        <Stethoscope className="w-3 h-3 text-teal-600" />
                        {doc?.name} ({doc?.roomNumber})
                      </span>
                    </div>

                    {t.chiefComplaint && (
                      <p className="text-[11px] text-slate-500 mt-1 bg-slate-50 px-2 py-1 rounded border border-slate-100 italic">
                        {t.chiefComplaint}
                      </p>
                    )}
                  </div>

                  {/* Priority selector & Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <select
                      value={t.priority}
                      onChange={e => onUpdatePriority(t.id, e.target.value as PriorityLevel)}
                      className={`text-[10px] font-bold rounded-lg px-2 py-1 border shadow-2xs cursor-pointer ${
                        t.priority === 'EMERGENCY'
                          ? 'bg-rose-600 text-white border-rose-700'
                          : t.priority === 'URGENT'
                          ? 'bg-amber-500 text-white border-amber-600'
                          : t.priority === 'SENIOR_CITIZEN'
                          ? 'bg-cyan-600 text-white border-cyan-700'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="SENIOR_CITIZEN">Senior 65+</option>
                      <option value="URGENT">Urgent</option>
                      <option value="EMERGENCY">Emergency</option>
                    </select>

                    <div className="flex items-center gap-1.5">
                      {t.status === 'WAITING' && (
                        <button
                          onClick={() => {
                            unlockAudio();
                            onUpdateTicketStatus(t.id, 'CALLED');
                            announcePatientCall(t.ticketNumber, doc?.roomNumber || 'Room 101', t.patientName);
                          }}
                          className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg text-xs font-bold shadow-xs active:scale-95 flex items-center gap-1 cursor-pointer"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Call</span>
                        </button>
                      )}

                      {t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.status !== 'NO_SHOW' && (
                        <button
                          onClick={() => {
                            if (confirm(`Mark ${t.ticketNumber} as No-Show?`)) {
                              onUpdateTicketStatus(t.id, 'NO_SHOW');
                            }
                          }}
                          className="px-2 py-1 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg text-xs font-medium border border-slate-200 active:scale-95 cursor-pointer"
                        >
                          No-Show
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal: New Patient Intake */}
      {showIntakeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-7 shadow-2xl border border-slate-200/90 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-teal-600" />
                </div>
                Reception Patient Intake
              </h3>
              <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                Token Generator
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-5 font-medium">
              Enter patient details to automatically assign department, estimate wait time, and print queue token.
            </p>

            <form onSubmit={handleIntakeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Patient Full Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meera Krishnan"
                  value={intakeData.patientName}
                  onChange={e => setIntakeData({ ...intakeData, patientName: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Age:</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="42"
                    value={intakeData.age}
                    onChange={e => setIntakeData({ ...intakeData, age: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Gender:</label>
                  <select
                    value={intakeData.gender}
                    onChange={e => setIntakeData({ ...intakeData, gender: e.target.value as any })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-medium cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Triage Priority:</label>
                  <select
                    value={intakeData.priority}
                    onChange={e => setIntakeData({ ...intakeData, priority: e.target.value as PriorityLevel })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-bold cursor-pointer"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="SENIOR_CITIZEN">Senior 65+</option>
                    <option value="URGENT">Urgent</option>
                    <option value="EMERGENCY">Emergency</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Department:</label>
                  <select
                    value={intakeData.departmentId}
                    onChange={e => setIntakeData({ ...intakeData, departmentId: e.target.value, doctorId: '' })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-medium cursor-pointer"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Doctor (Optional):</label>
                  <select
                    value={intakeData.doctorId}
                    onChange={e => setIntakeData({ ...intakeData, doctorId: e.target.value })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-medium cursor-pointer"
                  >
                    <option value="">Auto-Assign (Fastest Queue)</option>
                    {doctors
                      .filter(d => !intakeData.departmentId || d.departmentId === intakeData.departmentId)
                      .map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.roomNumber})</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Contact Phone:</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 00000"
                    value={intakeData.contactNumber}
                    onChange={e => setIntakeData({ ...intakeData, contactNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address (Optional):</label>
                  <input
                    type="email"
                    placeholder="patient@example.com"
                    value={intakeData.email}
                    onChange={e => setIntakeData({ ...intakeData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Chief Complaint / Symptoms:</label>
                <textarea
                  rows={2}
                  placeholder="Primary symptoms, duration, vitals..."
                  value={intakeData.chiefComplaint}
                  onChange={e => setIntakeData({ ...intakeData, chiefComplaint: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowIntakeModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-xs font-extrabold shadow-md shadow-teal-600/30 cursor-pointer transition-all active:scale-95"
                >
                  Generate Token Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Broadcast Hospital Notice */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-indigo-600" />
              </div>
              Broadcast Public Notice
            </h3>
            <p className="text-xs text-slate-500 mb-5 font-medium">
              Displays instantly on lobby TV screens and patient tracking smartphones.
            </p>

            <form onSubmit={handleSendAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Message:</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Pharmacy Counter #2 is now open for fast prescription dispensing."
                  value={announcementMsg}
                  onChange={e => setAnnouncementMsg(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Severity Level:</label>
                  <select
                    value={announcementSeverity}
                    onChange={e => setAnnouncementSeverity(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-semibold cursor-pointer"
                  >
                    <option value="info">Info (Blue)</option>
                    <option value="warning">Warning (Amber)</option>
                    <option value="alert">Alert (Red)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Department Target:</label>
                  <select
                    value={announcementDept}
                    onChange={e => setAnnouncementDept(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-semibold cursor-pointer"
                  >
                    <option value="">All Hospital Wings</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-extrabold shadow-md shadow-indigo-600/30 cursor-pointer transition-all active:scale-95"
                >
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
