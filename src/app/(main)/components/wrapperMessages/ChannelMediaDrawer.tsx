"use client";

import React, { useState } from "react";
import { MessageChat } from "@/store/modules/chat";
import styles from "./channelMediaDrawer.module.css";

interface ChannelMediaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: MessageChat[];
  onImageClick?: (url: string) => void;
  onJumpToMessage?: (msgId: number) => void;
}

type TabType = "media" | "files" | "pins";

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatTime(dateStr?: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function ChannelMediaDrawer({
  isOpen,
  onClose,
  messages,
  onImageClick,
  onJumpToMessage,
}: ChannelMediaDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("media");

  if (!isOpen) return null;

  const mediaMessages = (messages || []).filter((m) => !!m.imageUrl);
  const fileMessages = (messages || []).filter(
    (m) => !!m.fileUrl && m.fileType !== "audio"
  );
  const pinnedMessages = (messages || []).filter((m) => !!m.isPinned);

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.title}>Медиа и вложения</div>
          <button className={styles.closeBtn} onClick={onClose} title="Закрыть">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "media" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("media")}
          >
            🖼️ Медиа ({mediaMessages.length})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "files" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("files")}
          >
            📁 Файлы ({fileMessages.length})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "pins" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("pins")}
          >
            📌 Закрепленные ({pinnedMessages.length})
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {activeTab === "media" && (
            <>
              {mediaMessages.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🖼️</div>
                  <div>Нет фотографий или картинок</div>
                </div>
              ) : (
                <div className={styles.imageGrid}>
                  {mediaMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={styles.imageThumb}
                      onClick={() => onImageClick && msg.imageUrl && onImageClick(msg.imageUrl)}
                      title={`От: ${msg.sender?.username || "Пользователь"}`}
                    >
                      <img src={msg.imageUrl!} alt={msg.fileName || "Изображение"} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "files" && (
            <>
              {fileMessages.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>📁</div>
                  <div>Нет отправленных файлов</div>
                </div>
              ) : (
                fileMessages.map((msg) => (
                  <a
                    key={msg.id}
                    href={msg.fileUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.fileItem}
                    download={msg.fileName || "file"}
                  >
                    <div className={styles.fileIcon}>📄</div>
                    <div className={styles.fileDetails}>
                      <span className={styles.fileName}>
                        {msg.fileName || "Файл вложения"}
                      </span>
                      <span className={styles.fileSize}>
                        {formatFileSize(msg.fileSize)} • {msg.sender?.username || "Пользователь"}
                      </span>
                    </div>
                  </a>
                ))
              )}
            </>
          )}

          {activeTab === "pins" && (
            <>
              {pinnedMessages.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>📌</div>
                  <div>Нет закрепленных сообщений</div>
                </div>
              ) : (
                pinnedMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={styles.pinItem}
                    style={{ cursor: onJumpToMessage ? "pointer" : "default" }}
                    onClick={() => onJumpToMessage && onJumpToMessage(msg.id)}
                  >
                    <div className={styles.pinHeader}>
                      <span className={styles.pinAuthor}>
                        {msg.sender?.username || "Пользователь"}
                      </span>
                      <span className={styles.pinTime}>{formatTime(msg.createdAt)}</span>
                    </div>
                    {msg.content && <div className={styles.pinText}>{msg.content}</div>}
                    {msg.imageUrl && (
                      <div
                        className={styles.imageThumb}
                        style={{ maxHeight: "120px", marginTop: "4px" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onImageClick && msg.imageUrl) onImageClick(msg.imageUrl);
                        }}
                      >
                        <img src={msg.imageUrl} alt="Превью" />
                      </div>
                    )}
                    {msg.fileName && (
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                        📎 {msg.fileName}
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
