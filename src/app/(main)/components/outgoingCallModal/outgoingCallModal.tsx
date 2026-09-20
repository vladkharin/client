"use client";

import styles from "./outgoingCallModal.module.css";
import { useCallStore, useSocketStore } from "@/store";
import { findUserusername } from "@/app/global.service";
import { leaveMediasoupRoom } from "@/lib/mediasoupManager";

export default function OutgoingCallModal() {
  const { isOutgoing, conversationId } = useCallStore();
  const { sendMessage } = useSocketStore();

  if (!isOutgoing) return null;

  const recipient = conversationId ? findUserusername(conversationId) : null;
  const username = recipient?.username || "Пользователь";

  const handleCancel = () => {
    sendMessage("call:cancel", { conversationId: conversationId });
    leaveMediasoupRoom();
  };

  return (
    <div className={styles.background}>
      <div className={styles.wrapper}>
        <div className={styles.avatar_area}>
          <div className={styles.avatar}>{username[0].toUpperCase()}</div>
          <div className={styles.waves}></div> {/* Анимация кругов */}
        </div>

        <h2 className={styles.name}>{username}</h2>
        <p className={styles.status}>Вызов...</p>

        <button className={styles.cancel_btn} onClick={handleCancel}>
          Отмена
        </button>
      </div>
    </div>
  );
}
