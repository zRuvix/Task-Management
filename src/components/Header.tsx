import React from 'react';
import { ViewMode } from '../types';
import { SyncStatus } from '../services/syncService';
import { Plus, Radio, Smartphone, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { audioFeedback } from '../services/audioService';

interface HeaderProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onOpenNewTask: () => void;
  onOpenSyncModal: () => void;
  syncStatus: SyncStatus;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenSimulator: () => void;
  isSimulatorOpen: boolean;
  onOpenZenMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  onOpenNewTask,
  onOpenSyncModal,
  syncStatus,
  soundEnabled,
  onToggleSound,
  onOpenSimulator,
  isSimulatorOpen,
  onOpenZenMode,
}) => {
  const navItems: { id: ViewMode; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'agenda', label: 'Agenda' },
    { id: 'spaces', label: 'Spaces' },
    { id: 'archive', label: 'Archive' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-[#E8E6DF] transition-colors">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element in editorial serif) */}
        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => onViewChange('today')}
            className="text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#CC785C]"
          >
            <span className="font-serif text-2xl font-normal tracking-tight text-[#1A1915] group-hover:text-[#CC785C] transition-colors">
              Atelier
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation links (single line, 4-5 links) */}
        <nav className="hidden md:flex items-center gap-8 text-[13px] tracking-wide font-medium">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  audioFeedback.playTactileClick();
                  onViewChange(item.id);
                }}
                className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
                  isActive
                    ? 'text-[#1A1915] font-semibold'
                    : 'text-[#737168] hover:text-[#1A1915]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute -bottom-[21px] left-0 right-0 h-[2px] bg-[#CC785C] rounded-full" />
                )}
              </button>
            );
          })}

          {/* Sync Trigger nav item with clean unboxed live device indicator */}
          <button
            onClick={() => {
              audioFeedback.playTactileClick();
              onOpenSyncModal();
            }}
            className="whitespace-nowrap shrink-0 text-[13px] font-medium text-[#737168] hover:text-[#1A1915] flex items-center gap-1.5 transition-colors"
            title="Multi-Device Sync Manager"
          >
            <Radio className="w-3.5 h-3.5 text-[#CC785C]" />
            <span>Devices</span>
            <span className="text-[11px] text-[#A39F93] font-mono tabular-nums">
              ({syncStatus.activeDevicesCount})
            </span>
          </button>
        </nav>

        {/* Zone 3: Primary Action & Subtle Utility Affordances */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Zen Sanctuary Mode */}
          <button
            onClick={() => {
              audioFeedback.playTactileClick();
              onOpenZenMode();
            }}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#57554E] hover:text-[#1A1915] hover:bg-[#F0EFEA] rounded-lg transition-colors cursor-pointer"
            title="Zen Focus Sanctuary (F)"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#CC785C]" />
            <span className="whitespace-nowrap">Focus Mode</span>
          </button>

          {/* Live Phone Simulator Toggle */}
          <button
            onClick={() => {
              audioFeedback.playTactileClick();
              onOpenSimulator();
            }}
            className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              isSimulatorOpen
                ? 'bg-[#EFECE4] text-[#1A1915] font-semibold'
                : 'text-[#57554E] hover:text-[#1A1915] hover:bg-[#F0EFEA]'
            }`}
            title="Test Multi-Device Live Sync with companion mobile phone"
          >
            <Smartphone className="w-3.5 h-3.5 text-[#CC785C]" />
            <span className="whitespace-nowrap">Companion Device</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className="p-1.5 text-[#737168] hover:text-[#1A1915] hover:bg-[#F0EFEA] rounded-lg transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute tactile clicks' : 'Enable tactile clicks'}
            aria-label="Toggle tactile sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 opacity-50" />}
          </button>

          {/* Primary Action Button */}
          <button
            onClick={() => {
              audioFeedback.playTactileClick();
              onOpenNewTask();
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#1A1915] hover:bg-[#2E2C26] active:scale-[0.98] rounded-lg shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
            <kbd className="hidden sm:inline-block text-[10px] text-[#A39F93] font-mono ml-0.5 opacity-80">
              ⌘N
            </kbd>
          </button>
        </div>
      </div>
    </header>
  );
};
