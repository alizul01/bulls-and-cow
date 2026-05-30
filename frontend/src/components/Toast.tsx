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
    success: "bg-emerald-600/90 border-emerald-400/30",
    error: "bg-red-700/90 border-red-400/30",
    info: "bg-primary/90 border-primary/30",
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div
        className={`${closing ? "animate-toast-out" : "animate-toast-in"} ${
          colors[variant]
        } border backdrop-blur-sm rounded-xl px-5 py-3 shadow-lg`}
      >
        <p className="text-sm font-black text-white text-center">{message}</p>
      </div>
    </div>
  );
}
