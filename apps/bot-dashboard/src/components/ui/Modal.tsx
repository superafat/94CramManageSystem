'use client';

import { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  danger?: boolean;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  confirmLabel,
  cancelLabel = '取消',
  onConfirm,
  danger = false,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="bg-white rounded-xl border border-[#d8d3de] shadow-lg w-full max-w-md p-6 animate-in">
        <h3 className="text-lg font-bold text-[#4b4355] mb-4">{title}</h3>
        <div className="text-sm text-[#5d5468] mb-6">{children}</div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-[#d8d3de] text-[#5d5468] hover:bg-[#F5F0F7] transition-colors"
          >
            {cancelLabel}
          </button>
          {onConfirm && confirmLabel && (
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-sm rounded-lg text-white transition-colors ${
                danger
                  ? 'bg-red-400 hover:bg-red-500'
                  : 'bg-[#A89BB5] hover:bg-[#9688A3]'
              }`}
            >
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
