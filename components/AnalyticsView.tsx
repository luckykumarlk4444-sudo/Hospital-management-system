'use client';

import React from 'react';
import { 
  AuditLog, 
  Department, 
  Doctor, 
  QueueTicket 
} from '@/lib/types';
import { 
  ShieldCheck, 
  Layers, 
  Code2, 
  FileCheck,
  Activity,
  Terminal
} from 'lucide-react';

interface AnalyticsViewProps {
  departments: Department[];
  doctors: Doctor[];
  tickets: QueueTicket[];
  auditLogs: AuditLog[];
}

export default function AnalyticsView({
  departments,
  tickets,
  auditLogs
}: AnalyticsViewProps) {
  // Breakdown by priority
  const priorityCounts = {
    EMERGENCY: tickets.filter(t => t.priority === 'EMERGENCY').length,
    URGENT: tickets.filter(t => t.priority === 'URGENT').length,
    SENIOR_CITIZEN: tickets.filter(t => t.priority === 'SENIOR_CITIZEN').length,
    NORMAL: tickets.filter(t => t.priority === 'NORMAL').length
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Performance &amp; Audit Trail</h1>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
            Real-Time Engine
          </span>
        </div>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Live operational metrics, queue efficiency benchmarks, and HIPAA-ready immutable compliance audit trail
        </p>
      </div>

      {/* Architecture Viva Card */}
      <div className="relative bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 text-white rounded-3xl p-7 shadow-xl border border-slate-800 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-teal-300 text-xs font-black uppercase tracking-wider mb-2.5 bg-teal-950/80 px-3 py-1 rounded-full border border-teal-700/50 w-fit">
            <Code2 className="w-4 h-4 text-teal-400" />
            <span>Technical Viva &amp; Architecture Brief</span>
          </div>
          <h2 className="text-lg font-black text-white mb-2">
            Queue Scheduling Engine &amp; Computational Complexity
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300 mt-4">
            <div className="glass-panel-dark p-4 rounded-2xl border border-slate-800/80">
              <div className="flex items-center gap-1.5 mb-1.5 text-teal-300 font-bold">
                <Terminal className="w-3.5 h-3.5" />
                <span>1. Priority-Weighted FIFO:</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                Patients are prioritized via composite weight function:
              </p>
              <code className="text-teal-200 block my-1 font-mono text-[11px] bg-slate-950/90 border border-slate-800 p-2 rounded-xl">
                Rank = PriorityWeight(P) * 10⁶ − CheckInTimestamp
              </code>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                Emergency &amp; Urgent cases leap ahead to room dispatch, while fair arrival-order is strictly preserved within the same priority rank.
              </p>
            </div>

            <div className="glass-panel-dark p-4 rounded-2xl border border-slate-800/80">
              <div className="flex items-center gap-1.5 mb-1.5 text-teal-300 font-bold">
                <Activity className="w-3.5 h-3.5" />
                <span>2. Dynamic Wait Computation:</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                Wait times are continuously evaluated:
              </p>
              <code className="text-teal-200 block my-1 font-mono text-[11px] bg-slate-950/90 border border-slate-800 p-2 rounded-xl">
                Wait(i) = Delay + ∑(AvgConsultMinutes ahead)
              </code>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                When a doctor flags an emergency delay (+15m), all downstream patient tickets automatically adjust wait calculations instantly.
              </p>
            </div>

            <div className="glass-panel-dark p-4 rounded-2xl border border-slate-800/80">
              <div className="flex items-center gap-1.5 mb-1.5 text-teal-300 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>3. Fault-Tolerant Persistence:</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                High-performance dual-tier state management:
              </p>
              <code className="text-teal-200 block my-1 font-mono text-[11px] bg-slate-950/90 border border-slate-800 p-2 rounded-xl">
                In-Memory Cache ↔ Atomic JSON Store
              </code>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                Atomic disk writes ensure zero data loss during server restarts, with sub-millisecond in-memory lookups for active screens.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Department Breakdown & Priority Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Department Breakdown */}
        <div className="glass-panel rounded-3xl border border-slate-200/90 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              Department Queue Load
            </h3>
            <span className="text-[11px] text-slate-500 font-semibold">{departments.length} Wings</span>
          </div>

          <div className="space-y-4">
            {departments.map(dept => {
              const deptTickets = tickets.filter(t => t.departmentId === dept.id);
              const deptWaiting = deptTickets.filter(t => t.status === 'WAITING').length;
              const deptTotal = deptTickets.length;
              const percentage = tickets.length > 0 ? Math.round((deptTotal / tickets.length) * 100) : 0;

              return (
                <div key={dept.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{dept.name} <span className="text-slate-400 font-normal">({dept.code})</span></span>
                    <span className="text-slate-600 font-mono text-[11px] font-semibold">
                      <span className="text-teal-700 font-bold">{deptWaiting} waiting</span> / {deptTotal} total ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden shadow-inner p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(percentage, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="glass-panel rounded-3xl border border-slate-200/90 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              Clinical Triage Breakdown
            </h3>
            <span className="text-[11px] text-slate-500 font-semibold">{tickets.length} Registered</span>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50/80 to-rose-100/40 border border-rose-200/90 glow-rose">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider">Emergency</span>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              </div>
              <div className="text-3xl font-black text-rose-700 font-mono">{priorityCounts.EMERGENCY}</div>
              <span className="text-[11px] text-rose-600 font-medium">Immediate triage leap</span>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 to-amber-100/40 border border-amber-200/90">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Urgent</span>
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              </div>
              <div className="text-3xl font-black text-amber-700 font-mono">{priorityCounts.URGENT}</div>
              <span className="text-[11px] text-amber-600 font-medium">High acuity review</span>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-50/80 to-cyan-100/40 border border-cyan-200/90">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black text-cyan-800 uppercase tracking-wider">Senior (65+)</span>
                <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
              </div>
              <div className="text-3xl font-black text-cyan-700 font-mono">{priorityCounts.SENIOR_CITIZEN}</div>
              <span className="text-[11px] text-cyan-600 font-medium">Automated senior priority</span>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200/90">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Normal OPD</span>
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              </div>
              <div className="text-3xl font-black text-slate-800 font-mono">{priorityCounts.NORMAL}</div>
              <span className="text-[11px] text-slate-500 font-medium">Fair FIFO scheduling</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Audit Log Table */}
      <div className="glass-panel rounded-3xl border border-slate-200/90 shadow-md overflow-hidden">
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-teal-600" />
              Immutable Audit &amp; Event Log
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Every status shift, triage escalation, and doctor call is immutably timestamped
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200">
            {auditLogs.length} Events Logged
          </span>
        </div>

        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100/90 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider border-b border-slate-200 sticky top-0 backdrop-blur-md">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Token #</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Actor</th>
                <th className="px-5 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/70">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                    No activity logs recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-teal-50/40 transition-colors">
                    <td className="px-5 py-2.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-5 py-2.5 font-mono font-bold text-teal-700">
                      {log.ticketNumber || '—'}
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 font-bold text-slate-800">
                      {log.actor}
                    </td>
                    <td className="px-5 py-2.5 text-slate-600 font-medium">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
