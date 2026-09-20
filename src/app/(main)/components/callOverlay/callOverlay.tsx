"use client";

import { useState } from "react";
import styles from "./callOverlay.module.css";
import { useCallStore } from "@/store";
import { leaveMediasoupRoom, toggleCamera, toggleScreenShare } from "@/lib/mediasoupManager";

export default function CallOverlay() {
  const { inCall, remoteParticipants } = useCallStore();
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenOn, setIsScreenOn] = useState(false);

  if (!inCall) return null;

  const handleLeave = () => {
    leaveMediasoupRoom();
  };

  const handleToggleCamera = async () => {
    const active = await toggleCamera();
    setIsCameraOn(active);
  };

  const handleToggleScreen = async () => {
    const active = await toggleScreenShare();
    setIsScreenOn(active);
  };

  const totalCallMembers = new Set(remoteParticipants.map((p) => p.peerId)).size + 1;

  return (
    <div className={styles.overlay}>
      <div className={styles.info}>
        <div className={styles.pulse_icon} />
        <span className={styles.status}>В звонке ({totalCallMembers} чел.)</span>
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.action_btn}
          style={{
            background: isCameraOn ? "var(--primary)" : "rgba(255, 255, 255, 0.15)",
            border: "none",
            color: "#fff",
            padding: "6px 10px",
            borderRadius: "6px",
            cursor: "pointer",
          }}
          onClick={handleToggleCamera}
          title="Камера"
        >
          {isCameraOn ? "📹 Вкл" : "📷 Камера"}
        </button>

        <button
          type="button"
          className={styles.action_btn}
          style={{
            background: isScreenOn ? "var(--primary)" : "rgba(255, 255, 255, 0.15)",
            border: "none",
            color: "#fff",
            padding: "6px 10px",
            borderRadius: "6px",
            cursor: "pointer",
          }}
          onClick={handleToggleScreen}
          title="Демонстрация экрана"
        >
          {isScreenOn ? "🖥️ Вкл" : "💻 Экран"}
        </button>

        <button className={styles.leave_btn} onClick={handleLeave}>
          Покинуть звонок
        </button>
      </div>
    </div>
  );
}
