"use client";

import { useEffect, useState, useRef } from "react";

interface ToastProps {
  message: string;
  visible: boolean;
  onDone?: () => void;
  duration?: number;
  variant?: "success" | "error" | "info";
}

export default function Toast({ message, visible, onDone, duration = 2000, variant = "success" }: ToastProps) {
  const [show, setShow] = useState(false);
  const [closing, setClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setShow(true);
      setClosing(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setClosing(true);
        setTimeout(() => {
          setShow(false);
          onDone?.();
        }, 200);
      }, duration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, duration, onDone]);

  if (!show) return null;

  const colors = {
    success: "bg-emerald-500 border-black text-white",
    error: "bg-red-500 border-black text-white",
    info: "bg-violet-600 border-black text-white",
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div
        className={`${closing ? "animate-toast-out" : "animate-toast-in"} ${
          colors[variant]
        } border-2 rounded-xl px-5 py-3 shadow-[3px_3px_0_0_#000]`}
      >
        <p className="text-sm font-black text-center">{message}</p>
      </div>
    </div>
  );
}
