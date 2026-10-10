import React, { useState } from 'react';
import { Task, Project } from '../types';
import { X, Check, Plus, Smartphone, RefreshCw, Sparkles } from 'lucide-react';
import { audioFeedback } from '../services/audioService';

interface CompanionDeviceSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  projects: Project[];
  onToggleComplete: (taskId: string) => void;
  onAddTask: (task: Partial<Task>) => void;
  workspaceId: string;
}

export const CompanionDeviceSimulator: React.FC<CompanionDeviceSimulatorProps> = ({
  isOpen,
  onClose,
  tasks,
  projects,
  onToggleComplete,
  onAddTask,
  workspaceId,
}) => {
  const [mobileFilter, setMobileFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [quickInput, setQuickInput] = useState('');
  const [isSimulatingSync, setIsSimulatingSync] = useState(false);

  if (!isOpen) return null;

  const filteredTasks = tasks.filter((t) => {
    if (mobileFilter === 'pending') return t.status !== 'completed';
    if (mobileFilter === 'completed') return t.status === 'completed';
    return true;
  });

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    audioFeedback.playHarmonicChime();
    setIsSimulatingSync(true);
    setTimeout(() => setIsSimulatingSync(false), 600);

    onAddTask({
      title: quickInput.trim(),
      project: projects[0]?.id || 'editorial',
      priority: 'important',
      dueDate: new Date().toISOString().split('T')[0],
      subtasks: [],
      tags: ['Mobile Capture'],
    });
    setQuickInput('');
  };

  const handleMobileToggle = (id: string) => {
    setIsSimulatingSync(true);
    setTimeout(() => setIsSimulatingSync(false), 500);
    audioFeedback.playTactileClick();
    onToggleComplete(id);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 w-[360px] h-[640px] bg-[#1A1915] rounded-[44px] p-3 shadow-2xl border-4 border-[#33302B] flex flex-col transition-all duration-300 animate-in slide-in-from-bottom-5">
      {/* Phone Hardware Top Island & Speaker */}
      <div className="relative w-full h-7 flex items-center justify-between px-6 pt-1 text-[11px] font-mono text-[#D6D2C4] select-none">
        <span>09:41</span>
        <div className="w-20 h-4 bg-black rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-1 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-[#1A1915] border border-stone-800" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px]">5G</span>
          <div className="w-4 h-2 border border-[#D6D2C4] rounded-xs p-0.5 flex items-center">
            <div className="w-2 h-1 bg-[#D6D2C4] rounded-2xs" />
          </div>
        </div>
      </div>

      {/* Screen Container */}
      <div className="flex-1 bg-[#FAF9F5] rounded-[34px] overflow-hidden flex flex-col relative border border-[#E8E6DF]">
        {/* Mobile Header */}
        <div className="px-4 py-3 bg-white border-b border-[#E8E6DF] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-3.5 h-3.5 text-[#CC785C]" />
            <div>
              <span className="font-serif text-sm font-semibold text-[#1A1915] block leading-none">
                Atelier Mobile
              </span>
              <span className="text-[10px] text-[#737168] font-mono leading-none">
                Workspace: {workspaceId.substring(0, 10)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isSimulatingSync ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#CC785C] font-mono animate-pulse">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                <span>Syncing</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                <span>Live</span>
              </span>
            )}
            <button
              onClick={() => {
                audioFeedback.playTactileClick();
                onClose();
              }}
              className="p-1 text-[#737168] hover:text-[#1A1915] rounded cursor-pointer ml-1"
              title="Close simulator"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Sync Banner */}
        <div className="bg-[#F5F2EB] px-3 py-1.5 border-b border-[#E8E6DF] text-[10px] text-[#57554E] flex items-center justify-between">
          <span>Simulated 2nd Device</span>
          <span className="font-mono text-[#737168]">Changes sync instantly</span>
        </div>

        {/* Mobile Filter Tabs */}
        <div className="px-3 py-2 flex items-center gap-1 border-b border-[#F0EEE6] bg-white">
          {(['all', 'pending', 'completed'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                audioFeedback.playTactileClick();
                setMobileFilter(mode);
              }}
              className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer capitalize ${
                mobileFilter === mode
                  ? 'bg-[#1A1915] text-white'
                  : 'text-[#737168] hover:bg-[#FAF9F5]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Mobile Task List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#737168] font-serif">
              No entries in this view
            </div>
          ) : (
            filteredTasks.map((t) => {
              const isDone = t.status === 'completed';
              return (
                <div
                  key={t.id}
                  onClick={() => handleMobileToggle(t.id)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                    isDone
                      ? 'bg-[#F5F3EC]/70 border-[#E8E6DF] opacity-70'
                      : 'bg-white border-[#E8E6DF] hover:border-[#CC785C]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMobileToggle(t.id);
                    }}
                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      isDone
                        ? 'bg-[#1A1915] border-[#1A1915] text-white'
                        : 'border-[#CCC8BE] bg-white'
                    }`}
                  >
                    {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-xs block font-serif leading-snug ${
                        isDone ? 'line-through text-[#8C887E]' : 'text-[#1A1915]'
                      }`}
                    >
                      {t.title}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#737168] mt-1">
                      <span className="capitalize">{t.priority}</span>
                      {t.dueDate && (
                        <>
                          <span>·</span>
                          <span className="font-mono">{t.dueDate}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Add Bottom Input on Mobile */}
        <div className="p-2.5 bg-white border-t border-[#E8E6DF]">
          <form onSubmit={handleQuickAdd} className="flex items-center gap-1.5">
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="Quick capture task..."
              className="flex-1 px-3 py-1.5 text-xs bg-[#FAF9F5] border border-[#E8E6DF] focus:border-[#CC785C] rounded-lg outline-none"
            />
            <button
              type="submit"
              disabled={!quickInput.trim()}
              className="p-1.5 bg-[#1A1915] text-white rounded-lg disabled:opacity-40 transition-opacity cursor-pointer shrink-0"
              title="Add task from mobile"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Phone Bottom Home Bar Indicator */}
      <div className="w-32 h-1 bg-stone-600 rounded-full mx-auto mt-2" />
    </div>
  );
};
