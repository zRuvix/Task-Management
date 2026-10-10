import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';

interface Task {
  id: string;
  title: string;
  description: string;
  project: string;
  priority: 'essential' | 'important' | 'secondary';
  status: 'todo' | 'in_progress' | 'completed';
  dueDate: string | null;
  estimatedMinutes?: number;
  subtasks: { id: string; title: string; completed: boolean }[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number | null;
}

interface Project {
  id: string;
  name: string;
  color: string;
  description: string;
}

interface DevicePresence {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  lastSeen: number;
}

interface WorkspaceData {
  tasks: Task[];
  projects: Project[];
  lastModified: number;
  devices: Record<string, DevicePresence>;
}

// In-memory workspace storage with file backup fallback
const workspaces = new Map<string, WorkspaceData>();
const sseClients = new Map<string, Set<Response>>();

// Default starter tasks with refined editorial quality
function getInitialWorkspace(): WorkspaceData {
  const now = Date.now();
  return {
    lastModified: now,
    devices: {},
    projects: [
      { id: 'editorial', name: 'Monograph & Publishing', color: '#CC785C', description: 'Essays, manuscripts, and design publications' },
      { id: 'studio', name: 'Atelier Architecture', color: '#96705B', description: 'Spatial designs and material selection' },
      { id: 'ventures', name: 'Private Ventures', color: '#666B60', description: 'Advisory, acquisitions, and strategic capital' },
      { id: 'rituals', name: 'Personal Rituals', color: '#82786D', description: 'Health, solitude, and contemplative practices' },
    ],
    tasks: [
      {
        id: 'task-1',
        title: 'Review galley proofs for Volume IV Architectural Monograph',
        description: 'Examine typography margins, plate reproductions, and index references before final lithographic pressing in Basel.',
        project: 'editorial',
        priority: 'essential',
        status: 'in_progress',
        dueDate: new Date(now + 86400000).toISOString().split('T')[0],
        estimatedMinutes: 90,
        tags: ['Print', 'Typography', 'Basel Press'],
        subtasks: [
          { id: 'sub-1', title: 'Verify Newsreader optical sizing at 11pt', completed: true },
          { id: 'sub-2', title: 'Check duotone contrast on coated stock samples', completed: true },
          { id: 'sub-3', title: 'Sign off on colophon and isbn credentials', completed: false },
        ],
        createdAt: now - 3600000 * 5,
        updatedAt: now - 3600000 * 2,
      },
      {
        id: 'task-2',
        title: 'Finalize travertine & brushed bronze finish specifications',
        description: 'Coordinate with Venetian stone carver regarding honed finish depth for the gallery entrance portal.',
        project: 'studio',
        priority: 'essential',
        status: 'todo',
        dueDate: new Date(now + 86400000 * 2).toISOString().split('T')[0],
        estimatedMinutes: 60,
        tags: ['Materials', 'Pavilion', 'Spec'],
        subtasks: [
          { id: 'sub-4', title: 'Confirm Roman travertine quarry batch #408', completed: false },
          { id: 'sub-5', title: 'Approve wax coating durability report', completed: false },
        ],
        createdAt: now - 3600000 * 4,
        updatedAt: now - 3600000 * 4,
      },
      {
        id: 'task-3',
        title: 'Draft Q4 Strategic Allocation memo for Founders Circle',
        description: 'Synthesize liquidity distribution, evergreen portfolio rebalancing, and founder sovereign commitments.',
        project: 'ventures',
        priority: 'important',
        status: 'todo',
        dueDate: new Date(now + 86400000 * 4).toISOString().split('T')[0],
        estimatedMinutes: 120,
        tags: ['Strategy', 'Executive'],
        subtasks: [
          { id: 'sub-6', title: 'Consolidate audited balance sheet appendices', completed: true },
          { id: 'sub-7', title: 'Calibrate sensitivity analysis for European assets', completed: false },
        ],
        createdAt: now - 3600000 * 3,
        updatedAt: now - 3600000 * 3,
      },
      {
        id: 'task-4',
        title: 'Morning silent meditation & 5km countryside trail walk',
        description: 'Unplugged ritual before dawn to maintain creative clarity and composure.',
        project: 'rituals',
        priority: 'secondary',
        status: 'completed',
        dueDate: new Date().toISOString().split('T')[0],
        estimatedMinutes: 45,
        tags: ['Wellbeing', 'Focus'],
        subtasks: [
          { id: 'sub-8', title: '20 minutes zazen breathing', completed: true },
          { id: 'sub-9', title: 'Trail stride & hydration', completed: true },
        ],
        createdAt: now - 3600000 * 8,
        updatedAt: now - 3600000 * 1,
        completedAt: now - 3600000 * 1,
      },
    ],
  };
}

// Broadcast workspace update to all active SSE subscribers for this workspace
function broadcastWorkspace(workspaceId: string, data: WorkspaceData, senderDeviceId?: string) {
  const clients = sseClients.get(workspaceId);
  if (!clients || clients.size === 0) return;

  const payload = JSON.stringify({
    type: 'sync_update',
    workspaceId,
    senderDeviceId,
    data,
    timestamp: Date.now(),
  });

  const deadClients: Response[] = [];
  clients.forEach((client) => {
    try {
      client.write(`event: update\ndata: ${payload}\n\n`);
    } catch {
      deadClients.push(client);
    }
  });

  deadClients.forEach((dead) => clients.delete(dead));
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));

  // CORS headers for seamless cross-device/network access
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Id');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // REST API: Get or create workspace
  app.get('/api/workspaces/:id', (req: Request, res: Response) => {
    const workspaceId = req.params.id;
    if (!workspaces.has(workspaceId)) {
      workspaces.set(workspaceId, getInitialWorkspace());
    }
    const ws = workspaces.get(workspaceId)!;
    
    // Prune stale devices older than 2 minutes
    const now = Date.now();
    for (const [devId, dev] of Object.entries(ws.devices)) {
      if (now - dev.lastSeen > 120000) {
        delete ws.devices[devId];
      }
    }

    res.json({
      workspaceId,
      data: ws,
      activeSubscribers: sseClients.get(workspaceId)?.size || 0,
    });
  });

  // REST API: Update workspace state
  app.post('/api/workspaces/:id', (req: Request, res: Response) => {
    const workspaceId = req.params.id;
    const { tasks, projects, senderDeviceId } = req.body;
    
    let ws = workspaces.get(workspaceId);
    if (!ws) {
      ws = getInitialWorkspace();
      workspaces.set(workspaceId, ws);
    }

    if (Array.isArray(tasks)) {
      ws.tasks = tasks;
    }
    if (Array.isArray(projects)) {
      ws.projects = projects;
    }
    ws.lastModified = Date.now();

    // Broadcast change to other devices
    broadcastWorkspace(workspaceId, ws, senderDeviceId);

    res.json({
      success: true,
      lastModified: ws.lastModified,
      activeDevices: Object.keys(ws.devices).length,
    });
  });

  // REST API: Device heartbeat & presence registration
  app.post('/api/workspaces/:id/presence', (req: Request, res: Response) => {
    const workspaceId = req.params.id;
    const { deviceId, deviceName, deviceType } = req.body;

    let ws = workspaces.get(workspaceId);
    if (!ws) {
      ws = getInitialWorkspace();
      workspaces.set(workspaceId, ws);
    }

    if (deviceId) {
      ws.devices[deviceId] = {
        deviceId,
        deviceName: deviceName || 'Anonymous Device',
        deviceType: deviceType || 'desktop',
        lastSeen: Date.now(),
      };
    }

    // Prune stale devices
    const now = Date.now();
    for (const [devId, dev] of Object.entries(ws.devices)) {
      if (now - dev.lastSeen > 90000) {
        delete ws.devices[devId];
      }
    }

    // Broadcast presence update
    const clients = sseClients.get(workspaceId);
    if (clients && clients.size > 0) {
      const presencePayload = JSON.stringify({
        type: 'presence_update',
        workspaceId,
        devices: ws.devices,
      });
      clients.forEach((client) => {
        try {
          client.write(`event: presence\ndata: ${presencePayload}\n\n`);
        } catch {}
      });
    }

    res.json({ success: true, devices: ws.devices });
  });

  // SSE: Real-Time Stream for multi-device live sync
  app.get('/api/sync/:id/stream', (req: Request, res: Response) => {
    const workspaceId = req.params.id;
    const deviceId = (req.query.deviceId as string) || 'unknown';

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    if (!workspaces.has(workspaceId)) {
      workspaces.set(workspaceId, getInitialWorkspace());
    }

    if (!sseClients.has(workspaceId)) {
      sseClients.set(workspaceId, new Set());
    }
    const clients = sseClients.get(workspaceId)!;
    clients.add(res);

    // Send initial handshake
    const initialData = workspaces.get(workspaceId)!;
    res.write(`event: connected\ndata: ${JSON.stringify({
      workspaceId,
      timestamp: Date.now(),
      data: initialData,
      connectedClients: clients.size,
    })}\n\n`);

    // Heartbeat every 15s to keep proxy connections alive
    const heartbeatTimer = setInterval(() => {
      try {
        res.write(`: heartbeat ${Date.now()}\n\n`);
      } catch {
        clearInterval(heartbeatTimer);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeatTimer);
      clients.delete(res);
      if (clients.size === 0) {
        sseClients.delete(workspaceId);
      }
    });
  });

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', uptime: process.uptime() });
  });

  // Vite integration
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Atelier editorial server active on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
