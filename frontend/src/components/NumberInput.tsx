"use client";

import { useState, useRef } from "react";

interface NumberInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  error?: string;
  autoFocus?: boolean;
}

export default function NumberInput({
  length = 4,
  value,
  onChange,
  disabled = false,
  placeholder = "Enter 4 unique digits",
  label,
  error,
  autoFocus = false,
}: NumberInputProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const digits = value.split("").concat(Array(length - value.length).fill(""));

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          maxLength={length}
          value={value}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            const unique = [...new Set(raw.split(""))].join("");
            onChange(unique.slice(0, length));
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          autoFocus={autoFocus}
          className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-text"
          placeholder={placeholder}
        />

        <div
          className="grid grid-cols-4 gap-2.5"
          onClick={() => inputRef.current?.focus()}
        >
          {digits.map((digit, i) => {
            const isCursor = focused && i === value.length;
            return (
              <div
                key={i}
                className={`h-16 flex items-center justify-center text-3xl font-black rounded-xl border-2 transition-all select-none ${
                  digit
                    ? "bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200 border-black dark:border-violet-400 shadow-[2px_2px_0_0_#000] dark:shadow-none"
                    : isCursor
                    ? "bg-white dark:bg-zinc-800 border-violet-500 dark:border-violet-400"
                    : "bg-white dark:bg-zinc-800/60 border-neutral-200 dark:border-zinc-600"
                } ${disabled ? "opacity-50" : ""}`}
              >
                {digit ? (
                  digit
                ) : isCursor ? (
                  <span className="w-0.5 h-7 bg-violet-500 dark:bg-violet-400 animate-pulse rounded-full" />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="text-red-600 dark:text-red-400 text-sm font-black flex items-center gap-1.5">
          ⚠ {error}
        </p>
      )}
      {!error && value.length > 0 && value.length < length && (
        <p className="text-neutral-400 dark:text-neutral-500 text-sm font-bold">
          {length - value.length} more digit
          {length - value.length > 1 ? "s" : ""} needed
        </p>
      )}
    </div>
  );
}
