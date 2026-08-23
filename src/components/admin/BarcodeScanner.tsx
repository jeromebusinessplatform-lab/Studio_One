import React, { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
}

export function BarcodeScanner({ onScanSuccess, onScanFailure }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Create the scanner
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 150 }, supportedScanTypes: [] }, // let html5-qrcode handle default supported types (QR + 1D)
      false
    );

    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        // Prevent multiple rapid calls
        if (scannerRef.current) {
          scannerRef.current.pause(true);
          onScanSuccess(decodedText);
          // Resume after a bit if the parent doesn't unmount
          setTimeout(() => {
            if (scannerRef.current) {
              scannerRef.current.resume();
            }
          }, 2000);
        }
      },
      (error) => {
        if (onScanFailure) {
          onScanFailure(error);
        }
      }
    );

    // Cleanup when component unmounts
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner. ", error);
        });
      }
    };
  }, [onScanSuccess, onScanFailure]);

  return (
    <div className="w-full">
      <div id="reader" className="w-full rounded-xl overflow-hidden [&_video]:object-cover" />
    </div>
  );
}
