import { useRef, useEffect } from 'react';
import styles from './ConfirmDialog.module.css';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      if (el.showModal) el.showModal();
    } else {
      if (el.close) el.close();
    }
    return () => {
      if (el.close) el.close();
    };
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      open
      className={styles.dialog}
      onCancel={onCancel}
      role="alertdialog"
      aria-labelledby="cd-title"
      aria-describedby={description ? 'cd-desc' : undefined}
    >
      <h2 id="cd-title" className={styles.title}>{title}</h2>
      {description && <p id="cd-desc" className={styles.description}>{description}</p>}
      <div className={styles.actions}>
        <button type="button" className="btn secondary" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={variant === 'danger' ? 'btn danger' : 'btn'}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
