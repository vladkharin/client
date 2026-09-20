"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./createChannelModal.module.css";
import { toast } from "react-toastify";

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: "SERVER_CHANNEL" | "SERVER_VOICE";
  onCreate: (name: string, type: "SERVER_CHANNEL" | "SERVER_VOICE") => Promise<void>;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  onClose,
  initialType = "SERVER_CHANNEL",
  onCreate,
}) => {
  const [channelType, setChannelType] = useState<"SERVER_CHANNEL" | "SERVER_VOICE">(initialType);
  const [channelName, setChannelName] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setChannelType(initialType);
      setChannelName("");
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = channelName.trim();
    if (!trimmed) {
      toast.error("Пожалуйста, введите название канала");
      return;
    }

    setLoading(true);
    try {
      await onCreate(trimmed, channelType);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Не удалось создать канал");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose} onKeyDown={handleKeyDown}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Создать канал</h2>
          <button className={styles.closeBtn} onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.typeSection}>
            <span className={styles.sectionLabel}>Тип канала</span>
            <div className={styles.typeCards}>
              <div
                className={`${styles.typeCard} ${channelType === "SERVER_CHANNEL" ? styles.active : ""}`}
                onClick={() => setChannelType("SERVER_CHANNEL")}
              >
                <div className={styles.typeIcon}>💬</div>
                <div className={styles.typeInfo}>
                  <div className={styles.typeName}>Текстовый канал</div>
                  <div className={styles.typeDesc}>Отправка сообщений, картинок и файлов</div>
                </div>
                <div className={styles.radioCircle}>
                  {channelType === "SERVER_CHANNEL" && <div className={styles.radioDot} />}
                </div>
              </div>

              <div
                className={`${styles.typeCard} ${channelType === "SERVER_VOICE" ? styles.active : ""}`}
                onClick={() => setChannelType("SERVER_VOICE")}
              >
                <div className={styles.typeIcon}>🔊</div>
                <div className={styles.typeInfo}>
                  <div className={styles.typeName}>Голосовой канал</div>
                  <div className={styles.typeDesc}>Голосовое общение, трансляция экрана и видео</div>
                </div>
                <div className={styles.radioCircle}>
                  {channelType === "SERVER_VOICE" && <div className={styles.radioDot} />}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.sectionLabel}>Название канала</label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputPrefix}>
                {channelType === "SERVER_CHANNEL" ? "#" : "🔊"}
              </span>
              <input
                ref={inputRef}
                type="text"
                className={styles.input}
                placeholder={
                  channelType === "SERVER_CHANNEL" ? "новый-канал" : "Голосовой канал"
                }
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                maxLength={40}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || !channelName.trim()}
            >
              {loading ? "Создание..." : "Создать канал"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default CreateChannelModal;
