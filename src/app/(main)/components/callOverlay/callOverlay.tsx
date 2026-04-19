// src/components/CallOverlay/CallOverlay.tsx
"use client";

import styles from "./callOverlay.module.css";
import { useCallStore } from "@/store";
import { useSocketStore } from "@/store";

export default function CallOverlay() {
  const { inCall, conversationId, remoteParticipants, reset } = useCallStore();
  const { sendMessage } = useSocketStore();

  if (!inCall) return null;

  const handleLeave = () => {
    if (conversationId) {
      sendMessage("mediasoup:leaveRoom", { conversationId });
    }
    reset();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.info}>
        <div className={styles.pulse_icon} />
        <span className={styles.status}>В звонке ({remoteParticipants.length + 1} чел.)</span>
      </div>

      <div className={styles.controls}>
        <button className={styles.leave_btn} onClick={handleLeave}>
          Покинуть звонок
        </button>
      </div>
    </div>
  );
}
