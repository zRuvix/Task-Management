import { WorkspaceData, Task, Project, DevicePresence } from '../types';

export interface SyncStatus {
  state: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncedAt: number | null;
  activeDevicesCount: number;
  devices: DevicePresence[];
}

export class MultiDeviceSyncManager {
  private workspaceId: string;
  private deviceId: string;
  private deviceName: string;
  private deviceType: 'desktop' | 'mobile' | 'tablet';
  private eventSource: EventSource | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private updateListeners: ((data: WorkspaceData) => void)[] = [];
  private statusListeners: ((status: SyncStatus) => void)[] = [];
  private presenceTimer: number | null = null;
  private currentStatus: SyncStatus = {
    state: 'syncing',
    lastSyncedAt: null,
    activeDevicesCount: 1,
    devices: [],
  };

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.deviceName = this.detectDeviceName();
    this.deviceType = this.detectDeviceType();
    this.workspaceId = this.resolveWorkspaceId();
    this.initBroadcastChannel();
  }

  public getWorkspaceId(): string {
    return this.workspaceId;
  }

  public getDeviceId(): string {
    return this.deviceId;
  }

  public getDeviceName(): string {
    return this.deviceName;
  }

  public setDeviceName(name: string) {
    this.deviceName = name;
    localStorage.setItem('atelier_device_name', name);
    this.sendPresenceHeartbeat();
  }

  public setWorkspaceId(newId: string) {
    if (newId === this.workspaceId) return;
    this.workspaceId = newId.trim().toLowerCase();
    localStorage.setItem('atelier_workspace_id', this.workspaceId);
    
    // Update URL without page reload
    const url = new URL(window.location.href);
    url.searchParams.set('ws', this.workspaceId);
    window.history.replaceState({}, '', url.toString());

    this.disconnectSSE();
    this.connectSSE();
  }

  private resolveWorkspaceId(): string {
    if (typeof window === 'undefined') return 'atelier-sanctuary';
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('ws');
    if (fromUrl && fromUrl.trim().length > 0) {
      const sanitized = fromUrl.trim().toLowerCase();
      localStorage.setItem('atelier_workspace_id', sanitized);
      return sanitized;
    }
    const fromStorage = localStorage.getItem('atelier_workspace_id');
    if (fromStorage) return fromStorage;
    return 'atelier-sanctuary';
  }

  private getOrCreateDeviceId(): string {
    if (typeof window === 'undefined') return 'device-server';
    let id = localStorage.getItem('atelier_device_id');
    if (!id) {
      id = 'dev-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
      localStorage.setItem('atelier_device_id', id);
    }
    return id;
  }

  private detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    if (typeof window === 'undefined') return 'desktop';
    const ua = navigator.userAgent.toLowerCase();
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  private detectDeviceName(): string {
    if (typeof window === 'undefined') return 'Desktop Studio';
    const saved = localStorage.getItem('atelier_device_name');
    if (saved) return saved;

    const type = this.detectDeviceType();
    const ua = navigator.userAgent;
    let os = 'Device';
    if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'Mac Studio';
    else if (ua.includes('iPhone')) os = 'iPhone';
    else if (ua.includes('iPad')) os = 'iPad Pro';
    else if (ua.includes('Android')) os = 'Mobile Android';
    else if (ua.includes('Windows')) os = 'Windows PC';
    else if (ua.includes('Linux')) os = 'Linux Station';

    return `${os} (${type === 'mobile' ? 'Journal' : 'Atelier'})`;
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('atelier_cross_tab_sync');
      this.broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'local_workspace_update' && event.data.workspaceId === this.workspaceId) {
          if (event.data.senderDeviceId !== this.deviceId) {
            this.notifyUpdate(event.data.data);
          }
        }
      };
    }
  }

  public subscribeToUpdates(callback: (data: WorkspaceData) => void): () => void {
    this.updateListeners.push(callback);
    return () => {
      this.updateListeners = this.updateListeners.filter((cb) => cb !== callback);
    };
  }

  public subscribeToStatus(callback: (status: SyncStatus) => void): () => void {
    this.statusListeners.push(callback);
    callback(this.currentStatus);
    return () => {
      this.statusListeners = this.statusListeners.filter((cb) => cb !== callback);
    };
  }

  private notifyUpdate(data: WorkspaceData) {
    this.updateListeners.forEach((cb) => cb(data));
  }

  private notifyStatus(status: SyncStatus) {
    this.currentStatus = status;
    this.statusListeners.forEach((cb) => cb(status));
  }

  // Load initial workspace from Server, fallback to LocalStorage
  public async loadInitialWorkspace(): Promise<WorkspaceData | null> {
    const cacheKey = `atelier_ws_${this.workspaceId}`;
    const localCachedStr = localStorage.getItem(cacheKey);
    let localData: WorkspaceData | null = null;
    if (localCachedStr) {
      try {
        localData = JSON.parse(localCachedStr);
      } catch {}
    }

    try {
      this.notifyStatus({ ...this.currentStatus, state: 'syncing' });
      const resp = await fetch(`/api/workspaces/${this.workspaceId}`);
      if (resp.ok) {
        const json = await resp.json();
        const serverData: WorkspaceData = json.data;
        localStorage.setItem(cacheKey, JSON.stringify(serverData));
        
        const deviceList = Object.values(serverData.devices || {});
        this.notifyStatus({
          state: 'synced',
          lastSyncedAt: Date.now(),
          activeDevicesCount: Math.max(1, deviceList.length),
          devices: deviceList,
        });

        // Start SSE connection and presence heartbeat
        this.connectSSE();
        this.startPresenceLoop();
        return serverData;
      }
    } catch {
      // Offline fallback
      this.notifyStatus({
        ...this.currentStatus,
        state: 'offline',
      });
    }

    // Connect SSE anyway for recovery when online
    this.connectSSE();
    this.startPresenceLoop();
    return localData;
  }

  // Save workspace changes locally & broadcast across network and tabs
  public async saveWorkspace(data: WorkspaceData): Promise<void> {
    const cacheKey = `atelier_ws_${this.workspaceId}`;
    data.lastModified = Date.now();
    localStorage.setItem(cacheKey, JSON.stringify(data));

    // Instant local BroadcastChannel push
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'local_workspace_update',
        workspaceId: this.workspaceId,
        senderDeviceId: this.deviceId,
        data,
      });
    }

    // Network push to Express backend
    try {
      this.notifyStatus({ ...this.currentStatus, state: 'syncing' });
      const resp = await fetch(`/api/workspaces/${this.workspaceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: data.tasks,
          projects: data.projects,
          senderDeviceId: this.deviceId,
        }),
      });

      if (resp.ok) {
        this.notifyStatus({
          ...this.currentStatus,
          state: 'synced',
          lastSyncedAt: Date.now(),
        });
      } else {
        this.notifyStatus({ ...this.currentStatus, state: 'error' });
      }
    } catch {
      this.notifyStatus({ ...this.currentStatus, state: 'offline' });
    }
  }

  private connectSSE() {
    if (typeof window === 'undefined') return;
    this.disconnectSSE();

    try {
      const sseUrl = `/api/sync/${this.workspaceId}/stream?deviceId=${encodeURIComponent(this.deviceId)}`;
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.addEventListener('connected', (event) => {
        try {
          const payload = JSON.parse(event.data);
          const devices = Object.values(payload.data?.devices || {}) as DevicePresence[];
          this.notifyStatus({
            state: 'synced',
            lastSyncedAt: Date.now(),
            activeDevicesCount: Math.max(1, devices.length),
            devices,
          });
        } catch {}
      });

      this.eventSource.addEventListener('update', (event) => {
        try {
          const payload = JSON.parse(event.data);
          // If the sender wasn't this device, apply the update!
          if (payload.senderDeviceId !== this.deviceId && payload.data) {
            const cacheKey = `atelier_ws_${this.workspaceId}`;
            localStorage.setItem(cacheKey, JSON.stringify(payload.data));
            this.notifyUpdate(payload.data);
            this.notifyStatus({
              ...this.currentStatus,
              state: 'synced',
              lastSyncedAt: Date.now(),
            });
          }
        } catch {}
      });

      this.eventSource.addEventListener('presence', (event) => {
        try {
          const payload = JSON.parse(event.data);
          const devices = Object.values(payload.devices || {}) as DevicePresence[];
          this.notifyStatus({
            ...this.currentStatus,
            activeDevicesCount: Math.max(1, devices.length),
            devices,
          });
        } catch {}
      });

      this.eventSource.onerror = () => {
        this.notifyStatus({ ...this.currentStatus, state: 'offline' });
      };
    } catch {
      this.notifyStatus({ ...this.currentStatus, state: 'offline' });
    }
  }

  private disconnectSSE() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private startPresenceLoop() {
    this.sendPresenceHeartbeat();
    if (this.presenceTimer) clearInterval(this.presenceTimer);
    this.presenceTimer = window.setInterval(() => {
      this.sendPresenceHeartbeat();
    }, 25000);
  }

  public async sendPresenceHeartbeat() {
    try {
      const resp = await fetch(`/api/workspaces/${this.workspaceId}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: this.deviceId,
          deviceName: this.deviceName,
          deviceType: this.deviceType,
        }),
      });
      if (resp.ok) {
        const json = await resp.json();
        const devices = Object.values(json.devices || {}) as DevicePresence[];
        this.notifyStatus({
          ...this.currentStatus,
          activeDevicesCount: Math.max(1, devices.length),
          devices,
        });
      }
    } catch {}
  }

  public getShareableUrl(): string {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    return `${origin}/?ws=${encodeURIComponent(this.workspaceId)}`;
  }

  public destroy() {
    this.disconnectSSE();
    if (this.presenceTimer) clearInterval(this.presenceTimer);
    if (this.broadcastChannel) this.broadcastChannel.close();
  }
}

export const syncManager = new MultiDeviceSyncManager();
