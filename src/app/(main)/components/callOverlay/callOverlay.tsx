"use client";

import { useRef, useEffect } from "react";
import styles from "./callOverlay.module.css";
import { useCallStore } from "@/store";
import { useChatStore } from "@/store/modules/chat";
import {
  leaveMediasoupRoom,
  toggleCamera,
  toggleScreenShare,
  toggleMuteMic,
} from "@/lib/mediasoupManager";

// Компонент для удаленного видео
function RemoteVideo({ stream, peerId }: { stream: MediaStream; peerId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <span className={styles.peer_badge}>Собеседник #{peerId}</span>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={styles.remote_video}
      />
    </div>
  );
}

// Компонент для своего видео (PiP)
function LocalVideo({ stream }: { stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={styles.local_pip}>
      <span className={styles.pip_badge}>Вы</span>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={styles.local_video}
      />
    </div>
  );
}

export default function CallOverlay() {
  const {
    inCall,
    conversationId: callConvId,
    remoteParticipants,
    remoteVideoStreams,
    localVideoStream,
    isCameraActive,
    isScreenActive,
    isMicMuted,
  } = useCallStore();
  const { activeChat } = useChatStore();

  // Не показываем плавающий оверлей, если мы уже находимся внутри этого голосового канала
  const isViewingThisVoiceChannel = activeChat?.id === callConvId && activeChat?.type === "SERVER_VOICE";
  if (!inCall || isViewingThisVoiceChannel) return null;

  const totalCallMembers = new Set(remoteParticipants.map((p) => p.peerId)).size + 1;
  const remoteVideoEntries = Object.entries(remoteVideoStreams);
  const hasActiveVideo = remoteVideoEntries.length > 0 || !!localVideoStream;

  return (
    <aside className={styles.overlay} aria-label="Панель звонка">
      {/* ЕСЛИ ЕСТЬ ВИДЕО: Показываем аккуратную сетку видеозвонка */}
      {hasActiveVideo && (
        <div className={styles.video_grid_wrapper}>
          <div className={styles.video_grid}>
            {remoteVideoEntries.length > 0 ? (
              remoteVideoEntries.map(([peerId, stream]) => (
                <RemoteVideo key={peerId} peerId={peerId} stream={stream} />
              ))
            ) : (
              <div className={styles.no_video_placeholder}>
                <div className={styles.avatar_circle}>👤</div>
                <span>Собеседник без камеры</span>
              </div>
            )}

            {/* Свое видео в углу (PiP) */}
            {localVideoStream && <LocalVideo stream={localVideoStream} />}
          </div>
        </div>
      )}

      {/* ПЛАВАЮЩАЯ ПАНЕЛЬ УПРАВЛЕНИЯ ЗВОНКОМ */}
      <div className={styles.controls_pill}>
        <div className={styles.call_info}>
          <div className={styles.pulse_icon} />
          <span className={styles.status_text}>{totalCallMembers} в звонке</span>
        </div>

        {/* Микрофон */}
        <button
          type="button"
          className={`${styles.control_btn} ${isMicMuted ? styles.control_btn_muted : ""}`}
          onClick={toggleMuteMic}
          title={isMicMuted ? "Включить микрофон" : "Выключить микрофон"}
        >
          {isMicMuted ? "🔇 Выкл" : "🎙️ Микр"}
        </button>

        {/* Камера */}
        <button
          type="button"
          className={`${styles.control_btn} ${isCameraActive ? styles.control_btn_active : ""}`}
          onClick={toggleCamera}
          title="Камера"
        >
          {isCameraActive ? "📹 Вкл" : "📷 Камера"}
        </button>

        {/* Демонстрация экрана */}
        <button
          type="button"
          className={`${styles.control_btn} ${isScreenActive ? styles.control_btn_active : ""}`}
          onClick={toggleScreenShare}
          title="Демонстрация экрана"
        >
          {isScreenActive ? "🖥️ Вкл" : "💻 Экран"}
        </button>

        {/* Завершить звонок */}
        <button
          type="button"
          className={styles.leave_btn}
          onClick={leaveMediasoupRoom}
          title="Покинуть звонок"
        >
          Завершить
        </button>
      </div>
    </aside>
  );
}
