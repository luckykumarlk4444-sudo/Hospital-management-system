'use client';

import React from 'react';
import { 
  Activity, 
  Stethoscope, 
  ClipboardList, 
  Smartphone, 
  Tv, 
  BarChart3, 
  RefreshCw,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Radio,
  PhoneCall,
  Volume2
} from 'lucide-react';
import { unlockAudio, announcePatientCall } from '@/lib/audio';

export type ViewMode = 'reception' | 'doctor' | 'patient' | 'display' | 'analytics';

interface NavbarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onQuickPatient: () => void;
  onCallNextQuick: () => void;
  onSimulateEmergency: () => void;
  onResetData: () => void;
  isRefreshing: boolean;
  onManualRefresh: () => void;
  waitingCount: number;
}

export default function Navbar({
  currentView,
  onViewChange,
  onQuickPatient,
  onCallNextQuick,
  onSimulateEmergency,
  onResetData,
  isRefreshing,
  onManualRefresh,
  waitingCount
}: NavbarProps) {
  const handleCallNextWithUnlock = () => {
    unlockAudio();
    onCallNextQuick();
  };

  const handleTestVoice = () => {
    unlockAudio();
    announcePatientCall('GEN-101', 'Room 101', 'Patient');
  };

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/95 border-b border-slate-200/90 shadow-[0_2px_15px_-3px_rgba(15,23,42,0.06)] transition-all">
        {/* Top Banner & Quick Scenarios */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-slate-100 px-3 sm:px-6 py-2 text-xs border-b border-slate-800/80 shadow-inner">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            {/* Header info */}
            <div className="flex items-center justify-between sm:justify-start gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-200 font-bold border border-teal-400/40 text-[10px] sm:text-[11px] shadow-[0_0_12px_rgba(20,184,166,0.2)] tracking-wide">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400"></span>
                </span>
                <span className="bg-gradient-to-r from-teal-200 to-cyan-100 bg-clip-text text-transparent font-extrabold uppercase">
                  OPD Triage Engine
                </span>
              </span>

              <div className="flex items-center gap-1.5 text-slate-300 text-[11px] sm:text-xs font-medium">
                <Radio className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                <span className="hidden xs:inline">Queue:</span>
                <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-200 font-bold border border-teal-500/30 text-[11px]">
                  {waitingCount} waiting
                </span>
              </div>
            </div>

            {/* Quick Demo Scenario Actions */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none no-scrollbar -mx-1 px-1">
              <span className="text-slate-400 font-medium text-[10px] hidden md:inline-flex items-center gap-1 shrink-0">
                ⚡ <span className="uppercase tracking-wider text-slate-400 font-semibold">Demo:</span>
              </span>
              
              <button
                onClick={() => { unlockAudio(); onQuickPatient(); }}
                className="px-2.5 py-1 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 flex items-center gap-1 text-[11px] font-medium transition-all shrink-0 active:scale-95 cursor-pointer"
                title="Fast check-in a realistic sample patient"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>+ Patient</span>
              </button>
              
              <button
                onClick={handleCallNextWithUnlock}
                className="px-2.5 py-1 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-600 hover:to-emerald-600 text-teal-100 rounded-lg border border-teal-600/80 flex items-center gap-1 text-[11px] font-bold transition-all shadow-xs shrink-0 active:scale-95 cursor-pointer"
                title="Doctor calls next patient with voice chime"
              >
                <PhoneCall className="w-3 h-3 text-teal-200" />
                <span>Call Next</span>
              </button>
              
              <button
                onClick={() => { unlockAudio(); onSimulateEmergency(); }}
                className="px-2.5 py-1 bg-gradient-to-r from-rose-950 to-red-900 hover:from-rose-900 hover:to-red-800 text-rose-100 rounded-lg border border-rose-800/80 flex items-center gap-1 text-[11px] font-semibold transition-all shrink-0 active:scale-95 cursor-pointer"
                title="Simulate critical triage patient"
              >
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>Emergency</span>
              </button>
              
              <button
                onClick={onResetData}
                className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 flex items-center gap-1 text-[11px] font-medium transition-all shrink-0 active:scale-95 cursor-pointer"
                title="Reset to sample data"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>Reset</span>
              </button>

              <button
                onClick={handleTestVoice}
                className="px-2 py-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 rounded-lg border border-cyan-800 flex items-center gap-1 text-[11px] font-semibold transition-all shrink-0 active:scale-95 cursor-pointer"
                title="Test voice announcement & chime on phone"
              >
                <Volume2 className="w-3 h-3 text-cyan-400" />
                <span className="hidden xs:inline">Test</span> Voice
              </button>
            </div>
          </div>
        </div>

        {/* Main Navigation Bar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
            {/* Logo & Brand */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="relative group cursor-pointer" onClick={() => onViewChange('reception')}>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/25 border border-teal-400/30">
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full"></div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
                    Pulse<span className="text-teal-600">Queue</span>
                  </span>
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                    OPD
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 hidden sm:block font-medium">
                  Intelligent Hospital &amp; Clinic Patient Flow Engine
                </p>
              </div>
            </div>

            {/* Desktop View Mode Segmented Control (Hidden on Mobile) */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/90 shadow-inner">
              <button
                onClick={() => onViewChange('reception')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  currentView === 'reception'
                    ? 'bg-white text-teal-700 shadow-sm border border-slate-200/90 ring-1 ring-teal-500/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <ClipboardList className={`w-3.5 h-3.5 ${currentView === 'reception' ? 'text-teal-600' : 'text-slate-400'}`} />
                Reception Desk
              </button>

              <button
                onClick={() => onViewChange('doctor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  currentView === 'doctor'
                    ? 'bg-white text-teal-700 shadow-sm border border-slate-200/90 ring-1 ring-teal-500/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Stethoscope className={`w-3.5 h-3.5 ${currentView === 'doctor' ? 'text-teal-600' : 'text-slate-400'}`} />
                Doctor Room
              </button>

              <button
                onClick={() => onViewChange('patient')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  currentView === 'patient'
                    ? 'bg-white text-teal-700 shadow-sm border border-slate-200/90 ring-1 ring-teal-500/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Smartphone className={`w-3.5 h-3.5 ${currentView === 'patient' ? 'text-teal-600' : 'text-slate-400'}`} />
                Patient Tracker
              </button>

              <button
                onClick={() => onViewChange('display')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  currentView === 'display'
                    ? 'bg-white text-teal-700 shadow-sm border border-slate-200/90 ring-1 ring-teal-500/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Tv className={`w-3.5 h-3.5 ${currentView === 'display' ? 'text-teal-600' : 'text-slate-400'}`} />
                Waiting TV Board
              </button>

              <button
                onClick={() => onViewChange('analytics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  currentView === 'analytics'
                    ? 'bg-white text-teal-700 shadow-sm border border-slate-200/90 ring-1 ring-teal-500/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <BarChart3 className={`w-3.5 h-3.5 ${currentView === 'analytics' ? 'text-teal-600' : 'text-slate-400'}`} />
                Audit &amp; KPIs
              </button>
            </nav>

            {/* Mobile View Indicator / Quick Switcher */}
            <div className="flex md:hidden items-center gap-1.5">
              <span className="text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-xl">
                {currentView === 'reception' && '📋 Reception Desk'}
                {currentView === 'doctor' && '🩺 Doctor Room'}
                {currentView === 'patient' && '📱 Patient Pass'}
                {currentView === 'display' && '📺 TV Display'}
                {currentView === 'analytics' && '📊 Audit & KPIs'}
              </span>
            </div>

            {/* Sync & Refresh Status */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={onManualRefresh}
                className="p-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-xl border border-slate-200/70 transition-all cursor-pointer active:scale-95"
                title="Refresh live queue data"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Modern Mobile Bottom Navigation Bar (Visible only on mobile devices) */}
      <nav 
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 text-slate-300 backdrop-blur-xl border-t border-slate-800 shadow-[0_-8px_25px_rgba(0,0,0,0.35)] px-2 py-1.5 flex items-center justify-around"
      >
        <button
          onClick={() => onViewChange('reception')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            currentView === 'reception'
              ? 'text-teal-300 bg-teal-950/80 border border-teal-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 active:scale-95'
          }`}
        >
          <ClipboardList className={`w-4 h-4 mb-0.5 ${currentView === 'reception' ? 'text-teal-300' : 'text-slate-400'}`} />
          <span>Reception</span>
        </button>

        <button
          onClick={() => onViewChange('doctor')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer relative ${
            currentView === 'doctor'
              ? 'text-teal-300 bg-teal-950/80 border border-teal-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 active:scale-95'
          }`}
        >
          <Stethoscope className={`w-4 h-4 mb-0.5 ${currentView === 'doctor' ? 'text-teal-300' : 'text-slate-400'}`} />
          <span>Doctor</span>
          {waitingCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-teal-500 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center">
              {waitingCount > 9 ? '9+' : waitingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onViewChange('patient')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            currentView === 'patient'
              ? 'text-teal-300 bg-teal-950/80 border border-teal-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 active:scale-95'
          }`}
        >
          <Smartphone className={`w-4 h-4 mb-0.5 ${currentView === 'patient' ? 'text-teal-300' : 'text-slate-400'}`} />
          <span>Tracker</span>
        </button>

        <button
          onClick={() => onViewChange('display')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            currentView === 'display'
              ? 'text-teal-300 bg-teal-950/80 border border-teal-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 active:scale-95'
          }`}
        >
          <Tv className={`w-4 h-4 mb-0.5 ${currentView === 'display' ? 'text-teal-300' : 'text-slate-400'}`} />
          <span>TV Board</span>
        </button>

        <button
          onClick={() => onViewChange('analytics')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            currentView === 'analytics'
              ? 'text-teal-300 bg-teal-950/80 border border-teal-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 active:scale-95'
          }`}
        >
          <BarChart3 className={`w-4 h-4 mb-0.5 ${currentView === 'analytics' ? 'text-teal-300' : 'text-slate-400'}`} />
          <span>Audit</span>
        </button>
      </nav>
    </>
  );
}
