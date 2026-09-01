import { useEffect, useState } from "react";
import PrimeLogo from "@/components/PrimeLogo.tsx";

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function ShopHeader() {
  const now = useLiveClock();
  const day = String(now.getDate()).padStart(2, "0");
  const monthNames = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear();

  let rawHours = now.getHours();
  const ampm = rawHours >= 12 ? "PM" : "AM";
  rawHours = rawHours % 12;
  rawHours = rawHours ? rawHours : 12;
  const hours = String(rawHours).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  const dateStr = `${day}-${month}-${year}`;
  const timeStr = `${hours}:${minutes}:${seconds} ${ampm}`;

  return (
    <header className="bg-white px-3 py-2 flex items-center justify-between border-b border-neutral-100 shadow-2xs w-full">
      <div className="flex items-center">
        <PrimeLogo className="h-6 prime-shadow" />
      </div>
      <div className="text-right">
        <div
          className="font-mono text-xs leading-tight text-neutral-800 font-medium text-right"
        >
          {dateStr} • {timeStr}
        </div>
        <div
          className="font-sans text-[9px] font-semibold tracking-wider text-emerald-700 mt-0.5 uppercase text-right"
        >
          SECURED ACCESS
        </div>
      </div>
    </header>
  );
}
