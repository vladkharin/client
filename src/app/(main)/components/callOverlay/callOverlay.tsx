"use client";

import styles from "./callOverlay.module.css";
import { useCallStore } from "@/store";
import { leaveMediasoupRoom } from "@/lib/mediasoupManager";

export default function CallOverlay() {
  const { inCall, remoteParticipants } = useCallStore();

  if (!inCall) return null;

  const handleLeave = () => {
    leaveMediasoupRoom();
  };

  const totalCallMembers = new Set(remoteParticipants.map((p) => p.peerId)).size + 1;

  return (
    <div className={styles.overlay}>
      <div className={styles.info}>
        <div className={styles.pulse_icon} />
        <span className={styles.status}>В звонке ({totalCallMembers} чел.)</span>
      </div>

      <div className={styles.controls}>
        <button className={styles.leave_btn} onClick={handleLeave}>
          Покинуть звонок
        </button>
      </div>
    </div>
  );
}
