"use client";

import React, { useEffect, useRef } from "react";
import styles from "./userActionPopover.module.css";
import { useMediaSettingsStore, useChatStore, useSocketStore, useUserStore, useCallStore } from "@/store";
import { REQUESTS } from "@/commands/commands";
import { toast } from "react-toastify";

export interface TargetUserAction {
  id: number;
  username: string;
  name?: string | null;
  surname?: string | null;
  avatar?: string | null;
  customStatus?: string | null;
  statusEmoji?: string | null;
  isOnline?: boolean;
  hasAudio?: boolean;
  hasVideo?: boolean;
  role?: string;
}

interface UserActionPopoverProps {
  isOpen: boolean;
  user: TargetUserAction | null;
  anchorPos: { top: number; left: number } | null;
  onClose: () => void;
}

function getAvatarGradient(str: string = "") {
  const gradients = [
    "linear-gradient(135deg, #f97316, #fb923c)",
    "linear-gradient(135deg, #6366f1, #a855f7)",
    "linear-gradient(135deg, #ec4899, #f43f5e)",
    "linear-gradient(135deg, #10b981, #14b8a6)",
    "linear-gradient(135deg, #3b82f6, #06b6d4)",
    "linear-gradient(135deg, #eab308, #f97316)",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

function getInitials(name?: string) {
  if (!name) return "?";
  return name.slice(0, 2).toUpperCase();
}

export default function UserActionPopover({
  isOpen,
  user,
  anchorPos,
  onClose,
}: UserActionPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  const {
    userVolumes,
    userMuted,
    setUserVolume,
    toggleUserMuted,
    getUserVolume,
    isUserMuted,
  } = useMediaSettingsStore();

  const { findOrCreateDirectChat, setActiveChat, onlineUserIds } = useChatStore();
  const { sendMessage } = useSocketStore();
  const { user_id } = useUserStore();
  const { setOutgoing, setConversationId } = useCallStore();

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const currentVolume = getUserVolume(user.id);
  const isMuted = isUserMuted(user.id);
  const isUserOnline =
    user.id === user_id || (user.id ? onlineUserIds.includes(user.id) : false) || !!user.isOnline;

  const displayName = user.name
    ? `${user.name} ${user.surname || ""}`.trim()
    : user.username;

  // Calculate clamped positioning
  const popoverWidth = 280;
  const popoverHeight = 360;
  let top = anchorPos ? anchorPos.top : window.innerHeight / 2 - 180;
  let left = anchorPos ? anchorPos.left : window.innerWidth / 2 - 140;

  if (typeof window !== "undefined") {
    top = Math.max(12, Math.min(top, window.innerHeight - popoverHeight - 12));
    left = Math.max(12, Math.min(left, window.innerWidth - popoverWidth - 12));
  }

  const handleOpenDM = () => {
    const chat = findOrCreateDirectChat(user.id, user.username);
    setActiveChat(chat);
    onClose();
  };

  const handleCall = () => {
    const chat = findOrCreateDirectChat(user.id, user.username);
    setActiveChat(chat);
    setConversationId(chat.id);
    setOutgoing(true);
    sendMessage(REQUESTS.callRequest, { conversationId: chat.id });
    onClose();
  };

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(`@${user.username}`);
    toast.success(`@${user.username} скопирован в буфер!`);
    onClose();
  };

  return (
    <>
      <div className={styles.overlay} />
      <div
        ref={popoverRef}
        className={styles.popover}
        style={{ top: `${top}px`, left: `${left}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={styles.banner}
          style={{ background: getAvatarGradient(user.username) }}
        />

        <div className={styles.body}>
          <div className={styles.avatarWrapper}>
            <div
              className={styles.avatar}
              style={{ background: getAvatarGradient(user.username) }}
            >
              {getInitials(displayName)}
            </div>
            <span
              className={`${styles.statusDot} ${
                isUserOnline ? "" : styles.statusDotOffline
              }`}
            />
          </div>

          <div className={styles.userInfo}>
            <div className={styles.displayName}>{displayName}</div>
            <div className={styles.usernameHandle}>@{user.username}</div>

            {user.customStatus && (
              <div className={styles.customStatus}>
                <span>{user.statusEmoji || "✨"}</span>
                <span>{user.customStatus}</span>
              </div>
            )}

            {user.role && (
              <div className={styles.roleBadge}>
                {user.role === "OWNER"
                  ? "👑 Создатель сервера"
                  : user.role === "ADMIN"
                  ? "🛡️ Администратор"
                  : "👤 Участник"}
              </div>
            )}
          </div>

          {/* СЕКЦИЯ ГРОМКОСТИ ПОЛЬЗОВАТЕЛЯ */}
          <div className={styles.volumeSection}>
            <div className={styles.volumeHeader}>
              <span>Громкость пользователя</span>
              <span
                className={`${styles.volumePercent} ${
                  isMuted
                    ? styles.volumePercentMuted
                    : currentVolume > 100
                    ? styles.volumePercentBoost
                    : ""
                }`}
              >
                {isMuted ? "0% (Заглушен)" : `${currentVolume}%`}
              </span>
            </div>

            <div className={styles.sliderWrapper}>
              <span style={{ fontSize: "14px" }}>
                {isMuted || currentVolume === 0 ? "🔇" : currentVolume > 100 ? "🔊" : "🔉"}
              </span>
              <input
                type="range"
                min="0"
                max="200"
                step="1"
                disabled={isMuted}
                value={isMuted ? 0 : currentVolume}
                onChange={(e) => setUserVolume(user.id, Number(e.target.value))}
                className={styles.slider}
                title="Настройте громкость пользователя"
              />
            </div>

            <button
              type="button"
              className={`${styles.muteToggleBtn} ${
                isMuted ? styles.muteToggleBtnActive : ""
              }`}
              onClick={() => toggleUserMuted(user.id)}
            >
              <span>{isMuted ? "🔊 Включить звук пользователя" : "🔇 Заглушить для меня"}</span>
            </button>
          </div>

          <div className={styles.divider} />

          {/* СПИСОК ДЕЙСТВИЙ */}
          <div className={styles.actionsList}>
            <button type="button" className={styles.actionBtn} onClick={handleOpenDM}>
              <span className={styles.actionIcon}>💬</span>
              <span>Написать в ЛС</span>
            </button>

            <button type="button" className={styles.actionBtn} onClick={handleCall}>
              <span className={styles.actionIcon}>📞</span>
              <span>Позвонить</span>
            </button>

            <button type="button" className={styles.actionBtn} onClick={handleCopyUsername}>
              <span className={styles.actionIcon}>📋</span>
              <span>Скопировать @никнейм</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
