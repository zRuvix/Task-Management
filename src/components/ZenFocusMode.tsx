import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { X, Play, Pause, RotateCcw, Check, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { audioFeedback } from '../services/audioService';

interface ZenFocusModeProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onToggleComplete: (taskId: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const ZenFocusMode: React.FC<ZenFocusModeProps> = ({
  isOpen,
  onClose,
  tasks,
  onToggleComplete,
  soundEnabled,
  onToggleSound,
}) => {
  // Focus on the first incomplete essential task or the first incomplete task
  const activeTasks = tasks.filter((t) => t.status !== 'completed');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  
  // Timer state (25 minutes default)
  const defaultSeconds = 25 * 60;
  const [secondsLeft, setSecondsLeft] = useState(defaultSeconds);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (activeTasks.length > 0 && !selectedTaskId) {
      const topEssential = activeTasks.find((t) => t.priority === 'essential') || activeTasks[0];
      setSelectedTaskId(topEssential.id);
    }
  }, [activeTasks, selectedTaskId]);

  useEffect(() => {
    let interval: number | null = null;
    if (isActive && secondsLeft > 0) {
      interval = window.setInterval(() => {
        setSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      audioFeedback.playHarmonicChime();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsLeft]);

  if (!isOpen) return null;

  const currentTask = tasks.find((t) => t.id === selectedTaskId) || activeTasks[0];

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleToggleTimer = () => {
    audioFeedback.playTactileClick();
    setIsActive(!isActive);
  };

  const handleResetTimer = (minutes: number = 25) => {
    audioFeedback.playTactileClick();
    setIsActive(false);
    setSecondsLeft(minutes * 60);
  };

  const handleCompleteCurrent = () => {
    if (!currentTask) return;
    audioFeedback.playHarmonicChime();
    onToggleComplete(currentTask.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#FAF9F5] flex flex-col justify-between p-8 sm:p-14 animate-in fade-in duration-300">
      {/* Top Bar: Quiet sanctuary navigation */}
      <div className="flex items-center justify-between max-w-4xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#CC785C]" />
          <span className="font-serif text-lg text-[#1A1915]">
            Zen Sanctuary
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSound}
            className="p-2 text-[#737168] hover:text-[#1A1915] rounded-lg transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute' : 'Enable audio'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              audioFeedback.playTactileClick();
              onClose();
            }}
            className="px-3.5 py-1.5 text-xs font-medium text-[#737168] hover:text-[#1A1915] border border-[#E8E6DF] rounded-lg hover:bg-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Exit Focus</span>
            <kbd className="text-[10px] font-mono text-[#A39F93]">ESC</kbd>
          </button>
        </div>
      </div>

      {/* Main Focus Area */}
      <div className="max-w-2xl w-full mx-auto text-center space-y-10 my-auto">
        {/* Subtle Timer Display */}
        <div className="space-y-4">
          <div className="font-mono text-7xl sm:text-8xl font-light tracking-tight text-[#1A1915] tabular-nums select-none">
            {formatTime(secondsLeft)}
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleToggleTimer}
              className="px-6 py-2.5 text-sm font-medium text-white bg-[#1A1915] hover:bg-[#2E2C26] rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isActive ? 'Pause Interval' : 'Begin Deep Focus'}</span>
            </button>

            <button
              onClick={() => handleResetTimer(25)}
              className="p-2.5 text-[#737168] hover:text-[#1A1915] border border-[#E8E6DF] hover:bg-white rounded-xl transition-colors cursor-pointer"
              title="Reset timer (25m)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Quick preset buttons */}
          <div className="flex items-center justify-center gap-2 text-xs text-[#737168]">
            <button
              onClick={() => handleResetTimer(15)}
              className="px-2.5 py-1 rounded hover:bg-[#EFECE4] transition-colors cursor-pointer"
            >
              15m sprint
            </button>
            <span>·</span>
            <button
              onClick={() => handleResetTimer(25)}
              className="px-2.5 py-1 rounded hover:bg-[#EFECE4] transition-colors cursor-pointer font-medium text-[#1A1915]"
            >
              25m classic
            </button>
            <span>·</span>
            <button
              onClick={() => handleResetTimer(50)}
              className="px-2.5 py-1 rounded hover:bg-[#EFECE4] transition-colors cursor-pointer"
            >
              50m deep work
            </button>
          </div>
        </div>

        {/* Selected Task Details */}
        {currentTask ? (
          <div className="bg-white border border-[#E8E6DF] rounded-2xl p-8 shadow-xs text-left space-y-4 transition-all">
            <div className="flex items-center justify-between text-xs text-[#737168]">
              <span className="text-[#CC785C] font-medium uppercase tracking-wider">
                Current Priority Objective
              </span>
              {currentTask.dueDate && (
                <span className="font-mono tabular-nums">
                  Due {currentTask.dueDate}
                </span>
              )}
            </div>

            <h2 className="font-serif text-2xl sm:text-3xl text-[#1A1915] leading-snug">
              {currentTask.title}
            </h2>

            {currentTask.description && (
              <p className="text-xs text-[#57554E] leading-relaxed">
                {currentTask.description}
              </p>
            )}

            {/* Subtasks if present */}
            {currentTask.subtasks && currentTask.subtasks.length > 0 && (
              <div className="pt-3 border-t border-[#F0EEE6] space-y-2">
                <span className="text-[11px] font-medium text-[#737168] uppercase tracking-wider block">
                  Milestones
                </span>
                <div className="space-y-1.5">
                  {currentTask.subtasks.map((st) => (
                    <div key={st.id} className="flex items-center gap-2 text-xs text-[#1A1915]">
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${st.completed ? 'bg-[#1A1915] text-white border-[#1A1915]' : 'border-[#CCC8BE]'}`}>
                        {st.completed && <Check className="w-2.5 h-2.5" />}
                      </span>
                      <span className={st.completed ? 'line-through text-[#8C887E]' : ''}>
                        {st.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Complete Objective Button */}
            <div className="pt-4 flex items-center justify-between">
              <button
                onClick={handleCompleteCurrent}
                className="px-4 py-2 text-xs font-medium text-[#1A1915] bg-[#EFECE4] hover:bg-[#E5E2D8] rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4 text-emerald-700" />
                <span>Mark Objective Completed</span>
              </button>

              {activeTasks.length > 1 && (
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="text-xs text-[#737168] bg-transparent border-0 hover:text-[#1A1915] cursor-pointer outline-none"
                >
                  {activeTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      Switch to: {t.title.substring(0, 30)}...
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-[#737168] font-serif text-lg">
            All priority objectives are currently complete. Enjoy quiet reflection.
          </div>
        )}
      </div>

      {/* Footer calm quote */}
      <div className="text-center text-xs text-[#8C887E] font-serif italic max-w-md mx-auto">
        "Simplicity is the prerequisite for reliability and peace of mind."
      </div>
    </div>
  );
};
