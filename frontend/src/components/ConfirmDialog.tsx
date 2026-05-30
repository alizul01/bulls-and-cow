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
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-surface border border-surface-light rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-sm mx-0 sm:mx-4 shadow-2xl">
        <div className="w-10 h-1 rounded-full bg-surface-light mx-auto mb-5 sm:hidden" />
        <h3 className="text-xl font-black mb-2">{title}</h3>
        <p className="text-gray-400 text-sm font-bold mb-6">{message}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className={`w-full py-4 text-base rounded-2xl font-black btn-push ${
              variant === "danger"
                ? "bg-danger text-white shadow-[0_4px_0_0_#b91c1c]"
                : "bg-primary text-white shadow-[0_4px_0_0_#4c1d95]"
            }`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-4 text-base rounded-2xl font-black bg-surface-light text-gray-300 active:scale-95 transition-transform"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
