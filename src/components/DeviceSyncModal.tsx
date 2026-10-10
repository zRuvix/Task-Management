import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { syncManager, SyncStatus } from '../services/syncService';
import { X, Copy, Check, Smartphone, Laptop, Tablet, Radio, RefreshCw, Key, ShieldCheck, ArrowRight } from 'lucide-react';
import { audioFeedback } from '../services/audioService';

interface DeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncStatus: SyncStatus;
  onOpenSimulator: () => void;
}

export const DeviceSyncModal: React.FC<DeviceSyncModalProps> = ({
  isOpen,
  onClose,
  syncStatus,
  onOpenSimulator,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [deviceNameInput, setDeviceNameInput] = useState('');
  const [isEditingDeviceName, setIsEditingDeviceName] = useState(false);

  const currentWorkspaceId = syncManager.getWorkspaceId();
  const currentDeviceId = syncManager.getDeviceId();
  const currentDeviceName = syncManager.getDeviceName();
  const shareableUrl = syncManager.getShareableUrl();

  useEffect(() => {
    if (isOpen) {
      setCustomKeyInput(currentWorkspaceId);
      setDeviceNameInput(currentDeviceName);

      // Generate real QR code for mobile scanning
      QRCode.toDataURL(shareableUrl, {
        width: 240,
        margin: 1.5,
        color: {
          dark: '#1A1915',
          light: '#FAF9F5',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code:', err));
    }
  }, [isOpen, currentWorkspaceId, shareableUrl, currentDeviceName]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    audioFeedback.playTactileClick();
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSwitchWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customKeyInput.trim()) return;
    audioFeedback.playTactileClick();
    syncManager.setWorkspaceId(customKeyInput.trim());
  };

  const handleSaveDeviceName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceNameInput.trim()) return;
    audioFeedback.playTactileClick();
    syncManager.setDeviceName(deviceNameInput.trim());
    setIsEditingDeviceName(false);
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-4 h-4 text-[#CC785C]" />;
      case 'tablet':
        return <Tablet className="w-4 h-4 text-[#8A6849]" />;
      default:
        return <Laptop className="w-4 h-4 text-[#1A1915]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#1A1915]/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-[#FAF9F5] border border-[#E8E6DF] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8E6DF] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-[#CC785C]" />
            <h2 className="font-serif text-lg text-[#1A1915]">
              Multi-Device Sanctuary Synchronization
            </h2>
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Philosophy / Overview */}
          <div className="bg-[#F5F3EC] border border-[#E8E6DF] rounded-xl p-4 text-xs text-[#57554E] leading-relaxed">
            <div className="flex items-center gap-2 font-medium text-[#1A1915] mb-1">
              <ShieldCheck className="w-4 h-4 text-[#CC785C]" />
              <span>Real-Time Bi-Directional Cloud Stream</span>
            </div>
            Atelier syncs changes instantly across your Mac, iPhone, iPad, and other devices using low-latency Server-Sent Events (SSE) and browser broadcast channels. Tasks created or checked off anywhere reflect everywhere with zero friction.
          </div>

          {/* QR Code & Mobile Pairing Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center bg-white border border-[#E8E6DF] rounded-xl p-5">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="p-3 bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl shadow-xs mb-2">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="Scan to pair mobile device"
                    className="w-44 h-44 object-contain"
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-xs text-[#737168]">
                    Generating QR code...
                  </div>
                )}
              </div>
              <span className="text-[11px] text-[#737168] font-mono">
                Scan with iPhone / iPad camera
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-serif text-base text-[#1A1915] mb-1">
                  Instant Mobile Pairing
                </h4>
                <p className="text-xs text-[#737168] leading-relaxed">
                  Open your camera or mobile browser to connect this exact task sanctuary. No registration or passwords required.
                </p>
              </div>

              {/* Copy Direct URL */}
              <div>
                <label className="block text-[11px] font-medium text-[#737168] mb-1 uppercase tracking-wider">
                  Direct Sanctuary Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareableUrl}
                    className="flex-1 px-3 py-1.5 text-xs font-mono text-[#57554E] bg-[#FAF9F5] border border-[#E8E6DF] rounded-lg select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 text-xs font-medium text-[#1A1915] bg-[#EFECE4] hover:bg-[#E5E2D8] rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Simulator Shortcut */}
              <div className="pt-2 border-t border-[#F0EEE6]">
                <button
                  type="button"
                  onClick={() => {
                    audioFeedback.playTactileClick();
                    onClose();
                    onOpenSimulator();
                  }}
                  className="w-full py-2 px-3 text-xs font-medium text-[#1A1915] bg-[#F5F3EC] hover:bg-[#EAE7DC] border border-[#E8E6DF] rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#CC785C]" />
                  <span>Open Companion Simulator (Split View)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Connected Devices List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-sm text-[#1A1915] flex items-center gap-2">
                <span>Active Connected Devices in this Sanctuary</span>
                <span className="font-mono text-xs text-[#737168] font-normal">
                  ({syncStatus.activeDevicesCount})
                </span>
              </h3>
              <div className="text-[11px] text-[#737168] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                <span>Real-Time SSE Connected</span>
              </div>
            </div>

            <div className="space-y-2">
              {/* This Device */}
              <div className="flex items-center justify-between p-3 bg-white border border-[#E8E6DF] rounded-xl">
                <div className="flex items-center gap-3">
                  {getDeviceIcon('desktop')}
                  <div>
                    <div className="flex items-center gap-2">
                      {isEditingDeviceName ? (
                        <form onSubmit={handleSaveDeviceName} className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={deviceNameInput}
                            onChange={(e) => setDeviceNameInput(e.target.value)}
                            className="px-2 py-0.5 text-xs text-[#1A1915] border border-[#CC785C] rounded outline-none"
                            autoFocus
                          />
                          <button
                            type="submit"
                            className="px-2 py-0.5 text-[11px] bg-[#1A1915] text-white rounded cursor-pointer"
                          >
                            Save
                          </button>
                        </form>
                      ) : (
                        <>
                          <span className="text-xs font-medium text-[#1A1915]">
                            {currentDeviceName}
                          </span>
                          <span className="text-[10px] text-[#CC785C] bg-[#FAF0EB] px-1.5 py-0.5 rounded font-mono">
                            This Device
                          </span>
                        </>
                      )}
                    </div>
                    <span className="text-[11px] text-[#737168] font-mono">
                      ID: {currentDeviceId.substring(0, 12)}... · Active Now
                    </span>
                  </div>
                </div>

                {!isEditingDeviceName && (
                  <button
                    type="button"
                    onClick={() => setIsEditingDeviceName(true)}
                    className="text-[11px] text-[#737168] hover:text-[#1A1915] underline cursor-pointer"
                  >
                    Rename
                  </button>
                )}
              </div>

              {/* Other Connected Devices */}
              {syncStatus.devices
                .filter((d) => d.deviceId !== currentDeviceId)
                .map((d) => (
                  <div
                    key={d.deviceId}
                    className="flex items-center justify-between p-3 bg-white border border-[#E8E6DF] rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      {getDeviceIcon(d.deviceType)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-[#1A1915]">
                            {d.deviceName}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#737168] font-mono">
                          ID: {d.deviceId.substring(0, 12)}... · Active
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-mono">
                      Synced
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Custom Sanctuary Key / Switching */}
          <div className="pt-4 border-t border-[#E8E6DF]">
            <form onSubmit={handleSwitchWorkspace} className="space-y-2">
              <label className="block text-xs font-medium text-[#737168] uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#A39F93]" />
                <span>Sanctuary Workspace Key</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customKeyInput}
                  onChange={(e) => setCustomKeyInput(e.target.value)}
                  placeholder="e.g. atelier-paris-2026"
                  className="flex-1 px-3 py-2 text-xs font-mono text-[#1A1915] bg-white border border-[#E8E6DF] focus:border-[#CC785C] rounded-xl outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-[#1A1915] hover:bg-[#2E2C26] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Switch Key</span>
                </button>
              </div>
              <p className="text-[11px] text-[#737168]">
                Devices with matching keys automatically form an encrypted sync chamber.
              </p>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#E8E6DF] bg-white flex items-center justify-end">
          <button
            type="button"
            onClick={() => {
              audioFeedback.playTactileClick();
              onClose();
            }}
            className="px-4 py-1.5 text-xs font-medium text-[#1A1915] bg-[#EFECE4] hover:bg-[#E5E2D8] rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
