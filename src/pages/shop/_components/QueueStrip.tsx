import { useQueueStats } from "@/hooks/useQueueStats.ts";
import { PauseCircle } from "lucide-react";

export default function QueueStrip() {
  const { stats } = useQueueStats();

  const traffic = stats?.traffic ?? "MODERATE";
  const onQueue = stats?.onQueue ?? 6;
  const processing = stats?.processing ?? 4;
  const waitTime = stats?.estimatedWaitMinutes ?? 44;
  const dispatchTime = stats?.estimatedDispatchMinutes ?? 21;
  const isPaused = stats?.isPaused ?? false;
  const isAtCapacity = stats?.isAtCapacity ?? false;
  const isBlocked = isPaused || isAtCapacity;

  const trafficColor =
    traffic === "HIGH"
      ? "#dc2626"
      : traffic === "MODERATE"
      ? "#ea580c"
      : "#16a34a";

  if (isBlocked) {
    return (
      <div className="mx-2.5 mt-2 bg-amber-50 border border-amber-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="flex items-center justify-center gap-2 px-3 py-2">
          <PauseCircle size={14} className="text-amber-600 flex-shrink-0" />
          <div className="text-center">
            <span
              className="text-amber-800 font-normal uppercase"
              style={{
                fontFamily: "'Roboto Condensed', sans-serif",
                fontSize: "12px",
                letterSpacing: "0.5px",
              }}
            >
              {isPaused ? "QUEUE PAUSED" : "QUEUE FULL"}
            </span>
            <span
              className="text-amber-600 ml-2 font-normal"
              style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "11px" }}
            >
              {isPaused
                ? "Not accepting new orders right now"
                : `At capacity (${onQueue}/${stats?.maxConcurrent ?? " "} orders)`}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white w-full overflow-hidden shadow-[0_2px_4px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex items-stretch">
        {/* Column 1: ON QUEUE */}
        <div className="flex-1 py-1 px-1 text-center bg-white flex flex-col justify-center items-center min-w-0 relative" style={{ height: "45px" }}>
          <div
            className="text-neutral-700 font-normal uppercase leading-none truncate w-full"
            style={{
              fontFamily: "'Roboto Condensed', sans-serif",
              fontSize: "10.5px",
              fontWeight: "normal",
              letterSpacing: "0.4px",
            }}
          >
            ON QUEUE
          </div>
          <div
            className="font-normal mt-0.5 uppercase whitespace-nowrap leading-none"
            style={{
              fontFamily: "'Roboto Condensed', sans-serif",
              fontSize: "13.5px",
              fontWeight: "normal",
              color: "#1d4ed8",
            }}
          >
            {onQueue}
          </div>
          <div className="absolute right-0 top-2 bottom-2 w-[1px] bg-gradient-to-b from-transparent via-neutral-300 to-transparent"></div>
        </div>

        {/* Column 2: PROCESSING */}
        <div className="flex-[1.4] py-1 px-1 text-center bg-white flex flex-col justify-center items-center min-w-0 relative" style={{ height: "45px" }}>
          <div
            className="text-neutral-700 font-normal uppercase leading-none truncate w-full"
            style={{
              fontFamily: "'Roboto Condensed', sans-serif",
              fontSize: "10.5px",
              fontWeight: "normal",
              letterSpacing: "0.4px",
            }}
          >
            PROCESSING
          </div>
          <div
            className="font-normal mt-0.5 uppercase whitespace-nowrap leading-none"
            style={{
              fontFamily: "'Roboto Condensed', sans-serif",
              fontSize: "13.5px",
              fontWeight: "normal",
              color: "#16a34a",
            }}
          >
            {processing}
          </div>
          <div className="absolute right-0 top-2 bottom-2 w-[1px] bg-gradient-to-b from-transparent via-neutral-300 to-transparent"></div>
        </div>

        {/* Column 3: WAIT */}
        <div className="flex-[1.3] py-1 px-1 text-center bg-white flex flex-col justify-center items-center min-w-0 relative" style={{ height: "45px" }}>
          <div
            className="text-neutral-700 font-normal uppercase leading-none truncate w-full"
            style={{
              fontFamily: "'Roboto Condensed', sans-serif",
              fontSize: "10.5px",
              fontWeight: "normal",
              letterSpacing: "0.4px",
            }}
          >
            WAIT
          </div>
          <div
            className="font-normal mt-0.5 uppercase whitespace-nowrap leading-none"
            style={{
              fontFamily: "'Roboto Condensed', sans-serif",
              fontSize: "13.5px",
              fontWeight: "normal",
              color: "#dc2626",
              letterSpacing: "0.2px",
            }}
          >
            {waitTime} MIN
          </div>
          <div className="absolute right-0 top-2 bottom-2 w-[1px] bg-gradient-to-b from-transparent via-neutral-300 to-transparent"></div>
        </div>

        {/* Column 4: DISPATCH */}
        <div className="flex-[1.3] py-1 px-1 text-center bg-white flex flex-col justify-center items-center min-w-0 relative" style={{ height: "45px" }}>
          <div
            className="text-neutral-700 font-normal uppercase leading-none truncate w-full"
            style={{
              fontFamily: "'Roboto Condensed', sans-serif",
              fontSize: "10.5px",
              fontWeight: "normal",
              letterSpacing: "0.4px",
            }}
          >
            DISPATCH
          </div>
          <div
            className="font-normal mt-0.5 uppercase whitespace-nowrap leading-none"
            style={{
              fontFamily: "'Roboto Condensed', sans-serif",
              fontSize: "13.5px",
              fontWeight: "normal",
              color: "#dc2626",
              letterSpacing: "0.2px",
            }}
          >
            {dispatchTime} MIN
          </div>
          <div className="absolute right-0 top-2 bottom-2 w-[1px] bg-gradient-to-b from-transparent via-neutral-300 to-transparent"></div>
        </div>

        {/* Column 5: FLOW */}
        <div className="flex-[1.4] py-1 px-1 text-center bg-white flex flex-col justify-center items-center min-w-0" style={{ height: "45px" }}>
          <div
            className="text-neutral-700 font-normal uppercase leading-none truncate w-full"
            style={{
              fontFamily: "'Roboto Condensed', sans-serif",
              fontSize: "10.5px",
              fontWeight: "normal",
              letterSpacing: "0.4px",
            }}
          >
            FLOW
          </div>
          <div
            className="font-normal mt-0.5 uppercase whitespace-nowrap leading-none"
            style={{
              fontFamily: "'Roboto Condensed', sans-serif",
              fontSize: "13.5px",
              fontWeight: "normal",
              color: trafficColor,
              letterSpacing: "0.2px",
            }}
          >
            {traffic}
          </div>
        </div>
      </div>
    </div>
  );
}
