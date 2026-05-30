"use client";

import { useState, useEffect, useRef, useCallback } from "react";

function getStorageKey(roomCode: string) {
  return `scratchpad_${roomCode}`;
}

export function useScratchPad(roomCode: string | null) {
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);
  const loadedRoom = useRef<string | null>(null);

  useEffect(() => {
    if (roomCode && roomCode !== loadedRoom.current) {
      loadedRoom.current = roomCode;
      const saved = localStorage.getItem(getStorageKey(roomCode)) ?? "";
      setNotes(saved);
      setOpen(false);
    }
  }, [roomCode]);

  const updateNotes = useCallback(
    (text: string) => {
      setNotes(text);
      if (roomCode) {
        localStorage.setItem(getStorageKey(roomCode), text);
      }
    },
    [roomCode]
  );

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  return { notes, updateNotes, open, toggle, close, hasRoom: !!roomCode };
}

function NoteLines() {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-20" aria-hidden="true">
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="h-px bg-amber-700/30 dark:bg-amber-400/30 mx-6"
          style={{ marginTop: i === 0 ? 38 : 24 }}
        />
      ))}
    </div>
  );
}

interface ScratchPadProps {
  notes: string;
  onChange: (text: string) => void;
  open: boolean;
  onClose: () => void;
  disabled?: boolean;
}

export default function ScratchPad({ notes, onChange, open, onClose, disabled }: ScratchPadProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed z-50 bg-amber-50 dark:bg-amber-950 border-2 border-amber-800 dark:border-amber-700 shadow-[4px_4px_0_0_#92400e] dark:shadow-[4px_4px_0_0_#fbbf24] overflow-hidden animate-scale-in transition-all
          sm:rounded-2xl
          bottom-0 left-0 right-0 h-[55vh] rounded-t-2xl
          sm:bottom-auto sm:left-1/2 sm:-translate-x-1/2 sm:top-[10vh]
          sm:w-[420px] sm:h-[58vh] sm:max-h-[600px]
        `}
      >
        {/* Doodle header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b-2 border-dashed border-amber-300 dark:border-amber-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">{'\u270F'}</span>
            <span
              className="font-black text-sm text-amber-900 dark:text-amber-200 tracking-tight"
              style={{ fontFamily: "'Comic Sans MS', 'Chalkboard SE', 'Patrick Hand', cursive" }}
            >
              Scratch Pad
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                textareaRef.current?.focus();
                textareaRef.current?.select();
              }}
              className="text-xs px-2 py-1 text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-200 dark:hover:bg-amber-800 rounded-lg transition-colors"
            >
              Select All
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-amber-700 dark:text-amber-300 font-black hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
            >
              {'\u2715'}
            </button>
          </div>
        </div>

        {/* Notebook lines area */}
        <div className="relative h-[calc(100%-60px)]">
          <NoteLines />
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="Jot down your deductions...&#10;&#10;e.g. 1 _ 3 _&#10;e.g. 5 is in position 4&#10;e.g. eliminated: 0,7,9"
            className="w-full h-full resize-none bg-transparent px-8 py-3 text-sm font-medium text-amber-950 dark:text-amber-100 placeholder:text-amber-400/60 dark:placeholder:text-amber-600/60 focus:outline-none leading-6"
            style={{
              fontFamily: "'Comic Sans MS', 'Chalkboard SE', 'Patrick Hand', cursive",
              lineHeight: "24px",
            }}
            spellCheck={false}
          />
        </div>

        {/* Bottom doodle */}
        <div className="absolute bottom-2 right-4 text-amber-400/40 dark:text-amber-500/30 pointer-events-none select-none text-xs">
          scribble away ~
        </div>
      </div>
    </>
  );
}
