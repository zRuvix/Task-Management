import React, { useState, useEffect } from 'react';
import { Task, Project, Priority, Subtask } from '../types';
import { X, Plus, Trash2, Check, Clock, Calendar, Hash, Folder } from 'lucide-react';
import { audioFeedback } from '../services/audioService';

interface TaskEditorModalProps {
  isOpen: boolean;
  task: Task | null;
  projects: Project[];
  onSave: (task: Partial<Task> & { id?: string }) => void;
  onDelete?: (taskId: string) => void;
  onClose: () => void;
}

export const TaskEditorModal: React.FC<TaskEditorModalProps> = ({
  isOpen,
  task,
  projects,
  onSave,
  onDelete,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [project, setProject] = useState('');
  const [priority, setPriority] = useState<Priority>('important');
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | ''>(60);
  const [tagsInput, setTagsInput] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setProject(task.project || projects[0]?.id || 'editorial');
      setPriority(task.priority || 'important');
      setDueDate(task.dueDate || '');
      setEstimatedMinutes(task.estimatedMinutes ?? '');
      setTagsInput(task.tags ? task.tags.join(', ') : '');
      setSubtasks(task.subtasks || []);
    } else {
      setTitle('');
      setDescription('');
      setProject(projects[0]?.id || 'editorial');
      setPriority('important');
      setDueDate(new Date().toISOString().split('T')[0]);
      setEstimatedMinutes(45);
      setTagsInput('');
      setSubtasks([]);
    }
  }, [task, projects, isOpen]);

  if (!isOpen) return null;

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    audioFeedback.playTactileClick();
    const item: Subtask = {
      id: 'sub-' + Date.now().toString(36),
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    setSubtasks([...subtasks, item]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (id: string) => {
    audioFeedback.playTactileClick();
    setSubtasks(
      subtasks.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  const handleDeleteSubtask = (id: string) => {
    audioFeedback.playTactileClick();
    setSubtasks(subtasks.filter((s) => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    audioFeedback.playTactileClick();
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter((t) => t.length > 0);

    onSave({
      id: task ? task.id : undefined,
      title: title.trim(),
      description: description.trim(),
      project: project || projects[0]?.id || 'editorial',
      priority,
      dueDate: dueDate || null,
      estimatedMinutes: estimatedMinutes === '' ? undefined : Number(estimatedMinutes),
      tags,
      subtasks,
      status: task ? task.status : 'todo',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#1A1915]/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-[#FAF9F5] border border-[#E8E6DF] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E8E6DF] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg text-[#1A1915]">
              {task ? 'Edit Task' : 'Compose New Task'}
            </span>
          </div>
          <button
            onClick={() => {
              audioFeedback.playTactileClick();
              onClose();
            }}
            className="p-1.5 text-[#737168] hover:text-[#1A1915] hover:bg-[#FAF9F5] rounded-lg transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Title Input */}
          <div>
            <label className="block text-xs font-medium text-[#737168] mb-1.5 uppercase tracking-wider">
              Title
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Curate architectural monograph plates for Autumn issue"
              className="w-full px-4 py-2.5 text-base font-serif text-[#1A1915] bg-white border border-[#E8E6DF] focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C] rounded-xl outline-none placeholder:text-[#A39F93] transition-colors"
            />
          </div>

          {/* Description / Notes */}
          <div>
            <label className="block text-xs font-medium text-[#737168] mb-1.5 uppercase tracking-wider">
              Executive Notes & Context
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline specifications, material references, contacts, or reflections..."
              className="w-full px-4 py-2.5 text-xs text-[#1A1915] bg-white border border-[#E8E6DF] focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C] rounded-xl outline-none placeholder:text-[#A39F93] transition-colors leading-relaxed"
            />
          </div>

          {/* Project & Priority Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#737168] mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-[#A39F93]" />
                <span>Space / Project</span>
              </label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full px-3.5 py-2 text-xs text-[#1A1915] bg-white border border-[#E8E6DF] focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C] rounded-xl outline-none transition-colors"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#737168] mb-1.5 uppercase tracking-wider">
                Priority Tier
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-[#F0EEE6] p-1 rounded-xl">
                {(['essential', 'important', 'secondary'] as Priority[]).map((p) => {
                  const isSel = priority === p;
                  const labels: Record<Priority, string> = {
                    essential: 'Essential',
                    important: 'Important',
                    secondary: 'Standard',
                  };
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        audioFeedback.playTactileClick();
                        setPriority(p);
                      }}
                      className={`py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                        isSel
                          ? 'bg-white text-[#1A1915] shadow-xs'
                          : 'text-[#737168] hover:text-[#1A1915]'
                      }`}
                    >
                      {labels[p]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Due Date & Estimated Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#737168] mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#A39F93]" />
                <span>Target Due Date</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono text-[#1A1915] bg-white border border-[#E8E6DF] focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C] rounded-xl outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#737168] mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#A39F93]" />
                <span>Estimated Time (minutes)</span>
              </label>
              <input
                type="number"
                min="5"
                step="5"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="45"
                className="w-full px-3.5 py-2 text-xs font-mono tabular-nums text-[#1A1915] bg-white border border-[#E8E6DF] focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C] rounded-xl outline-none transition-colors"
              />
            </div>
          </div>

          {/* Subtasks Milestones */}
          <div>
            <label className="block text-xs font-medium text-[#737168] mb-1.5 uppercase tracking-wider">
              Milestones & Subtasks ({subtasks.filter((s) => s.completed).length}/{subtasks.length})
            </label>
            <div className="space-y-2 mb-3">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center gap-2 p-2 bg-white border border-[#E8E6DF] rounded-lg"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleSubtask(st.id)}
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer ${
                      st.completed
                        ? 'bg-[#1A1915] border-[#1A1915] text-white'
                        : 'border-[#CCC8BE] hover:border-[#CC785C]'
                    }`}
                  >
                    {st.completed && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                  <span
                    className={`text-xs flex-1 ${
                      st.completed ? 'line-through text-[#8C887E]' : 'text-[#1A1915]'
                    }`}
                  >
                    {st.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteSubtask(st.id)}
                    className="text-[#A39F93] hover:text-red-700 p-1 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add subtask input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="Add intermediate milestone..."
                className="flex-1 px-3 py-1.5 text-xs text-[#1A1915] bg-white border border-[#E8E6DF] focus:border-[#CC785C] rounded-lg outline-none placeholder:text-[#A39F93]"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 text-xs font-medium text-[#1A1915] bg-[#EFECE4] hover:bg-[#E5E2D8] rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-[#737168] mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-[#A39F93]" />
              <span>Tags (comma-separated)</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. Typography, Basel Press, Monograph"
              className="w-full px-3.5 py-2 text-xs text-[#1A1915] bg-white border border-[#E8E6DF] focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C] rounded-xl outline-none placeholder:text-[#A39F93] transition-colors"
            />
          </div>

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-[#E8E6DF] flex items-center justify-between">
            {task && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  audioFeedback.playTactileClick();
                  onDelete(task.id);
                  onClose();
                }}
                className="px-3.5 py-2 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              >
                Delete Task
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  audioFeedback.playTactileClick();
                  onClose();
                }}
                className="px-4 py-2 text-xs font-medium text-[#57554E] hover:text-[#1A1915] hover:bg-[#EFECE4] rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-medium text-white bg-[#1A1915] hover:bg-[#2E2C26] rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                {task ? 'Update Entry' : 'Create Entry'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
