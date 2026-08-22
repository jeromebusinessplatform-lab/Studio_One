import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  RefreshCw,
  X,
  Eye,
  Camera,
  ShieldCheck,
  Building,
  CreditCard,
  Layers,
  HelpCircle,
} from "lucide-react";
import type { ReceiptOcrResult } from "@/types/ocr.ts";
import { analyzeReceiptImage, SAMPLE_RECEIPTS, type SampleReceipt } from "@/lib/ocr.ts";
import { formatCurrency } from "@/lib/utils.ts";
import { toast } from "sonner";

interface ReceiptOcrScannerProps {
  expectedAmount?: number;
  expectedReceiver?: string;
  initialReceiptUrl?: string;
  initialOcrResult?: ReceiptOcrResult | null;
  onOcrComplete?: (result: ReceiptOcrResult, previewUrl: string) => void;
  onRemoveReceipt?: () => void;
  title?: string;
  compact?: boolean;
}

export function ReceiptOcrScanner({
  expectedAmount,
  expectedReceiver = "PRIME ENTERPRISE PH",
  initialReceiptUrl,
  initialOcrResult,
  onOcrComplete,
  onRemoveReceipt,
  title = "Proof of Payment & OCR Receipt Verification",
  compact = false,
}: ReceiptOcrScannerProps) {
  const [receiptUrl, setReceiptUrl] = useState<string | null>(initialReceiptUrl || null);
  const [ocrResult, setOcrResult] = useState<ReceiptOcrResult | null>(initialOcrResult || null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>("Initializing...");
  const [copiedRef, setCopiedRef] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if props change externally
  useEffect(() => {
    if (initialReceiptUrl !== undefined) setReceiptUrl(initialReceiptUrl);
    if (initialOcrResult !== undefined) setOcrResult(initialOcrResult);
  }, [initialReceiptUrl, initialOcrResult]);

  const runOcr = async (source: File | string, previewUri: string) => {
    setIsScanning(true);
    setScanStep("Uploading receipt image...");
    setReceiptUrl(previewUri);

    try {
      setTimeout(() => setScanStep("Detecting payment channel & header..."), 400);
      setTimeout(() => setScanStep("Extracting reference number & transaction amount..."), 900);
      setTimeout(() => setScanStep("Running Gemini AI financial verification..."), 1400);

      const result = await analyzeReceiptImage(source, {
        expectedAmount,
        expectedReceiver,
      });

      setOcrResult(result);
      if (onOcrComplete) {
        onOcrComplete(result, previewUri);
      }

      if (result.isAmountMatched) {
        toast.success(`OCR Verified: ${result.channel} payment of ${formatCurrency(result.amount)} confirmed!`);
      } else if (expectedAmount) {
        toast.warning(
          `Amount alert: Receipt shows ${formatCurrency(result.amount)}, expected ${formatCurrency(expectedAmount)}`
        );
      } else {
        toast.success(`Receipt analyzed: Reference #${result.referenceNumber}`);
      }
    } catch (err: any) {
      console.error("OCR scan error:", err);
      toast.error(err.message || "Failed to analyze receipt. Please verify image clarity.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, JPEG, WEBP)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      runOcr(file, dataUri);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUri = reader.result as string;
        runOcr(file, dataUri);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectSample = (sample: SampleReceipt) => {
    runOcr(sample.svgDataUri, sample.svgDataUri);
  };

  const handleCopyRef = (refNo: string) => {
    navigator.clipboard.writeText(refNo);
    setCopiedRef(true);
    toast.success("Reference number copied!");
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleClear = () => {
    setReceiptUrl(null);
    setOcrResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (onRemoveReceipt) onRemoveReceipt();
  };

  const getChannelColor = (channel: string) => {
    const c = channel.toLowerCase();
    if (c.includes("gcash")) return "bg-blue-600 text-white border-blue-700";
    if (c.includes("maya")) return "bg-emerald-600 text-white border-emerald-700";
    if (c.includes("bpi")) return "bg-rose-700 text-white border-rose-800";
    if (c.includes("bdo")) return "bg-amber-600 text-white border-amber-700";
    if (c.includes("pos") || c.includes("invoice")) return "bg-neutral-900 text-white border-neutral-950";
    return "bg-neutral-800 text-white border-neutral-900";
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label
          className="text-[11px] font-normal text-neutral-600 uppercase flex items-center gap-1.5"
          style={{ fontFamily: "'Ubuntu', sans-serif" }}
        >
          <Sparkles size={13} className="text-amber-500" />
          <span>{title}</span>
        </label>

        {expectedAmount && (
          <span
            className="text-[11px] font-mono text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200"
            title="Cart total expected on receipt"
          >
            Target: {formatCurrency(expectedAmount)}
          </span>
        )}
      </div>

      {/* Upload & Drop Zone (Shown when no receipt or scanning) */}
      {!receiptUrl && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer relative overflow-hidden ${
            isDragOver
              ? "border-black bg-neutral-100 scale-[1.01]"
              : "border-neutral-300 bg-neutral-50/70 hover:bg-neutral-100/70"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-12 h-12 bg-white rounded-2xl border border-neutral-200 flex items-center justify-center shadow-2xs text-black">
              <Upload size={22} className="text-neutral-700" />
            </div>
            <div>
              <div
                className="text-xs font-medium text-black uppercase tracking-wide"
                style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
              >
                Upload GCash, Maya, or Bank Receipt
              </div>
              <p
                className="text-[11px] text-neutral-500 mt-0.5 font-normal"
                style={{ fontFamily: "'Ubuntu', sans-serif" }}
              >
                Drag and drop transfer screenshot, take photo, or browse file
              </p>
            </div>

            <div className="flex items-center gap-1 text-[10px] text-neutral-400 uppercase tracking-wider font-mono pt-1">
              <ShieldCheck size={11} className="text-emerald-600" />
              <span>Instant AI OCR Reference & Amount Verification</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Sample Receipts Selector (For 1-click zero-friction instant testing) */}
      {!receiptUrl && !isScanning && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[10px] text-neutral-400 uppercase tracking-wider font-mono">
            <span>Quick Test Receipts:</span>
            <span className="text-neutral-400">1-click demo</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {SAMPLE_RECEIPTS.slice(0, 4).map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => handleSelectSample(sample)}
                className="flex items-center justify-between p-2 rounded-xl bg-white border border-neutral-200 hover:border-black text-left cursor-pointer transition-all hover:shadow-2xs text-xs font-normal group"
                style={{ fontFamily: "'Ubuntu', sans-serif" }}
              >
                <div className="truncate">
                  <span className="font-semibold text-black block truncate">{sample.channel}</span>
                  <span className="text-[10px] text-neutral-500 font-mono block">
                    {formatCurrency(sample.amount)}
                  </span>
                </div>
                <Sparkles size={11} className="text-neutral-300 group-hover:text-amber-500 shrink-0 ml-1" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scanning State with Animated Radar Glow */}
      {isScanning && (
        <div className="bg-neutral-900 text-white rounded-2xl p-6 text-center space-y-4 border border-neutral-800 shadow-md relative overflow-hidden">
          {/* Animated scanning beam */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent animate-pulse" />

          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto relative">
            <RefreshCw size={22} className="text-emerald-400 animate-spin" />
          </div>

          <div>
            <h4
              className="text-sm font-medium uppercase tracking-wider text-white"
              style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
            >
              Analyzing Receipt with Gemini OCR...
            </h4>
            <p className="text-xs text-neutral-400 font-mono mt-1 animate-pulse">{scanStep}</p>
          </div>

          <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-400 h-full w-2/3 animate-[pulse_1s_ease-in-out_infinite]" />
          </div>
        </div>
      )}

      {/* Verified OCR Result Card */}
      {receiptUrl && !isScanning && ocrResult && (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs divide-y divide-neutral-100">
          {/* Top Bar with Channel Badge & Actions */}
          <div className="p-3.5 bg-neutral-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wide border shadow-2xs ${getChannelColor(
                  ocrResult.channel
                )}`}
                style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
              >
                {ocrResult.channel}
              </span>
              <span className="text-[11px] font-mono text-neutral-500">
                {ocrResult.confidenceScore}% Confidence
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => runOcr(receiptUrl, receiptUrl)}
                className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-200 rounded-lg cursor-pointer transition-colors"
                title="Re-run OCR Scan"
              >
                <RefreshCw size={13} />
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                title="Remove Receipt"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Main Visual & Extraction Grid */}
          <div className="p-3.5 space-y-3">
            {/* Image Preview & Key Metrics Side by Side */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Receipt Thumbnail */}
              <div className="relative w-full sm:w-28 h-28 bg-neutral-100 rounded-xl overflow-hidden border border-neutral-200 shrink-0 group">
                <img
                  src={receiptUrl}
                  alt="Receipt Preview"
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Eye size={16} />
                </div>
              </div>

              {/* Core Extracted Financial Fields */}
              <div className="flex-1 space-y-2">
                {/* Amount with Match Status */}
                <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100">
                  <span className="text-xs text-neutral-500 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                    Verified Amount:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold text-black font-mono">
                      {formatCurrency(ocrResult.amount)}
                    </span>
                    {ocrResult.isAmountMatched ? (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 size={11} /> Matched
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        <AlertTriangle size={11} /> Check Total
                      </span>
                    )}
                  </div>
                </div>

                {/* Reference Number */}
                <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100">
                  <span className="text-xs text-neutral-500 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                    Reference No:
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                      {ocrResult.referenceNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyRef(ocrResult.referenceNumber)}
                      className="p-1 text-neutral-400 hover:text-black cursor-pointer rounded hover:bg-neutral-100"
                      title="Copy Reference Number"
                    >
                      {copiedRef ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                {/* Recipient & Sender */}
                <div className="grid grid-cols-2 gap-2 text-xs font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                  <div>
                    <span className="text-neutral-400 text-[10px] uppercase block">Paid To:</span>
                    <span className="text-neutral-900 font-medium truncate block" title={ocrResult.receiverName}>
                      {ocrResult.receiverName || expectedReceiver}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 text-[10px] uppercase block">Sender:</span>
                    <span className="text-neutral-900 font-medium truncate block" title={ocrResult.senderName}>
                      {ocrResult.senderName || "Sender Account"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Validation Notes & Bullet Points */}
            {ocrResult.notes && ocrResult.notes.length > 0 && (
              <div className="bg-neutral-50 rounded-xl p-2.5 text-[11px] text-neutral-600 space-y-1 border border-neutral-200/60 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-mono flex items-center gap-1">
                  <ShieldCheck size={11} className="text-emerald-600" />
                  <span>OCR Integrity Check</span>
                </div>
                {ocrResult.notes.map((note, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-neutral-400">•</span>
                    <span className="leading-tight">{note}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Raw Transcript Drawer Toggle */}
            {ocrResult.rawText && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowRawText(!showRawText)}
                  className="text-[10px] text-neutral-500 hover:text-black font-mono flex items-center gap-1 cursor-pointer"
                >
                  <FileText size={10} />
                  <span>{showRawText ? "Hide Full OCR Transcript" : "View Raw OCR Transcript"}</span>
                </button>
                {showRawText && (
                  <div className="mt-1 p-2 bg-neutral-900 text-neutral-200 rounded-lg text-[10px] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {ocrResult.rawText}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
