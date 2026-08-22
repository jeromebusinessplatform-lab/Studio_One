import React, { useState, useEffect } from "react";
import {
  Sparkles,
  FileSearch,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Building,
  CreditCard,
  Layers,
  ArrowRight,
  Info,
  Terminal,
  ExternalLink,
} from "lucide-react";
import { ReceiptOcrScanner } from "@/components/ReceiptOcrScanner.tsx";
import { SAMPLE_RECEIPTS, type SampleReceipt, analyzeReceiptImage } from "@/lib/ocr.ts";
import type { ReceiptOcrResult } from "@/types/ocr.ts";
import { formatCurrency } from "@/lib/utils.ts";
import { toast } from "sonner";

export default function AdminReceiptOcrPage() {
  const [ocrStatus, setOcrStatus] = useState<{
    enabled: boolean;
    model: string;
    hasApiKey: boolean;
    supportedChannels: string[];
  } | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptOcrResult | null>(null);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [expectedAmount, setExpectedAmount] = useState<number>(1450.0);
  const [expectedReceiver, setExpectedReceiver] = useState<string>("PRIME ENTERPRISE PH");
  const [copiedJson, setCopiedJson] = useState(false);
  const [activeTab, setActiveTab] = useState<"visual" | "json" | "samples">("visual");

  useEffect(() => {
    fetch("/api/ocr/status")
      .then((res) => res.json())
      .then((data) => setOcrStatus(data))
      .catch((err) => console.error("Failed to load OCR status:", err));

    // Default load first sample
    const defaultSample = SAMPLE_RECEIPTS[0];
    setActivePreviewUrl(defaultSample.svgDataUri);
    analyzeReceiptImage(defaultSample.svgDataUri, {
      expectedAmount: 1450.0,
      expectedReceiver: "PRIME ENTERPRISE PH",
    })
      .then((res) => setActiveReceipt(res))
      .catch((err) => console.error("Error analyzing default sample:", err));
  }, []);

  const handleCopyJson = () => {
    if (!activeReceipt) return;
    navigator.clipboard.writeText(JSON.stringify(activeReceipt, null, 2));
    setCopiedJson(true);
    toast.success("OCR analysis JSON copied to clipboard");
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleLoadSample = async (sample: SampleReceipt) => {
    setActivePreviewUrl(sample.svgDataUri);
    setExpectedAmount(sample.amount);
    setExpectedReceiver(sample.receiver);
    toast.info(`Loaded sample: ${sample.channel}`);
    try {
      const result = await analyzeReceiptImage(sample.svgDataUri, {
        expectedAmount: sample.amount,
        expectedReceiver: sample.receiver,
      });
      setActiveReceipt(result);
      toast.success(`OCR Extracted: ${result.channel} ${formatCurrency(result.amount)}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to parse sample");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-black text-2xl font-normal tracking-wide uppercase"
              style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
            >
              Receipt OCR Intelligence
            </h1>
            <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border border-amber-300">
              <Sparkles size={11} /> Gemini 3.7 Flash
            </span>
          </div>
          <p
            className="text-neutral-500 text-xs mt-0.5 font-normal"
            style={{ fontFamily: "'Ubuntu', sans-serif" }}
          >
            Autonomous extraction of transaction references, amounts, and recipient verification for Philippine e-wallets & banks.
          </p>
        </div>

        {/* System Status Pill */}
        <div className="flex items-center gap-2 text-xs font-mono bg-white border border-neutral-200 rounded-xl px-3 py-1.5 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-neutral-600 font-normal">Engine:</span>
          <span className="font-bold text-black">{ocrStatus?.model || "gemini-3.7-flash"}</span>
          <span className="text-neutral-300">|</span>
          <span className="text-neutral-500 text-[11px]">
            {ocrStatus?.hasApiKey ? "Live Gemini Key Active" : "Resilient Fallback Mode"}
          </span>
        </div>
      </div>

      {/* Target Matching Settings Strip */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs">
        <div className="text-xs font-medium text-black uppercase pb-2 border-b border-neutral-100 flex items-center gap-1.5" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>Verification Rules & Expected Thresholds</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3 text-xs" style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "14px" }}>
          <div>
            <label className="text-neutral-500 uppercase block mb-1 text-[11px]">Expected Target Amount (PHP)</label>
            <input
              type="number"
              step="0.01"
              value={expectedAmount}
              onChange={(e) => setExpectedAmount(parseFloat(e.target.value) || 0)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-black font-mono font-bold outline-none focus:border-black"
              placeholder="1450.00"
            />
          </div>

          <div>
            <label className="text-neutral-500 uppercase block mb-1 text-[11px]">Expected Merchant / Beneficiary</label>
            <input
              type="text"
              value={expectedReceiver}
              onChange={(e) => setExpectedReceiver(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-black font-medium outline-none focus:border-black"
              placeholder="PRIME ENTERPRISE PH"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                if (activePreviewUrl) {
                  analyzeReceiptImage(activePreviewUrl, { expectedAmount, expectedReceiver })
                    .then((res) => {
                      setActiveReceipt(res);
                      toast.success("Re-evaluated OCR against updated thresholds");
                    })
                    .catch((err) => toast.error(err.message));
                }
              }}
              className="w-full bg-black hover:bg-neutral-800 text-white font-normal py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition shadow-2xs"
            >
              <RefreshCw size={13} /> Re-verify Parameters
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Upload/Scanner on Left, Detailed Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Scanner / Uploader */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-4">
            <h3
              className="text-sm font-medium uppercase tracking-wide text-black flex items-center justify-between"
              style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
            >
              <span>Live Image Scanner</span>
              <span className="text-[10px] text-neutral-400 font-mono">Vision Multi-modal</span>
            </h3>

            <ReceiptOcrScanner
              expectedAmount={expectedAmount}
              expectedReceiver={expectedReceiver}
              initialReceiptUrl={activePreviewUrl || undefined}
              initialOcrResult={activeReceipt}
              onOcrComplete={(result, url) => {
                setActiveReceipt(result);
                setActivePreviewUrl(url);
              }}
              onRemoveReceipt={() => {
                setActiveReceipt(null);
                setActivePreviewUrl(null);
              }}
            />
          </div>

          {/* Quick Preloaded Philippine Receipts */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h4
                className="text-xs font-medium uppercase tracking-wide text-black"
                style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
              >
                Sample Philippine Receipt Dataset
              </h4>
              <span className="text-[10px] text-neutral-400 font-mono">5 Templates</span>
            </div>

            <div className="space-y-1.5">
              {SAMPLE_RECEIPTS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleLoadSample(sample)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-neutral-200 hover:border-black hover:bg-neutral-50 transition cursor-pointer text-left group"
                  style={{ fontFamily: "'Ubuntu', sans-serif" }}
                >
                  <div className="truncate">
                    <span className="font-semibold text-black block text-xs">{sample.name}</span>
                    <span className="text-[11px] text-neutral-500 font-mono">
                      Ref: {sample.referenceNumber} • {formatCurrency(sample.amount)}
                    </span>
                  </div>
                  <ArrowRight size={13} className="text-neutral-300 group-hover:text-black shrink-0 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Deep Extracted Metadata Inspector */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <FileSearch size={18} className="text-black" />
                <h3
                  className="text-base font-normal uppercase text-black"
                  style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
                >
                  OCR Extraction Telemetry & Field Analysis
                </h3>
              </div>

              {/* Tab Switcher */}
              <div className="flex items-center bg-neutral-100 rounded-xl p-1 text-xs" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                <button
                  type="button"
                  onClick={() => setActiveTab("visual")}
                  className={`px-3 py-1 rounded-lg cursor-pointer transition font-normal ${
                    activeTab === "visual" ? "bg-white text-black font-semibold shadow-2xs" : "text-neutral-500 hover:text-black"
                  }`}
                >
                  Parsed Fields
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("json")}
                  className={`px-3 py-1 rounded-lg cursor-pointer transition font-normal ${
                    activeTab === "json" ? "bg-white text-black font-semibold shadow-2xs" : "text-neutral-500 hover:text-black"
                  }`}
                >
                  Raw JSON
                </button>
              </div>
            </div>

            {activeReceipt ? (
              activeTab === "visual" ? (
                <div className="space-y-4 font-normal text-xs" style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "14px" }}>
                  {/* Top Status & Verification Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/70">
                      <span className="text-[10px] text-neutral-400 uppercase font-mono block">Payment Channel</span>
                      <span className="text-base font-bold text-black block mt-0.5">{activeReceipt.channel}</span>
                      <span className="text-[10px] text-neutral-500 font-mono">{activeReceipt.channelType}</span>
                    </div>

                    <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/70">
                      <span className="text-[10px] text-neutral-400 uppercase font-mono block">Parsed Amount</span>
                      <span className="text-base font-bold text-black font-mono block mt-0.5">
                        {formatCurrency(activeReceipt.amount)}
                      </span>
                      <span className={`text-[10px] font-bold ${activeReceipt.isAmountMatched ? "text-emerald-600" : "text-amber-600"}`}>
                        {activeReceipt.isAmountMatched ? "✓ Exact Match" : "⚠ Discrepancy"}
                      </span>
                    </div>

                    <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/70">
                      <span className="text-[10px] text-neutral-400 uppercase font-mono block">Confidence Rating</span>
                      <span className="text-base font-bold text-emerald-700 block mt-0.5">
                        {activeReceipt.confidenceScore}%
                      </span>
                      <span className="text-[10px] text-neutral-500">Gemini High Fidelity</span>
                    </div>

                    <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/70">
                      <span className="text-[10px] text-neutral-400 uppercase font-mono block">Transaction State</span>
                      <span className="text-base font-bold text-black block mt-0.5">{activeReceipt.status}</span>
                      <span className="text-[10px] text-neutral-500 font-mono">Verified Slip</span>
                    </div>
                  </div>

                  {/* Field Breakdown Table */}
                  <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden divide-y divide-neutral-100">
                    <div className="p-3 flex items-center justify-between bg-neutral-50/50">
                      <span className="text-neutral-500 text-xs">Reference Number:</span>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-black">
                        <span>{activeReceipt.referenceNumber}</span>
                      </div>
                    </div>

                    <div className="p-3 flex items-center justify-between">
                      <span className="text-neutral-500 text-xs">Sender Account / Name:</span>
                      <span className="font-semibold text-black">{activeReceipt.senderName || "Not specified on slip"}</span>
                    </div>

                    <div className="p-3 flex items-center justify-between">
                      <span className="text-neutral-500 text-xs">Beneficiary / Merchant:</span>
                      <span className="font-semibold text-black">{activeReceipt.receiverName || "PRIME ENTERPRISE PH"}</span>
                    </div>

                    <div className="p-3 flex items-center justify-between">
                      <span className="text-neutral-500 text-xs">Transaction Date & Time:</span>
                      <span className="font-medium text-neutral-800">{activeReceipt.transactionDateTime || "Current Session"}</span>
                    </div>

                    <div className="p-3 flex items-center justify-between">
                      <span className="text-neutral-500 text-xs">AI Model Pipeline:</span>
                      <span className="font-mono text-xs text-neutral-600">{activeReceipt.aiModelUsed}</span>
                    </div>
                  </div>

                  {/* Bullet Validation Notes */}
                  {activeReceipt.notes && activeReceipt.notes.length > 0 && (
                    <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-3.5 space-y-1.5">
                      <div className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-emerald-700" />
                        <span>Security & Checksum Validations</span>
                      </div>
                      <div className="space-y-1 text-xs text-neutral-700">
                        {activeReceipt.notes.map((n, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-600 font-bold">•</span>
                            <span>{n}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raw OCR text transcript */}
                  {activeReceipt.rawText && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-neutral-400 uppercase font-mono">Raw Vision OCR Transcript</div>
                      <div className="p-3 bg-neutral-900 text-neutral-200 rounded-xl text-xs font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
                        {activeReceipt.rawText}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-neutral-500 font-mono">Structured JSON Output</span>
                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="flex items-center gap-1 text-xs text-neutral-600 hover:text-black border border-neutral-200 px-2.5 py-1 rounded-lg cursor-pointer bg-white"
                    >
                      {copiedJson ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      <span>{copiedJson ? "Copied" : "Copy JSON"}</span>
                    </button>
                  </div>
                  <pre className="p-3.5 bg-neutral-950 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-96">
                    {JSON.stringify(activeReceipt, null, 2)}
                  </pre>
                </div>
              )
            ) : (
              <div className="p-12 text-center text-neutral-400">
                <FileSearch size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                  Upload a receipt image or select a sample above to view AI OCR extraction.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
