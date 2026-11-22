'use client';

import React, { useState, useEffect } from 'react';
import { 
  Doctor, 
  QueueTicket, 
  Department, 
  HospitalAnnouncement 
} from '@/lib/types';
import { 
  Volume2, 
  Clock, 
  BellRing, 
  Megaphone,
  Activity,
  Sparkles
} from 'lucide-react';
import { playHospitalChime, announcePatientCall, unlockAudio } from '@/lib/audio';

interface DisplayViewProps {
  doctors: Doctor[];
  tickets: QueueTicket[];
  departments: Department[];
  announcements: HospitalAnnouncement[];
}

export default function DisplayView({
  doctors,
  tickets,
  departments,
  announcements
}: DisplayViewProps) {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isChiming, setIsChiming] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Now serving tickets: tickets with status 'CALLED' or 'IN_CONSULTATION'
  const activeConsultations = doctors.map(doc => {
    const activeTicket = tickets.find(
      t => (t.id === doc.currentTicketId || t.doctorId === doc.id) && 
           (t.status === 'CALLED' || t.status === 'IN_CONSULTATION')
    );
    const dept = departments.find(d => d.id === doc.departmentId);
    return {
      doctor: doc,
      department: dept,
      ticket: activeTicket || null
    };
  });

  // Next in line tickets
  const upcomingTickets = tickets
    .filter(t => t.status === 'WAITING')
    .slice(0, 8);

  const handleManualTestChime = () => {
    unlockAudio();
    setIsChiming(true);
    const sampleTicket = tickets.find(t => t.status === 'CALLED' || t.status === 'IN_CONSULTATION') || tickets[0];
    if (sampleTicket) {
      const doc = doctors.find(d => d.id === sampleTicket.doctorId);
      announcePatientCall(sampleTicket.ticketNumber, doc?.roomNumber || 'Room 101', sampleTicket.patientName);
    } else {
      announcePatientCall('GEN-101', 'Room 101', 'Meera Krishnan');
    }
    setTimeout(() => setIsChiming(false), 3500);
  };

  return (
    <div className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] border border-slate-800/80 min-h-[640px] flex flex-col justify-between overflow-hidden display-dot-matrix">
      {/* Top Ambient Light Flares */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top TV Header Bar */}
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800/80 gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500/20 to-cyan-500/30 text-teal-300 border border-teal-500/40 flex items-center justify-center shadow-lg shadow-teal-500/20 backdrop-blur-md">
                <Activity className="w-7 h-7 animate-pulse text-teal-400" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black tracking-tight text-white uppercase drop-shadow-md">
                  PULSE<span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-300">QUEUE</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-950/80 text-teal-300 text-[11px] font-extrabold border border-teal-600/50 tracking-wider shadow-inner">
                  CENTRAL DISPLAY
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Automated OPD Calling &amp; Triage Display System</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleManualTestChime}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md active:scale-95 ${
                isChiming 
                  ? 'bg-teal-500/30 text-teal-200 border-teal-400 shadow-lg shadow-teal-500/30' 
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700/80'
              }`}
              title="Test hospital chime & realistic female voice announcement"
            >
              <Volume2 className={`w-4 h-4 ${isChiming ? 'text-teal-300 animate-spin' : 'text-teal-400'}`} />
              <span>Voice Announcement</span>
              {isChiming && (
                <div className="flex items-center gap-0.5 ml-1">
                  <span className="soundwave-bar"></span>
                  <span className="soundwave-bar"></span>
                  <span className="soundwave-bar"></span>
                  <span className="soundwave-bar"></span>
                </div>
              )}
            </button>

            <div className="text-right bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-800/80 backdrop-blur-md shadow-inner">
              <div className="text-2xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-200 to-teal-400 tracking-wider drop-shadow-xs">
                {currentTime || '00:00:00'}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">{currentDate}</div>
            </div>
          </div>
        </div>

        {/* Main Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left 2 Cols: NOW SERVING */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold text-teal-400 tracking-wider uppercase flex items-center gap-2 bg-teal-950/40 px-3 py-1 rounded-lg border border-teal-800/40 w-fit">
                <BellRing className="w-4 h-4 animate-bounce text-teal-300" />
                NOW SERVING IN CONSULTATION ROOMS
              </h2>
              <span className="text-xs text-slate-400 hidden sm:inline">Please proceed when your token appears</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeConsultations.map(({ doctor, department, ticket }) => {
                const isCalling = ticket?.status === 'CALLED';

                return (
                  <div
                    key={doctor.id}
                    className={`rounded-2xl p-5 border transition-all duration-300 relative overflow-hidden backdrop-blur-md ${
                      isCalling
                        ? 'bg-gradient-to-br from-amber-950/60 via-slate-900/90 to-amber-950/30 border-amber-400 shadow-[0_0_25px_-5px_rgba(245,158,11,0.4)] animate-pulse'
                        : ticket
                        ? 'bg-gradient-to-br from-teal-950/40 via-slate-900/90 to-slate-900/95 border-teal-500/50 shadow-[0_0_20px_-5px_rgba(20,184,166,0.25)]'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700/80'
                    }`}
                  >
                    {isCalling && (
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider shadow-md flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Summoning Patient
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold text-teal-300 uppercase tracking-wider bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40">
                        {doctor.roomNumber} • {department?.code}
                      </span>
                      <span className="text-xs text-slate-300 font-medium truncate max-w-[140px]">
                        {doctor.name}
                      </span>
                    </div>

                    <div className="my-3">
                      {ticket ? (
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={`text-4xl sm:text-5xl font-black font-mono tracking-tight drop-shadow-md ${
                            isCalling 
                              ? 'text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]' 
                              : 'text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-300'
                          }`}>
                            {ticket.ticketNumber}
                          </span>
                          <span className="text-xs font-semibold text-slate-200 truncate max-w-[130px] bg-slate-800/70 px-2 py-1 rounded-md border border-slate-700/60">
                            {ticket.patientName}
                          </span>
                        </div>
                      ) : (
                        <div className="py-3 text-slate-600 font-mono text-2xl font-bold tracking-widest">
                          — AVAILABLE —
                        </div>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-medium">{department?.name}</span>
                      {doctor.delayMinutes > 0 ? (
                        <span className="text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                          Delayed +{doctor.delayMinutes}m
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          On Schedule
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Col: UP NEXT QUEUE */}
          <div className="bg-slate-900/85 backdrop-blur-md rounded-2xl border border-slate-800/90 p-5 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80 mb-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-400" />
                  UP NEXT IN LINE
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 font-mono font-semibold">
                  {upcomingTickets.length} in queue
                </span>
              </div>

              {upcomingTickets.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No upcoming patients in waiting queue.
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingTickets.map(t => {
                    const doc = doctors.find(d => d.id === t.doctorId);

                    return (
                      <div
                        key={t.id}
                        className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-teal-500/30 flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-teal-400 text-base">
                            {t.ticketNumber}
                          </span>
                          {t.priority === 'EMERGENCY' && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-rose-600 text-white animate-pulse">
                              EMRG
                            </span>
                          )}
                          {t.priority === 'URGENT' && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-500 text-slate-950">
                              URG
                            </span>
                          )}
                          <span className="text-slate-300 text-xs truncate max-w-[90px]">
                            {t.patientName}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-teal-300 font-mono font-bold">
                            ~{t.estimatedWaitMinutes}m
                          </span>
                          <span className="text-[10px] text-slate-500 block font-medium">
                            {doc?.roomNumber}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-800/80 text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5 font-medium">
              <span>🎟️</span>
              <span>Please keep your token pass or phone SMS ready.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Scrolling News Ticker */}
      <div className="relative z-10 mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-800/90 shadow-inner">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400 shrink-0 bg-amber-950/60 px-3 py-1 rounded-lg border border-amber-800/40">
          <Megaphone className="w-4 h-4 text-amber-400" />
          HOSPITAL NOTICES:
        </div>
        <div className="overflow-hidden whitespace-nowrap w-full text-xs text-slate-300 font-medium">
          <div className="inline-block animate-marquee">
            {announcements.length > 0 ? (
              announcements.map((a) => (
                <span key={a.id} className="mr-8">
                  • <strong className="text-white">{a.message}</strong>
                </span>
              ))
            ) : (
              <span>
                • Welcome to PulseQueue Hospital Outpatient Centre. Senior citizens, pediatrics, and emergency triage cases receive priority dispatch. Please approach Triage Desk for questions.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
