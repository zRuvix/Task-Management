import React, { useState, useEffect, useRef } from 'react';
import { Task, Project, ViewMode } from '../types';
import { Search, Plus, Radio, Smartphone, Sparkles, Check, ArrowRight } from 'lucide-react';
import { audioFeedback } from '../services/audioService';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  projects: Project[];
  onSelectTask: (task: Task) => void;
  onNewTask: () => void;
  onSelectView: (view: ViewMode) => void;
  onOpenSync: () => void;
  onOpenZen: () => void;
  onOpenSimulator: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  tasks,
  onSelectTask,
  onNewTask,
  onSelectView,
  onOpenSync,
  onOpenZen,
  onOpenSimulator,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter tasks based on query
  const matchingTasks = tasks
    .filter(
      (t) =>
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.description.toLowerCase().includes(query.toLowerCase()) ||
        t.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
    )
    .slice(0, 5);

  const quickActions = [
    { id: 'new-task', label: 'Create New Task', icon: Plus, action: onNewTask },
    { id: 'view-today', label: 'Go to Today / Focus View', icon: ArrowRight, action: () => onSelectView('today') },
    { id: 'view-agenda', label: 'Go to Agenda Timeline', icon: ArrowRight, action: () => onSelectView('agenda') },
    { id: 'view-spaces', label: 'View Editorial Spaces', icon: ArrowRight, action: () => onSelectView('spaces') },
    { id: 'open-zen', label: 'Enter Zen Focus Sanctuary', icon: Sparkles, action: onOpenZen },
    { id: 'open-sync', label: 'Multi-Device Sync & QR Code', icon: Radio, action: onOpenSync },
    { id: 'open-sim', label: 'Launch Companion Phone Simulator', icon: Smartphone, action: onOpenSimulator },
  ].filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));

  const allItemsCount = matchingTasks.length + quickActions.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((idx) => (idx + 1) % Math.max(1, allItemsCount));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((idx) => (idx - 1 + allItemsCount) % Math.max(1, allItemsCount));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      audioFeedback.playTactileClick();
      if (selectedIndex < matchingTasks.length) {
        onSelectTask(matchingTasks[selectedIndex]);
        onClose();
      } else {
        const actionIdx = selectedIndex - matchingTasks.length;
        if (quickActions[actionIdx]) {
          quickActions[actionIdx].action();
          onClose();
        }
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-[#1A1915]/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white border border-[#E8E6DF] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[#E8E6DF] flex items-center gap-3 bg-[#FAF9F5]">
          <Search className="w-5 h-5 text-[#8C887E]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search tasks..."
            className="flex-1 text-sm text-[#1A1915] bg-transparent outline-none placeholder:text-[#A39F93]"
          />
          <kbd className="text-[11px] font-mono text-[#8C887E] bg-white border border-[#E8E6DF] px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {matchingTasks.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1 text-[11px] font-medium text-[#737168] uppercase tracking-wider">
                Matching Tasks
              </div>
              {matchingTasks.map((task, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <button
                    key={task.id}
                    onClick={() => {
                      audioFeedback.playTactileClick();
                      onSelectTask(task);
                      onClose();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#FAF0EB] text-[#1A1915]' : 'hover:bg-[#FAF9F5] text-[#1A1915]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${task.status === 'completed' ? 'bg-[#1A1915] text-white border-[#1A1915]' : 'border-[#CCC8BE]'}`}>
                        {task.status === 'completed' && <Check className="w-2.5 h-2.5" />}
                      </span>
                      <span className="font-serif truncate">{task.title}</span>
                    </div>
                    <span className="text-[11px] font-mono text-[#737168] capitalize shrink-0 ml-2">
                      {task.priority}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {quickActions.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-medium text-[#737168] uppercase tracking-wider">
                Actions & Navigation
              </div>
              {quickActions.map((action, idx) => {
                const itemIndex = matchingTasks.length + idx;
                const isSelected = selectedIndex === itemIndex;
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => {
                      audioFeedback.playTactileClick();
                      action.action();
                      onClose();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-3 text-xs transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#FAF0EB] text-[#1A1915]' : 'hover:bg-[#FAF9F5] text-[#1A1915]'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-[#CC785C]" />
                    <span className="font-medium flex-1">{action.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {matchingTasks.length === 0 && quickActions.length === 0 && (
            <div className="py-8 text-center text-xs text-[#737168] font-serif">
              No matching entries found for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
