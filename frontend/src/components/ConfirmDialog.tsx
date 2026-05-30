"use client";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={onCancel}
      />
      <div className="relative bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-400 rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-sm mx-0 sm:mx-4 shadow-[0_-4px_0_0_#000] sm:shadow-[4px_4px_0_0_#000] dark:shadow-none">
        <div className="w-10 h-1 rounded-full bg-neutral-200 dark:bg-zinc-600 mx-auto mb-5 sm:hidden" />
        <h3 className="text-xl font-black text-black dark:text-white mb-2">{title}</h3>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm font-bold mb-6">{message}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className={`w-full py-4 text-base rounded-2xl font-black border-2 border-black btn-push ${
              variant === "danger"
                ? "bg-red-500 dark:bg-red-600 text-white shadow-[3px_3px_0_0_#000]"
                : "bg-violet-600 text-white shadow-[3px_3px_0_0_#000]"
            }`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-4 text-base rounded-2xl font-black bg-white dark:bg-zinc-800 text-black dark:text-white border-2 border-neutral-200 dark:border-zinc-600 active:scale-95 transition-transform"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
