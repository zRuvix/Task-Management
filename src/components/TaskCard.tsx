import React from 'react';
import { Task, Project } from '../types';
import { Check, Clock, Calendar, CheckSquare, Trash2, ArrowUpRight } from 'lucide-react';
import { audioFeedback } from '../services/audioService';

interface TaskCardProps {
  task: Task;
  project?: Project;
  onToggleComplete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onFocusTask?: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  project,
  onToggleComplete,
  onEdit,
  onDelete,
  onFocusTask,
}) => {
  const isCompleted = task.status === 'completed';
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const totalSubtasks = task.subtasks.length;

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCompleted) {
      audioFeedback.playHarmonicChime();
    } else {
      audioFeedback.playTactileClick();
    }
    onToggleComplete(task.id);
  };

  const getPriorityLabel = (priority: Task['priority']) => {
    switch (priority) {
      case 'essential':
        return 'Priority I · Essential';
      case 'important':
        return 'Priority II · Important';
      case 'secondary':
        return 'Priority III · Standard';
    }
  };

  const getPriorityColorClass = (priority: Task['priority']) => {
    switch (priority) {
      case 'essential':
        return 'text-[#CC785C]';
      case 'important':
        return 'text-[#8A6849]';
      case 'secondary':
        return 'text-[#737168]';
    }
  };

  return (
    <article
      onClick={() => onEdit(task)}
      className={`group relative bg-white border border-[#E8E6DF] hover:border-[#D6D2C4] rounded-xl p-5 transition-all duration-200 cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] ${
        isCompleted ? 'bg-[#FAF9F5]/70 opacity-75' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Editorial Checkbox Control */}
        <button
          type="button"
          onClick={handleCheckboxClick}
          aria-label={isCompleted ? 'Mark uncompleted' : 'Mark completed'}
          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-150 shrink-0 cursor-pointer ${
            isCompleted
              ? 'bg-[#1A1915] border-[#1A1915] text-[#FAF9F5]'
              : 'border-[#CCC8BE] hover:border-[#CC785C] bg-white group-hover:bg-[#FAF9F5]'
          }`}
        >
          {isCompleted && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
        </button>

        {/* Content Body */}
        <div className="flex-1 min-w-0">
          {/* Unboxed Metadata Header (No pills) */}
          <div className="flex items-center gap-2 text-xs text-[#737168] mb-1.5 flex-wrap">
            {project && (
              <>
                <span className="font-medium text-[#1A1915]">{project.name}</span>
                <span aria-hidden="true" className="text-[#CCC8BE]">·</span>
              </>
            )}
            <span className={`font-medium ${getPriorityColorClass(task.priority)}`}>
              {getPriorityLabel(task.priority)}
            </span>
            {task.dueDate && (
              <>
                <span aria-hidden="true" className="text-[#CCC8BE]">·</span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums text-[#615F57]">
                  <Calendar className="w-3 h-3 text-[#A39F93]" />
                  {task.dueDate}
                </span>
              </>
            )}
            {task.estimatedMinutes && (
              <>
                <span aria-hidden="true" className="text-[#CCC8BE]">·</span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums text-[#737168]">
                  <Clock className="w-3 h-3 text-[#A39F93]" />
                  {task.estimatedMinutes}m
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h3
            className={`font-serif text-lg leading-snug transition-colors ${
              isCompleted
                ? 'line-through text-[#8C887E]'
                : 'text-[#1A1915] group-hover:text-[#CC785C]'
            }`}
          >
            {task.title}
          </h3>

          {/* Description snippet */}
          {task.description && (
            <p className="mt-1.5 text-xs text-[#57554E] leading-relaxed line-clamp-2 font-sans font-normal">
              {task.description}
            </p>
          )}

          {/* Footer Metadata: Subtasks count & Tags (All unboxed, zero pills) */}
          <div className="mt-3 pt-3 border-t border-[#F0EEE6] flex items-center justify-between text-xs text-[#737168]">
            <div className="flex items-center gap-3">
              {totalSubtasks > 0 && (
                <div className="inline-flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-[#615F57]">
                  <CheckSquare className="w-3.5 h-3.5 text-[#A39F93]" />
                  <span>
                    {completedSubtasks}/{totalSubtasks} milestones
                  </span>
                </div>
              )}

              {task.tags.length > 0 && (
                <div className="flex items-center gap-2 text-[11px] text-[#8C887E]">
                  {task.tags.map((tag, idx) => (
                    <span key={tag}>
                      #{tag}
                      {idx < task.tags.length - 1 && <span className="ml-2 text-[#DDDBCF]">/</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Action Affordances */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onFocusTask && !isCompleted && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    audioFeedback.playTactileClick();
                    onFocusTask(task);
                  }}
                  className="px-2 py-1 text-[11px] text-[#57554E] hover:text-[#CC785C] hover:bg-[#FAF9F5] rounded transition-colors inline-flex items-center gap-1"
                  title="Focus on this task in Zen Sanctuary"
                >
                  <span>Focus</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  audioFeedback.playTactileClick();
                  onDelete(task.id);
                }}
                className="p-1 text-[#8C887E] hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                title="Archive / Remove entry"
                aria-label="Delete task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
