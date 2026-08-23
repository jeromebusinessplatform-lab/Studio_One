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
    <div className="bg-white w-full overflow-hidden border-b border-neutral-100 shadow-2xs">
      <div className="flex items-stretch w-full max-w-full mx-auto">
        {/* Column 1: ON QUEUE */}
        <div className="flex-1 py-0.5 px-0.5 text-center bg-white flex flex-col justify-center items-center min-w-0 relative h-8">
          <div
            className="text-neutral-500 font-normal uppercase leading-none truncate w-full text-[9px]"
            style={{
              fontFamily: "'Roboto Condensed', sans-serif",
            }}
          >
            ON QUEUE
          </div>
          <div
            className="font-semibold uppercase whitespace-nowrap leading-none mt-0.5 text-[11px] text-blue-600"
            style={{
              fontFamily: "'Roboto Condensed', sans-serif",
            }}
          >
            {onQueue}
          </div>
          <div className="absolute right-0 top-1.5 bottom-1.5 w-[1px] bg-neutral-200"></div>
        </div>

        {/* Column 2: PROCESSING */}
        <div className="flex-[1.2] py-0.5 px-0.5 text-center bg-white flex flex-col justify-center items-center min-w-0 relative h-8">
          <div
            className="text-neutral-500 font-normal uppercase leading-none truncate w-full text-[9px]"
            style={{
              fontFamily: "'Roboto Condensed', sans-serif",
            }}
          >
            PROCESSING
          </div>
          <div
            className="font-semibold uppercase whitespace-nowrap leading-none mt-0.5 text-[11px] text-emerald-600"
            style={{
              fontFamily: "'Roboto Condensed', sans-serif",
            }}
          >
            {processing}
          </div>
          <div className="absolute right-0 top-1.5 bottom-1.5 w-[1px] bg-neutral-200"></div>
        </div>

        {/* Column 3: WAIT */}
        <div className="flex-[1.1] py-0.5 px-0.5 text-center bg-white flex flex-col justify-center items-center min-w-0 relative h-8">
          <div
            className="text-neutral-500 font-normal uppercase leading-none truncate w-full text-[9px]"
            style={{
              fontFamily: "'Roboto Condensed', sans-serif",
            }}
          >
            WAIT
          </div>
          <div
            className="font-semibold uppercase whitespace-nowrap leading-none mt-0.5 text-[11px] text-rose-600"
            style={{
              fontFamily: "'Roboto Condensed', sans-serif",
            }}
          >
            {waitTime}M
          </div>
          <div className="absolute right-0 top-1.5 bottom-1.5 w-[1px] bg-neutral-200"></div>
        </div>

        {/* Column 4: DISPATCH */}
        <div className="flex-[1.1] py-0.5 px-0.5 text-center bg-white flex flex-col justify-center items-center min-w-0 relative h-8">
          <div
            className="text-neutral-500 font-normal uppercase leading-none truncate w-full text-[9px]"
            style={{
              fontFamily: "'Roboto Condensed', sans-serif",
            }}
          >
            DISPATCH
          </div>
          <div
            className="font-semibold uppercase whitespace-nowrap leading-none mt-0.5 text-[11px] text-rose-600"
            style={{
              fontFamily: "'Roboto Condensed', sans-serif",
            }}
          >
            {dispatchTime}M
          </div>
          <div className="absolute right-0 top-1.5 bottom-1.5 w-[1px] bg-neutral-200"></div>
        </div>

        {/* Column 5: FLOW */}
        <div className="flex-[1.2] py-0.5 px-0.5 text-center bg-white flex flex-col justify-center items-center min-w-0 h-8">
          <div
            className="text-neutral-500 font-normal uppercase leading-none truncate w-full text-[9px]"
            style={{
              fontFamily: "'Roboto Condensed', sans-serif",
            }}
          >
            FLOW
          </div>
          <div
            className="font-semibold uppercase whitespace-nowrap leading-none mt-0.5 text-[11px]"
            style={{
              fontFamily: "'Roboto Condensed', sans-serif",
              color: trafficColor,
            }}
          >
            {traffic}
          </div>
        </div>
      </div>
    </div>
  );
}
