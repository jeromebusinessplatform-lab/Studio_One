import type {
  ReceiptOcrResult,
  AnalyzeReceiptResponse,
  AnalyzeReceiptRequest,
} from "@/types/ocr.ts";

export interface SampleReceipt {
  id: string;
  name: string;
  channel: string;
  amount: number;
  referenceNumber: string;
  date: string;
  sender: string;
  receiver: string;
  svgDataUri: string;
}

// Generate realistic SVG image mockups of Philippine Receipts for zero-friction instant demo testing
export function generateSampleReceiptSvg(
  channel: "GCash" | "Maya" | "BPI" | "BDO" | "POS",
  amount: number,
  refNo: string,
  sender: string,
  receiver: string
): string {
  const formattedAmount = `PHP ${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let brandHeader = "";
  let accentColor = "#005ce6";
  let channelName = "GCASH EXPRESS SEND";

  if (channel === "GCash") {
    accentColor = "#007dfe";
    channelName = "GCASH EXPRESS SEND";
    brandHeader = `
      <rect x="0" y="0" width="380" height="75" fill="#007dfe" rx="16"/>
      <circle cx="45" cy="38" r="18" fill="#ffffff"/>
      <text x="45" y="44" font-family="Arial, sans-serif" font-size="16" font-weight="900" fill="#007dfe" text-anchor="middle">G</text>
      <text x="75" y="44" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#ffffff">GCash</text>
      <text x="350" y="44" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="end">RECEIPT</text>
    `;
  } else if (channel === "Maya") {
    accentColor = "#1ec379";
    channelName = "MAYA INSTANT TRANSFER";
    brandHeader = `
      <rect x="0" y="0" width="380" height="75" fill="#0c1d2e" rx="16"/>
      <text x="35" y="46" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="#1ec379">maya</text>
      <text x="350" y="44" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#1ec379" text-anchor="end">TRANSFER SUCCESS</text>
    `;
  } else if (channel === "BPI") {
    accentColor = "#b11116";
    channelName = "BPI ONLINE INSTAPAY";
    brandHeader = `
      <rect x="0" y="0" width="380" height="75" fill="#b11116" rx="16"/>
      <text x="35" y="46" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="#ffffff">BPI</text>
      <text x="80" y="44" font-family="Arial, sans-serif" font-size="12" font-weight="normal" fill="#ffcccc">Mobile Banking</text>
      <text x="350" y="44" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="end">CONFIRMATION</text>
    `;
  } else if (channel === "BDO") {
    accentColor = "#003882";
    channelName = "BDO UNIBANK DIGITAL";
    brandHeader = `
      <rect x="0" y="0" width="380" height="75" fill="#003882" rx="16"/>
      <text x="35" y="46" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="#fdb913">BDO</text>
      <text x="350" y="44" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="end">TRANSFER SLIP</text>
    `;
  } else {
    accentColor = "#111111";
    channelName = "OFFICIAL INVOICE RECEIPT";
    brandHeader = `
      <rect x="0" y="0" width="380" height="75" fill="#18181b" rx="16"/>
      <text x="35" y="46" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#ffffff">PRIME LOGISTICS</text>
      <text x="350" y="44" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#aaaaaa" text-anchor="end">OFFICIAL RECEIPT</text>
    `;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 480" width="100%" height="100%">
      <defs>
        <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.08"/>
        </filter>
      </defs>
      <!-- Background Paper -->
      <rect x="0" y="0" width="380" height="480" fill="#ffffff" rx="16" filter="url(#shadow)"/>
      ${brandHeader}

      <!-- Status Pill -->
      <g transform="translate(190, 105)">
        <circle cx="0" cy="0" r="16" fill="#ecfdf5"/>
        <path d="M-6 0 L-2 4 L6 -4" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <text x="0" y="28" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#059669" text-anchor="middle">Payment Completed</text>
      </g>

      <!-- Amount Header -->
      <text x="190" y="172" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="#111827" text-anchor="middle">${formattedAmount}</text>
      <text x="190" y="190" font-family="Arial, sans-serif" font-size="11" fill="#6b7280" text-anchor="middle">${channelName}</text>

      <!-- Divider line -->
      <line x1="30" y1="210" x2="350" y2="210" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4,4"/>

      <!-- Details List -->
      <!-- Ref No -->
      <text x="35" y="235" font-family="Arial, sans-serif" font-size="11" fill="#6b7280">Ref. No.</text>
      <text x="345" y="235" font-family="monospace" font-size="12" font-weight="bold" fill="#111827" text-anchor="end">${refNo}</text>

      <!-- Recipient -->
      <text x="35" y="265" font-family="Arial, sans-serif" font-size="11" fill="#6b7280">Paid To</text>
      <text x="345" y="265" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#111827" text-anchor="end">${receiver}</text>

      <!-- Sender -->
      <text x="35" y="295" font-family="Arial, sans-serif" font-size="11" fill="#6b7280">Sent By</text>
      <text x="345" y="295" font-family="Arial, sans-serif" font-size="12" font-weight="medium" fill="#374151" text-anchor="end">${sender}</text>

      <!-- Date & Time -->
      <text x="35" y="325" font-family="Arial, sans-serif" font-size="11" fill="#6b7280">Date &amp; Time</text>
      <text x="345" y="325" font-family="Arial, sans-serif" font-size="12" fill="#374151" text-anchor="end">${dateStr}, ${timeStr}</text>

      <!-- Security / Verification code -->
      <rect x="30" y="355" width="320" height="42" fill="#f9fafb" rx="8" stroke="#f3f4f6"/>
      <text x="45" y="380" font-family="monospace" font-size="11" fill="#4b5563">TRACE: 8821940-PH-BGC</text>
      <text x="335" y="380" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#10b981" text-anchor="end">INSTAPAY VERIFIED</text>

      <!-- Barcode simulation footer -->
      <g transform="translate(40, 420)">
        <rect x="0" y="0" width="3" height="28" fill="#1f2937"/>
        <rect x="5" y="0" width="6" height="28" fill="#1f2937"/>
        <rect x="14" y="0" width="2" height="28" fill="#1f2937"/>
        <rect x="18" y="0" width="4" height="28" fill="#1f2937"/>
        <rect x="25" y="0" width="8" height="28" fill="#1f2937"/>
        <rect x="36" y="0" width="3" height="28" fill="#1f2937"/>
        <rect x="42" y="0" width="5" height="28" fill="#1f2937"/>
        <rect x="50" y="0" width="2" height="28" fill="#1f2937"/>
        <rect x="55" y="0" width="7" height="28" fill="#1f2937"/>
        <rect x="65" y="0" width="3" height="28" fill="#1f2937"/>
        <rect x="71" y="0" width="6" height="28" fill="#1f2937"/>
        <rect x="80" y="0" width="4" height="28" fill="#1f2937"/>
        <rect x="87" y="0" width="8" height="28" fill="#1f2937"/>
        <rect x="98" y="0" width="3" height="28" fill="#1f2937"/>
        <rect x="104" y="0" width="5" height="28" fill="#1f2937"/>
        <rect x="112" y="0" width="3" height="28" fill="#1f2937"/>
        <rect x="118" y="0" width="6" height="28" fill="#1f2937"/>
        <rect x="127" y="0" width="4" height="28" fill="#1f2937"/>
        <rect x="134" y="0" width="7" height="28" fill="#1f2937"/>
        <rect x="144" y="0" width="2" height="28" fill="#1f2937"/>
        <rect x="149" y="0" width="8" height="28" fill="#1f2937"/>
        <rect x="160" y="0" width="4" height="28" fill="#1f2937"/>
        <rect x="167" y="0" width="5" height="28" fill="#1f2937"/>
        <rect x="175" y="0" width="3" height="28" fill="#1f2937"/>
        <rect x="181" y="0" width="6" height="28" fill="#1f2937"/>
        <rect x="190" y="0" width="4" height="28" fill="#1f2937"/>
        <rect x="197" y="0" width="7" height="28" fill="#1f2937"/>
        <rect x="207" y="0" width="2" height="28" fill="#1f2937"/>
        <rect x="212" y="0" width="8" height="28" fill="#1f2937"/>
        <rect x="223" y="0" width="3" height="28" fill="#1f2937"/>
        <rect x="229" y="0" width="5" height="28" fill="#1f2937"/>
        <rect x="237" y="0" width="3" height="28" fill="#1f2937"/>
        <rect x="243" y="0" width="6" height="28" fill="#1f2937"/>
        <rect x="252" y="0" width="4" height="28" fill="#1f2937"/>
        <rect x="259" y="0" width="8" height="28" fill="#1f2937"/>
        <rect x="270" y="0" width="3" height="28" fill="#1f2937"/>
        <rect x="276" y="0" width="5" height="28" fill="#1f2937"/>
        <rect x="284" y="0" width="2" height="28" fill="#1f2937"/>
        <rect x="289" y="0" width="7" height="28" fill="#1f2937"/>
        <text x="150" y="42" font-family="monospace" font-size="9" fill="#9ca3af" text-anchor="middle">OFFICIAL ELECTRONIC RECEIPT</text>
      </g>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_RECEIPTS: SampleReceipt[] = [
  {
    id: "sample-gcash",
    name: "GCash Express Send",
    channel: "GCash",
    amount: 1450.0,
    referenceNumber: "1002 9384 7162 0",
    date: "Aug 21, 2026, 02:45 PM",
    sender: "Juan Dela Cruz (0917***8821)",
    receiver: "PRIME ENTERPRISE PH (0919 123 1234)",
    svgDataUri: generateSampleReceiptSvg(
      "GCash",
      1450.0,
      "1002 9384 7162 0",
      "Juan Dela Cruz (0917***8821)",
      "PRIME ENTERPRISE PH"
    ),
  },
  {
    id: "sample-maya",
    name: "Maya Transfer Slip",
    channel: "Maya",
    amount: 2750.0,
    referenceNumber: "MYA-8921-4820-192",
    date: "Aug 21, 2026, 01:15 PM",
    sender: "Maria Santos",
    receiver: "PRIME ENTERPRISE PH",
    svgDataUri: generateSampleReceiptSvg(
      "Maya",
      2750.0,
      "MYA-8921-4820-192",
      "Maria Santos",
      "PRIME ENTERPRISE PH"
    ),
  },
  {
    id: "sample-bpi",
    name: "BPI Mobile InstaPay",
    channel: "BPI",
    amount: 4890.0,
    referenceNumber: "BPI-FT-20260821-9941",
    date: "Aug 21, 2026, 11:30 AM",
    sender: "Eduardo Reyes",
    receiver: "PRIME ENTERPRISE PH (BPI 4029-881)",
    svgDataUri: generateSampleReceiptSvg(
      "BPI",
      4890.0,
      "BPI-FT-20260821-9941",
      "Eduardo Reyes",
      "PRIME ENTERPRISE PH"
    ),
  },
  {
    id: "sample-bdo",
    name: "BDO Online Fund Transfer",
    channel: "BDO",
    amount: 890.0,
    referenceNumber: "BDO-REF-4091841029",
    date: "Aug 21, 2026, 10:05 AM",
    sender: "Beatrice Tan",
    receiver: "PRIME ENTERPRISE PH (BDO 0012-881)",
    svgDataUri: generateSampleReceiptSvg(
      "BDO",
      890.0,
      "BDO-REF-4091841029",
      "Beatrice Tan",
      "PRIME ENTERPRISE PH"
    ),
  },
  {
    id: "sample-pos",
    name: "PRIME Official POS Invoice",
    channel: "POS",
    amount: 3290.0,
    referenceNumber: "OR# 2026-90214",
    date: "Aug 21, 2026, 09:20 AM",
    sender: "Cashier Terminal 04",
    receiver: "PRIME BGC Hub Client",
    svgDataUri: generateSampleReceiptSvg(
      "POS",
      3290.0,
      "OR# 2026-90214",
      "Cashier Terminal 04",
      "PRIME BGC Hub Client"
    ),
  },
];

// Helper to convert File or DataURL to Base64 cleanly
export async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [header, base64] = result.split(",");
      const mimeType = header.match(/:(.*?);/)?.[1] || file.type || "image/jpeg";
      resolve({ base64, mimeType });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// Call Server-Side Gemini Receipt OCR Analyzer API
export async function analyzeReceiptImage(
  imageSource: File | string,
  options?: {
    expectedAmount?: number;
    expectedReceiver?: string;
    mimeType?: string;
  }
): Promise<ReceiptOcrResult> {
  let imageBase64 = "";
  let mimeType = options?.mimeType || "image/jpeg";

  if (typeof imageSource === "string") {
    if (imageSource.startsWith("data:")) {
      const parts = imageSource.split(",");
      const match = parts[0].match(/:(.*?);/);
      if (match) mimeType = match[1];
      imageBase64 = parts[1] || "";
    } else {
      imageBase64 = imageSource;
    }
  } else {
    const parsed = await fileToBase64(imageSource);
    imageBase64 = parsed.base64;
    mimeType = parsed.mimeType;
  }

  const payload: AnalyzeReceiptRequest = {
    imageBase64,
    mimeType,
    expectedAmount: options?.expectedAmount,
    expectedReceiver: options?.expectedReceiver || "PRIME ENTERPRISE PH",
  };

  const response = await fetch("/api/ocr/analyze-receipt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `OCR API request failed with status ${response.status}`);
  }

  const data: AnalyzeReceiptResponse = await response.json();
  if (!data.success || !data.result) {
    throw new Error(data.error || "OCR analysis failed to parse receipt");
  }

  return data.result;
}
