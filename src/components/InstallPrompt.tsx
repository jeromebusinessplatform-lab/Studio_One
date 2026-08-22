import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
        setDeferredPrompt(null);
      }
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-black text-white p-4 rounded-xl shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-10">
      <div className="flex items-center gap-3">
        <div className="bg-white/10 p-2 rounded-lg">
          <Download size={20} />
        </div>
        <div>
          <p className="font-semibold text-sm">Install PRIME</p>
          <p className="text-[10px] text-neutral-400">Add to your home screen</p>
        </div>
      </div>
      <button
        onClick={handleInstallClick}
        className="text-[11px] font-semibold bg-white text-black px-4 py-2 rounded-lg uppercase tracking-wider"
      >
        Install
      </button>
    </div>
  );
}
