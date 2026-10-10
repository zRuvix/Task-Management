import { useState, useEffect, useMemo, useCallback } from 'react';
import { Task, Project, ViewMode, WorkspaceData, TaskStatus } from './types';
import { syncManager, SyncStatus } from './services/syncService';
import { audioFeedback } from './services/audioService';
import { Header } from './components/Header';
import { TaskCard } from './components/TaskCard';
import { TaskEditorModal } from './components/TaskEditorModal';
import { DeviceSyncModal } from './components/DeviceSyncModal';
import { CompanionDeviceSimulator } from './components/CompanionDeviceSimulator';
import { ZenFocusMode } from './components/ZenFocusMode';
import { CommandPalette } from './components/CommandPalette';
import { ProjectFilter } from './components/ProjectFilter';
import { 
  Plus, 
  Search, 
  Sparkles, 
  Radio, 
  Calendar, 
  FolderPlus, 
  Download, 
  Smartphone,
  SlidersHorizontal
} from 'lucide-react';

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceData>({
    tasks: [],
    projects: [],
    lastModified: Date.now(),
    devices: {},
  });
  const [currentView, setCurrentView] = useState<ViewMode>('today');
  const [selectedProjectId, setSelectedProjectId] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  
  // Modals & Panels
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isZenModeOpen, setIsZenModeOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  
  // Sound preference
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: 'syncing',
    lastSyncedAt: null,
    activeDevicesCount: 1,
    devices: [],
  });

  // Fast inline task capture
  const [quickTitle, setQuickTitle] = useState('');

  // Project creator modal state
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // Initialize and subscribe to sync manager
  useEffect(() => {
    let isMounted = true;

    syncManager.loadInitialWorkspace().then((data) => {
      if (isMounted && data) {
        setWorkspace(data);
      }
    });

    const unsubUpdates = syncManager.subscribeToUpdates((incoming) => {
      if (isMounted) {
        setWorkspace(incoming);
      }
    });

    const unsubStatus = syncManager.subscribeToStatus((status) => {
      if (isMounted) {
        setSyncStatus(status);
      }
    });

    return () => {
      isMounted = false;
      unsubUpdates();
      unsubStatus();
    };
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.tagName === 'SELECT';

      // Cmd+K or Ctrl+K for Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Escape to close active modals
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) setIsCommandPaletteOpen(false);
        else if (isEditorOpen) setIsEditorOpen(false);
        else if (isSyncModalOpen) setIsSyncModalOpen(false);
        else if (isZenModeOpen) setIsZenModeOpen(false);
        else if (isNewProjectModalOpen) setIsNewProjectModalOpen(false);
        return;
      }

      // Single-letter shortcuts when outside input fields
      if (!isInput && !e.metaKey && !e.ctrlKey) {
        if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          setEditingTask(null);
          setIsEditorOpen(true);
        } else if (e.key.toLowerCase() === 'f') {
          e.preventDefault();
          setIsZenModeOpen(true);
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          setIsSyncModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isCommandPaletteOpen,
    isEditorOpen,
    isSyncModalOpen,
    isZenModeOpen,
    isNewProjectModalOpen,
  ]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    audioFeedback.setEnabled(next);
  };

  // Helper to commit workspace changes locally and sync
  const commitWorkspace = useCallback(
    (newTasks: Task[], newProjects?: Project[]) => {
      const updated: WorkspaceData = {
        ...workspace,
        tasks: newTasks,
        projects: newProjects || workspace.projects,
        lastModified: Date.now(),
      };
      setWorkspace(updated);
      syncManager.saveWorkspace(updated);
    },
    [workspace]
  );

  // Task actions
  const handleToggleTaskComplete = (taskId: string) => {
    const updatedTasks: Task[] = workspace.tasks.map((t) => {
      if (t.id === taskId) {
        const nextStatus: TaskStatus = t.status === 'completed' ? 'todo' : 'completed';
        return {
          ...t,
          status: nextStatus,
          updatedAt: Date.now(),
          completedAt: nextStatus === 'completed' ? Date.now() : null,
        };
      }
      return t;
    });
    commitWorkspace(updatedTasks);
  };

  const handleSaveTask = (taskData: Partial<Task> & { id?: string }) => {
    const now = Date.now();
    let updatedTasks: Task[];

    if (taskData.id) {
      // Edit existing
      updatedTasks = workspace.tasks.map((t) =>
        t.id === taskData.id
          ? ({ ...t, ...taskData, updatedAt: now } as Task)
          : t
      );
    } else {
      // Create new
      const newTask: Task = {
        id: 'task-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
        title: taskData.title || 'Untitled Objective',
        description: taskData.description || '',
        project: taskData.project || workspace.projects[0]?.id || 'editorial',
        priority: taskData.priority || 'important',
        status: 'todo',
        dueDate: taskData.dueDate || new Date().toISOString().split('T')[0],
        estimatedMinutes: taskData.estimatedMinutes ?? 45,
        subtasks: taskData.subtasks || [],
        tags: taskData.tags || [],
        createdAt: now,
        updatedAt: now,
      };
      updatedTasks = [newTask, ...workspace.tasks];
    }

    commitWorkspace(updatedTasks);
  };

  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = workspace.tasks.filter((t) => t.id !== taskId);
    commitWorkspace(updatedTasks);
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    audioFeedback.playHarmonicChime();
    handleSaveTask({
      title: quickTitle.trim(),
      project: selectedProjectId === 'all' ? workspace.projects[0]?.id : selectedProjectId,
      priority: 'important',
      dueDate: new Date().toISOString().split('T')[0],
      subtasks: [],
      tags: [],
    });
    setQuickTitle('');
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    audioFeedback.playTactileClick();
    const newProj: Project = {
      id: 'proj-' + Date.now().toString(36),
      name: newProjectName.trim(),
      color: '#CC785C',
      description: newProjectDesc.trim() || 'Custom editorial domain',
    };
    commitWorkspace(workspace.tasks, [...workspace.projects, newProj]);
    setNewProjectName('');
    setNewProjectDesc('');
    setIsNewProjectModalOpen(false);
  };

  // Export workspace to Markdown Journal
  const handleExportMarkdown = () => {
    audioFeedback.playTactileClick();
    let md = `# Atelier Task Sanctuary Journal\nGenerated on ${new Date().toLocaleString()}\n\n`;
    workspace.projects.forEach((proj) => {
      md += `## Space: ${proj.name}\n${proj.description}\n\n`;
      const projTasks = workspace.tasks.filter((t) => t.project === proj.id);
      if (projTasks.length === 0) {
        md += `*No active objectives in this space.*\n\n`;
      } else {
        projTasks.forEach((t) => {
          const check = t.status === 'completed' ? '[x]' : '[ ]';
          md += `- ${check} **${t.title}** (Priority: ${t.priority.toUpperCase()}${t.dueDate ? `, Due: ${t.dueDate}` : ''})\n`;
          if (t.description) md += `  > ${t.description}\n`;
          if (t.subtasks.length > 0) {
            t.subtasks.forEach((st) => {
              md += `    - ${st.completed ? '[x]' : '[ ]'} ${st.title}\n`;
            });
          }
        });
        md += `\n`;
      }
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atelier-journal-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return workspace.tasks.filter((t) => {
      if (selectedProjectId !== 'all' && t.project !== selectedProjectId) return false;
      if (statusFilter === 'active' && t.status === 'completed') return false;
      if (statusFilter === 'completed' && t.status !== 'completed') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = t.description.toLowerCase().includes(q);
        const matchTags = t.tags.some((tag) => tag.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchTags) return false;
      }
      return true;
    });
  }, [workspace.tasks, selectedProjectId, statusFilter, searchQuery]);

  // Priority groupings for Today view
  const essentialTasks = useMemo(
    () => filteredTasks.filter((t) => t.priority === 'essential'),
    [filteredTasks]
  );
  const importantTasks = useMemo(
    () => filteredTasks.filter((t) => t.priority === 'important'),
    [filteredTasks]
  );
  const secondaryTasks = useMemo(
    () => filteredTasks.filter((t) => t.priority === 'secondary'),
    [filteredTasks]
  );

  // Project map & count map
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    workspace.projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [workspace.projects]);

  const tasksCountByProject = useMemo(() => {
    const counts: Record<string, number> = {};
    workspace.tasks.forEach((t) => {
      counts[t.project] = (counts[t.project] || 0) + 1;
    });
    return counts;
  }, [workspace.tasks]);

  const todayCompletedCount = useMemo(
    () => workspace.tasks.filter((t) => t.status === 'completed').length,
    [workspace.tasks]
  );
  const totalTasksCount = workspace.tasks.length;
  const progressPercent = totalTasksCount > 0 ? Math.round((todayCompletedCount / totalTasksCount) * 100) : 0;

  // Format today's date in quiet editorial style
  const formattedToday = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#1A1915] flex flex-col font-sans selection:bg-[#EBDDD5] selection:text-[#7A3E2D]">
      {/* Editorial Top Bar complying with Top Bar Contract */}
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenNewTask={() => {
          setEditingTask(null);
          setIsEditorOpen(true);
        }}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        syncStatus={syncStatus}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onOpenSimulator={() => setIsSimulatorOpen((prev) => !prev)}
        isSimulatorOpen={isSimulatorOpen}
        onOpenZenMode={() => setIsZenModeOpen(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
        {/* Editorial Sub-bar & Sync Presence Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E8E6DF] mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#737168] mb-1 font-mono">
              <span className="text-[#CC785C] font-serif italic text-sm">Sanctuary</span>
              <span>·</span>
              <span>Workspace: {syncManager.getWorkspaceId()}</span>
              <span>·</span>
              <span className="tabular-nums">
                {syncStatus.activeDevicesCount} device{syncStatus.activeDevicesCount !== 1 ? 's' : ''} connected
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1915] tracking-tight font-normal">
              {currentView === 'today' && 'Daily Curation & Focus'}
              {currentView === 'agenda' && 'Chronological Agenda'}
              {currentView === 'spaces' && 'Curated Spaces & Domains'}
              {currentView === 'archive' && 'Archived Accomplishments'}
            </h1>
          </div>

          {/* Quick Stats & Sync Button */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-[#737168]">
                Accomplished
              </div>
              <div className="text-sm font-mono font-medium text-[#1A1915] tabular-nums">
                {todayCompletedCount} / {totalTasksCount} ({progressPercent}%)
              </div>
            </div>

            <button
              onClick={() => {
                audioFeedback.playTactileClick();
                setIsSyncModalOpen(true);
              }}
              className="px-3.5 py-2 text-xs font-medium text-[#1A1915] bg-white hover:bg-[#F2EFE9] border border-[#E8E6DF] rounded-xl flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
              title="Manage paired devices and live QR code"
            >
              <Radio className="w-3.5 h-3.5 text-[#CC785C]" />
              <span>Multi-Device Sync</span>
            </button>
          </div>
        </div>

        {/* View: TODAY */}
        {currentView === 'today' && (
          <div className="space-y-8">
            {/* Editorial Date Kicker */}
            <div className="flex items-center justify-between text-xs text-[#737168]">
              <span className="font-serif italic text-base text-[#1A1915]">
                {formattedToday}
              </span>
              <span className="font-mono tabular-nums text-[#8C887E]">
                {filteredTasks.length} active entries listed
              </span>
            </div>

            {/* Inline Fast-Capture Bar */}
            <form onSubmit={handleQuickAdd} className="relative group">
              <input
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="Compose a new objective, reflection, or priority... (Press Enter to capture)"
                className="w-full px-5 py-3.5 pl-12 text-sm font-serif text-[#1A1915] bg-white border border-[#E8E6DF] focus:border-[#CC785C] focus:ring-1 focus:ring-[#CC785C] rounded-2xl outline-none placeholder:text-[#A39F93] shadow-xs transition-all placeholder:font-sans placeholder:text-xs"
              />
              <Plus className="w-5 h-5 text-[#8C887E] absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-[#CC785C] transition-colors" />
              {quickTitle.trim() && (
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-medium text-white bg-[#1A1915] hover:bg-[#2E2C26] rounded-lg transition-colors cursor-pointer"
                >
                  Capture
                </button>
              )}
            </form>

            {/* Filter Bar & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <ProjectFilter
                projects={workspace.projects}
                selectedProjectId={selectedProjectId}
                onSelectProject={setSelectedProjectId}
                tasksCountByProject={tasksCountByProject}
                totalTasksCount={totalTasksCount}
              />

              {/* Status segmented controls & Search */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-[#EFECE4] rounded-xl text-xs">
                  {(['all', 'active', 'completed'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        audioFeedback.playTactileClick();
                        setStatusFilter(mode);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-colors cursor-pointer ${
                        statusFilter === mode
                          ? 'bg-white text-[#1A1915] shadow-2xs'
                          : 'text-[#737168] hover:text-[#1A1915]'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter..."
                    className="w-28 sm:w-36 px-2.5 py-1 text-xs bg-white border border-[#E8E6DF] rounded-xl outline-none focus:border-[#CC785C] text-[#1A1915]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#8C887E] hover:text-[#1A1915]"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Task Lists Grouped by Priority */}
            {filteredTasks.length === 0 ? (
              <div className="bg-white border border-[#E8E6DF] rounded-2xl p-12 text-center space-y-3">
                <Sparkles className="w-6 h-6 text-[#CC785C] mx-auto" />
                <h3 className="font-serif text-lg text-[#1A1915]">
                  No tasks found in this view
                </h3>
                <p className="text-xs text-[#737168] max-w-sm mx-auto">
                  Your daily sanctuary is completely clear. Capture a new objective above or relax in contemplation.
                </p>
                <button
                  onClick={() => {
                    setEditingTask(null);
                    setIsEditorOpen(true);
                  }}
                  className="mt-2 px-4 py-2 text-xs font-medium text-white bg-[#1A1915] rounded-xl cursor-pointer hover:bg-[#2E2C26]"
                >
                  Create First Task
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Priority I: Essential */}
                {essentialTasks.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#737168] pb-1 border-b border-[#E8E6DF]">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#CC785C]" />
                        <span className="font-serif text-sm font-medium text-[#1A1915]">
                          Priority I · Essential Focus
                        </span>
                      </div>
                      <span className="font-mono tabular-nums">
                        {essentialTasks.length} {essentialTasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {essentialTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          project={projectMap.get(task.project)}
                          onToggleComplete={handleToggleTaskComplete}
                          onEdit={(t) => {
                            setEditingTask(t);
                            setIsEditorOpen(true);
                          }}
                          onDelete={handleDeleteTask}
                          onFocusTask={() => setIsZenModeOpen(true)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Priority II: Important */}
                {importantTasks.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#737168] pb-1 border-b border-[#E8E6DF]">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8A6849]" />
                        <span className="font-serif text-sm font-medium text-[#1A1915]">
                          Priority II · Important Objectives
                        </span>
                      </div>
                      <span className="font-mono tabular-nums">
                        {importantTasks.length} {importantTasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {importantTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          project={projectMap.get(task.project)}
                          onToggleComplete={handleToggleTaskComplete}
                          onEdit={(t) => {
                            setEditingTask(t);
                            setIsEditorOpen(true);
                          }}
                          onDelete={handleDeleteTask}
                          onFocusTask={() => setIsZenModeOpen(true)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Priority III: Standard */}
                {secondaryTasks.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#737168] pb-1 border-b border-[#E8E6DF]">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#737168]" />
                        <span className="font-serif text-sm font-medium text-[#1A1915]">
                          Priority III · Standard & Secondary
                        </span>
                      </div>
                      <span className="font-mono tabular-nums">
                        {secondaryTasks.length} {secondaryTasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {secondaryTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          project={projectMap.get(task.project)}
                          onToggleComplete={handleToggleTaskComplete}
                          onEdit={(t) => {
                            setEditingTask(t);
                            setIsEditorOpen(true);
                          }}
                          onDelete={handleDeleteTask}
                          onFocusTask={() => setIsZenModeOpen(true)}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        )}

        {/* View: AGENDA */}
        {currentView === 'agenda' && (
          <div className="space-y-6">
            <div className="text-xs text-[#737168] leading-relaxed">
              Chronological schedule organized by target milestones and completion due dates.
            </div>

            <div className="space-y-4">
              {filteredTasks
                .sort((a, b) => {
                  if (!a.dueDate) return 1;
                  if (!b.dueDate) return -1;
                  return a.dueDate.localeCompare(b.dueDate);
                })
                .map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    project={projectMap.get(task.project)}
                    onToggleComplete={handleToggleTaskComplete}
                    onEdit={(t) => {
                      setEditingTask(t);
                      setIsEditorOpen(true);
                    }}
                    onDelete={handleDeleteTask}
                    onFocusTask={() => setIsZenModeOpen(true)}
                  />
                ))}
            </div>
          </div>
        )}

        {/* View: SPACES */}
        {currentView === 'spaces' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#737168]">
                Editorial workspaces divide your focus between publications, architectural pavilions, and personal commitments.
              </p>
              <button
                onClick={() => {
                  audioFeedback.playTactileClick();
                  setIsNewProjectModalOpen(true);
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-[#1A1915] bg-white hover:bg-[#F2EFE9] border border-[#E8E6DF] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5 text-[#CC785C]" />
                <span>New Space</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workspace.projects.map((proj) => {
                const count = tasksCountByProject[proj.id] || 0;
                const projTasks = workspace.tasks.filter((t) => t.project === proj.id);
                const completedInProj = projTasks.filter((t) => t.status === 'completed').length;
                return (
                  <div
                    key={proj.id}
                    className="bg-white border border-[#E8E6DF] rounded-2xl p-6 shadow-xs space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-xl text-[#1A1915]">
                        {proj.name}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-[#737168]">
                        {completedInProj}/{count} completed
                      </span>
                    </div>

                    <p className="text-xs text-[#57554E] leading-relaxed">
                      {proj.description}
                    </p>

                    <div className="pt-3 border-t border-[#F0EEE6] flex items-center justify-between text-xs text-[#737168]">
                      <button
                        onClick={() => {
                          setSelectedProjectId(proj.id);
                          setCurrentView('today');
                        }}
                        className="text-[#CC785C] hover:underline font-medium cursor-pointer"
                      >
                        View {count} entries →
                      </button>

                      <button
                        onClick={() => {
                          setEditingTask(null);
                          setIsEditorOpen(true);
                        }}
                        className="text-[#737168] hover:text-[#1A1915] cursor-pointer"
                      >
                        + Add objective
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* View: ARCHIVE */}
        {currentView === 'archive' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E6DF]">
              <div>
                <h3 className="font-serif text-lg text-[#1A1915]">
                  Completed Records
                </h3>
                <p className="text-xs text-[#737168]">
                  Historical archive of finished tasks and creative achievements.
                </p>
              </div>

              <button
                onClick={handleExportMarkdown}
                className="px-3.5 py-1.5 text-xs font-medium text-[#1A1915] bg-white border border-[#E8E6DF] rounded-xl flex items-center gap-1.5 hover:bg-[#F2EFE9] transition-colors cursor-pointer"
                title="Export complete journal to Markdown"
              >
                <Download className="w-3.5 h-3.5 text-[#CC785C]" />
                <span>Export Journal (MD)</span>
              </button>
            </div>

            <div className="space-y-3">
              {workspace.tasks.filter((t) => t.status === 'completed').length === 0 ? (
                <div className="py-12 text-center text-xs text-[#737168] font-serif">
                  No completed tasks archived yet.
                </div>
              ) : (
                workspace.tasks
                  .filter((t) => t.status === 'completed')
                  .map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      project={projectMap.get(task.project)}
                      onToggleComplete={handleToggleTaskComplete}
                      onEdit={(t) => {
                        setEditingTask(t);
                        setIsEditorOpen(true);
                      }}
                      onDelete={handleDeleteTask}
                    />
                  ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Editorial Footer (Strictly quiet copyright & links, no fake engines) */}
      <footer className="mt-auto border-t border-[#E8E6DF] bg-[#FAF9F5] py-8 text-xs text-[#737168]">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-serif text-sm font-medium text-[#1A1915]">Atelier</span>
            <span aria-hidden="true" className="text-[#DDDBCF]">·</span>
            <span>Editorial Task Sanctuary</span>
            <span aria-hidden="true" className="text-[#DDDBCF]">·</span>
            <span className="font-mono text-[11px]">Real-Time Multi-Device Sync</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hover:text-[#1A1915] cursor-pointer"
            >
              Command Palette (⌘K)
            </button>
            <span>·</span>
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="hover:text-[#1A1915] cursor-pointer"
            >
              Device Pairing QR
            </button>
            <span>·</span>
            <button
              onClick={handleExportMarkdown}
              className="hover:text-[#1A1915] cursor-pointer"
            >
              Export Archive
            </button>
          </div>
        </div>
      </footer>

      {/* Task Compose / Edit Modal */}
      <TaskEditorModal
        isOpen={isEditorOpen}
        task={editingTask}
        projects={workspace.projects}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingTask(null);
        }}
      />

      {/* Multi-Device Sync Modal with QR Code */}
      <DeviceSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        syncStatus={syncStatus}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
      />

      {/* Companion Phone Device Simulator for Real-Time Testing */}
      <CompanionDeviceSimulator
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        tasks={workspace.tasks}
        projects={workspace.projects}
        onToggleComplete={handleToggleTaskComplete}
        onAddTask={handleSaveTask}
        workspaceId={syncManager.getWorkspaceId()}
      />

      {/* Zen Focus Sanctuary Fullscreen Mode */}
      <ZenFocusMode
        isOpen={isZenModeOpen}
        onClose={() => setIsZenModeOpen(false)}
        tasks={workspace.tasks}
        onToggleComplete={handleToggleTaskComplete}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
      />

      {/* Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        tasks={workspace.tasks}
        projects={workspace.projects}
        onSelectTask={(task) => {
          setEditingTask(task);
          setIsEditorOpen(true);
        }}
        onNewTask={() => {
          setEditingTask(null);
          setIsEditorOpen(true);
        }}
        onSelectView={setCurrentView}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onOpenZen={() => setIsZenModeOpen(true)}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
      />

      {/* New Project Space Modal */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1915]/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-[#E8E6DF] rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-lg text-[#1A1915]">
              Create Editorial Space
            </h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#737168] mb-1 uppercase tracking-wider">
                  Space Title
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Kyoto Tea Pavilion Restoration"
                  className="w-full px-3 py-2 text-xs text-[#1A1915] border border-[#E8E6DF] focus:border-[#CC785C] rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#737168] mb-1 uppercase tracking-wider">
                  Executive Briefing / Scope
                </label>
                <textarea
                  rows={2}
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Outline focus areas, craftsmanship benchmarks..."
                  className="w-full px-3 py-2 text-xs text-[#1A1915] border border-[#E8E6DF] focus:border-[#CC785C] rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-[#737168] hover:text-[#1A1915] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[#1A1915] hover:bg-[#2E2C26] rounded-xl"
                >
                  Create Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
