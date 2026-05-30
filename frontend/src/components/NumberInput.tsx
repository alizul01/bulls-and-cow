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
        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">
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
                className={`h-18 flex items-center justify-center text-3xl font-black rounded-2xl border-2 transition-all select-none ${
                  digit
                    ? "bg-primary/15 text-primary border-primary/60 shadow-[0_4px_0_0_rgba(91,33,182,0.5)]"
                    : isCursor
                    ? "bg-surface-light border-primary/50"
                    : "bg-surface border-surface-light"
                } ${disabled ? "opacity-50" : ""}`}
              >
                {digit ? (
                  digit
                ) : isCursor ? (
                  <span className="w-0.5 h-7 bg-primary/70 animate-pulse rounded-full" />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="text-danger text-sm font-black flex items-center gap-1.5">
          ⚠ {error}
        </p>
      )}
      {!error && value.length > 0 && value.length < length && (
        <p className="text-gray-600 text-sm font-bold">
          {length - value.length} more digit
          {length - value.length > 1 ? "s" : ""} needed
        </p>
      )}
    </div>
  );
}
