'use client';

export async function collectDeviceFingerprint(): Promise<{
  deviceId: string;
  appId: string;
  browser: string;
  graphics: string;
  location?: { latitude: number; longitude: number };
}> {
  let deviceId = '';
  try {
    deviceId = localStorage.getItem('prime_device_id') || '';
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('prime_device_id', deviceId);
    }
  } catch {
    deviceId = 'dev_' + Math.random().toString(36).substring(2);
  }

  // Graphics (WebGL unmasked vendor/renderer)
  let graphics = 'Generic / Canvas Fallback';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        graphics = `${vendor} - ${renderer}`;
      }
    }
  } catch {
    graphics = 'Unavailable';
  }

  // Browser & App ID
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  const appId = (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.version)
    ? `Telegram-MiniApp-${(window as any).Telegram?.WebApp?.version}`
    : 'Telegram-Web-Container';

  // Geolocation if available
  let location: { latitude: number; longitude: number } | undefined = undefined;
  try {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      const pos = await new Promise<GeolocationPosition | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p),
          () => resolve(null),
          { timeout: 3000 }
        );
      });
      if (pos) {
        location = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
      }
    }
  } catch {
    // Non-blocking
  }

  return {
    deviceId,
    appId,
    browser: userAgent,
    graphics,
    location,
  };
}
