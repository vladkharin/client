"use client";

import React, { useState } from "react";
import styles from "./confirmModal.module.css";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning";
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Подтвердить",
  cancelText = "Отмена",
  variant = "danger",
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Error handled by caller
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={styles.backdrop}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div
          className={`${styles.iconWrapper} ${
            variant === "danger" ? styles.dangerIcon : styles.warningIcon
          }`}
        >
          {variant === "danger" ? "⚠️" : "🚪"}
        </div>

        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`${styles.confirmBtn} ${
              variant === "danger" ? styles.danger : styles.warning
            }`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Выполняется..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
export default ConfirmModal;
