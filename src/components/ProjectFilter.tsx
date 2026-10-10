import React from 'react';
import { Project } from '../types';
import { audioFeedback } from '../services/audioService';

interface ProjectFilterProps {
  projects: Project[];
  selectedProjectId: string | 'all';
  onSelectProject: (projectId: string | 'all') => void;
  tasksCountByProject: Record<string, number>;
  totalTasksCount: number;
}

export const ProjectFilter: React.FC<ProjectFilterProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,
  tasksCountByProject,
  totalTasksCount,
}) => {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
      {/* "All Spaces" Tab */}
      <button
        type="button"
        onClick={() => {
          audioFeedback.playTactileClick();
          onSelectProject('all');
        }}
        className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          selectedProjectId === 'all'
            ? 'bg-[#1A1915] text-white shadow-xs'
            : 'text-[#737168] hover:text-[#1A1915] hover:bg-[#F0EEE6]'
        }`}
      >
        <span>All Spaces</span>
        <span className="ml-1.5 text-[11px] opacity-75 font-mono tabular-nums">
          {totalTasksCount}
        </span>
      </button>

      {/* Individual Project Tabs */}
      {projects.map((project) => {
        const isSelected = selectedProjectId === project.id;
        const count = tasksCountByProject[project.id] || 0;
        return (
          <button
            key={project.id}
            type="button"
            onClick={() => {
              audioFeedback.playTactileClick();
              onSelectProject(project.id);
            }}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
              isSelected
                ? 'bg-[#1A1915] text-white shadow-xs'
                : 'text-[#737168] hover:text-[#1A1915] hover:bg-[#F0EEE6]'
            }`}
          >
            <span>{project.name}</span>
            <span className="text-[11px] opacity-75 font-mono tabular-nums">
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
