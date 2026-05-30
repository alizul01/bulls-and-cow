"use client";

import { useEffect, useRef, useCallback } from "react";

const AudioCtx = typeof window !== "undefined" ? window.AudioContext || (window as any).webkitAudioContext : null;

function playTone(ctx: AudioContext, freq: number, duration: number, type: OscillatorType = "sine", gain = 0.12) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);

  const getCtx = useCallback((): AudioContext | null => {
    if (!AudioCtx) return null;
    if (!ctxRef.current) {
      ctxRef.current = new AudioCtx();
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const setEnabled = useCallback((v: boolean) => {
    enabledRef.current = v;
  }, []);

  const isEnabled = useCallback(() => enabledRef.current, []);

  const playGuess = useCallback(() => {
    if (!enabledRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    playTone(ctx, 600, 0.08, "square", 0.06);
    setTimeout(() => playTone(ctx, 900, 0.08, "square", 0.06), 60);
  }, [getCtx]);

  const playWin = useCallback(() => {
    if (!enabledRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    playTone(ctx, 523, 0.15, "sine", 0.1);
    setTimeout(() => playTone(ctx, 659, 0.15, "sine", 0.1), 120);
    setTimeout(() => playTone(ctx, 784, 0.15, "sine", 0.1), 240);
    setTimeout(() => playTone(ctx, 1047, 0.3, "sine", 0.12), 360);
  }, [getCtx]);

  const playLose = useCallback(() => {
    if (!enabledRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    playTone(ctx, 400, 0.2, "sawtooth", 0.06);
    setTimeout(() => playTone(ctx, 300, 0.3, "sawtooth", 0.06), 180);
  }, [getCtx]);

  const playError = useCallback(() => {
    if (!enabledRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    playTone(ctx, 200, 0.12, "square", 0.08);
    setTimeout(() => playTone(ctx, 180, 0.15, "square", 0.06), 80);
  }, [getCtx]);

  const playConnected = useCallback(() => {
    if (!enabledRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    playTone(ctx, 800, 0.06, "sine", 0.06);
    setTimeout(() => playTone(ctx, 1200, 0.08, "sine", 0.06), 60);
  }, [getCtx]);

  useEffect(() => {
    return () => {
      ctxRef.current?.close();
    };
  }, []);

  return { playGuess, playWin, playLose, playError, playConnected, setEnabled, isEnabled };
}
