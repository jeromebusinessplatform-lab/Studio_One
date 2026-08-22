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
    <header className="bg-white px-3.5 py-2.5 flex items-center justify-between border-b border-neutral-100">
      <div className="flex items-center">
        <PrimeLogo className="h-6" />
      </div>
      <div className="text-right">
        <div
          className="font-sans font-normal text-[10px] leading-[9.5px] text-black text-right"
        >
          {dateStr} | {timeStr}
        </div>
        <div
          className="font-sans text-[9px] font-normal mt-1 uppercase text-right"
        >
          SECURED CUSTOMER ACCESS
        </div>
      </div>
    </header>
  );
}
