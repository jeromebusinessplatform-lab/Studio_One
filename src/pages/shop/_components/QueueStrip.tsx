import { useLiveQueue } from "@/hooks/useLiveQueue.ts";
import { motion } from "motion/react";

export default function QueueStrip() {
  const { queue } = useLiveQueue();

  const trafficStyles = {
    LIGHT: "text-emerald-600",
    MODERATE: "text-orange-600",
    HEAVY: "text-red-600",
  } as const;

  return (
    <div className="bg-white w-full overflow-hidden border-b border-neutral-100 shadow-2xs">
      <div className="grid grid-cols-4 w-full max-w-full mx-auto">
        <div className="py-1 px-1 text-center bg-white flex flex-col justify-center items-center min-w-0 relative h-10">
          <div className="text-neutral-500 font-normal uppercase leading-none truncate w-full text-[8px]" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
            ACTIVE ORDERS
          </div>
          <motion.div 
            key={queue.activeOrders}
            initial={{ opacity: 0.5, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-semibold whitespace-nowrap leading-none mt-1 text-[12px] text-blue-600 font-mono"
          >
            {queue.activeOrders}
          </motion.div>
          <div className="absolute right-0 top-1.5 bottom-1.5 w-px bg-neutral-200" />
        </div>

        <div className="py-1 px-1 text-center bg-white flex flex-col justify-center items-center min-w-0 relative h-10">
          <div className="text-neutral-500 font-normal uppercase leading-none truncate w-full text-[8px]" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
            YOUR POSITION
          </div>
          <motion.div 
            key={queue.yourPosition}
            initial={{ opacity: 0.5, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-semibold whitespace-nowrap leading-none mt-1 text-[12px] text-neutral-900 font-mono truncate w-full"
          >
            {queue.yourPosition}
          </motion.div>
          <div className="absolute right-0 top-1.5 bottom-1.5 w-px bg-neutral-200" />
        </div>

        <div className="py-1 px-1 text-center bg-white flex flex-col justify-center items-center min-w-0 relative h-10">
          <div className="text-neutral-500 font-normal uppercase leading-none truncate w-full text-[8px]" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
            EST. WAIT TIME
          </div>
          <motion.div 
            key={queue.estimatedWaitTime}
            initial={{ opacity: 0.5, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-semibold whitespace-nowrap leading-none mt-1 text-[12px] text-rose-600 font-mono"
          >
            {Math.max(1, Math.round(queue.estimatedWaitTime))} MIN
          </motion.div>
          <div className="absolute right-0 top-1.5 bottom-1.5 w-px bg-neutral-200" />
        </div>

        <div className="py-1 px-1 text-center bg-white flex flex-col justify-center items-center min-w-0 h-10">
          <div className="text-neutral-500 font-normal uppercase leading-none truncate w-full text-[8px]" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
            ORDER TRAFFIC
          </div>
          <motion.div
            key={queue.orderTraffic}
            initial={{ opacity: 0.5, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`font-semibold whitespace-nowrap leading-none mt-1 text-[12px] ${trafficStyles[queue.orderTraffic]} font-mono`}
          >
            {queue.orderTraffic}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
