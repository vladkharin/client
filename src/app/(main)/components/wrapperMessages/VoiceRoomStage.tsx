"use client";

import React, { useRef, useEffect } from "react";
import styles from "./voiceRoomStage.module.css";
import { ChannelUser } from "@/store/modules/callStore";
import { useUserStore } from "@/store";
import {
  joinMediasoupRoom,
  leaveMediasoupRoom,
  toggleMuteMic,
  toggleCamera,
  toggleScreenShare,
} from "@/lib/mediasoupManager";

interface VoiceRoomStageProps {
  conversationId: number;
  channelName: string;
  isInRoom: boolean;
  participants: ChannelUser[];
  isMicMuted: boolean;
  isCameraActive: boolean;
  isScreenActive: boolean;
  localVideoStream: MediaStream | null;
  remoteVideoStreams: Record<string, MediaStream>;
  viewMode: "stage" | "chat";
  onToggleViewMode: (mode: "stage" | "chat") => void;
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

function VideoTile({
  stream,
  username,
  isMe,
  isMuted,
}: {
  stream: MediaStream;
  username: string;
  isMe: boolean;
  isMuted: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`${styles.userCard} ${!isMuted ? styles.speaking : ""}`} style={{ padding: 0, background: "#0b0e14" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMe}
        className={styles.videoElement}
      />
      <div className={styles.videoOverlay}>
        <span>{username}</span>
        {isMuted ? (
          <span style={{ color: "#ef4444", marginLeft: "6px" }}>🔇</span>
        ) : (
          <span style={{ color: "#10b981", marginLeft: "6px" }}>🎙️</span>
        )}
      </div>
    </div>
  );
}

export const VoiceRoomStage: React.FC<VoiceRoomStageProps> = ({
  conversationId,
  channelName,
  isInRoom,
  participants,
  isMicMuted,
  isCameraActive,
  isScreenActive,
  localVideoStream,
  remoteVideoStreams,
  viewMode,
  onToggleViewMode,
}) => {
  const { user_id, username: myUsername, setProfileModalOpen } = useUserStore();

  // Merge participants with local user if in room and not yet listed
  const allUsers = [...participants];
  if (isInRoom && user_id && !allUsers.some((u) => u.id === user_id)) {
    allUsers.unshift({
      id: user_id,
      username: myUsername || "Вы",
      hasAudio: !isMicMuted,
      hasVideo: isCameraActive || isScreenActive,
    });
  }

  return (
    <div className={styles.container}>
      {/* Сетка участников / Сцена */}
      <div className={styles.stageBody}>
        {allUsers.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔊</div>
            <div className={styles.emptyTitle}>В голосовом канале никого нет</div>
            <div className={styles.emptyDesc}>
              Подключитесь, чтобы начать общаться голосом, включать видеокамеру или демонстрировать экран.
            </div>
            {!isInRoom && (
              <button
                type="button"
                className={styles.connectBtn}
                onClick={() => joinMediasoupRoom(conversationId)}
              >
                🟢 Войти в голосовой канал
              </button>
            )}
          </div>
        ) : (
          <div className={styles.grid}>
            {allUsers.map((user) => {
              const isMe = user.id === user_id;
              const hasVideo = isMe
                ? isCameraActive || isScreenActive
                : user.hasVideo;
              const userMuted = isMe ? isMicMuted : user.hasAudio === false;
              const remoteStream = !isMe ? remoteVideoStreams[String(user.id)] : null;

              if (isMe && localVideoStream && hasVideo) {
                return (
                  <VideoTile
                    key={user.id}
                    stream={localVideoStream}
                    username={`${user.username} (Вы)`}
                    isMe={true}
                    isMuted={isMicMuted}
                  />
                );
              }

              if (!isMe && remoteStream) {
                return (
                  <VideoTile
                    key={user.id}
                    stream={remoteStream}
                    username={user.username}
                    isMe={false}
                    isMuted={userMuted}
                  />
                );
              }

              return (
                <div
                  key={user.id}
                  className={`${styles.userCard} ${!userMuted ? styles.speaking : ""}`}
                >
                  <div className={styles.avatarWrapper}>
                    <div
                      className={styles.largeAvatar}
                      style={{ background: getAvatarGradient(user.username) }}
                    >
                      {getInitials(user.username)}
                    </div>
                    {!userMuted && <div className={styles.speakingRing} />}
                  </div>

                  <div className={styles.cardName}>
                    {user.username} {isMe ? "(Вы)" : ""}
                  </div>

                  <div
                    className={`${styles.cardBadge} ${userMuted ? styles.muted : ""}`}
                  >
                    {userMuted ? "🔇 Выкл" : "🎙️ В эфире"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Нижняя панель управления звонком */}
      {isInRoom ? (
        <div className={styles.controlBar}>
          <button
            type="button"
            className={`${styles.ctrlBtn} ${isMicMuted ? styles.muted : styles.active}`}
            onClick={toggleMuteMic}
            title={isMicMuted ? "Включить микрофон" : "Выключить микрофон"}
          >
            {isMicMuted ? "🔇 Микрофон выкл" : "🎙️ Микрофон"}
          </button>

          <button
            type="button"
            className={`${styles.ctrlBtn} ${isCameraActive ? styles.active : ""}`}
            onClick={toggleCamera}
            title={isCameraActive ? "Выключить камеру" : "Включить камеру"}
          >
            {isCameraActive ? "📹 Камера вкл" : "📷 Камера"}
          </button>

          <button
            type="button"
            className={`${styles.ctrlBtn} ${isScreenActive ? styles.active : ""}`}
            onClick={toggleScreenShare}
            title={isScreenActive ? "Остановить показ" : "Демонстрация экрана"}
          >
            {isScreenActive ? "💻 Экран транслируется" : "🖥️ Демонстрация"}
          </button>

          <button
            type="button"
            className={styles.ctrlBtn}
            onClick={() => setProfileModalOpen(true, "voice")}
            title="Настройки микрофона и динамика"
          >
            ⚙️ Настройки
          </button>

          <button
            type="button"
            className={`${styles.ctrlBtn} ${styles.disconnect}`}
            onClick={leaveMediasoupRoom}
            title="Покинуть голосовой канал"
          >
            🔴 Отключиться
          </button>
        </div>
      ) : (
        <div className={styles.controlBar}>
          <button
            type="button"
            className={styles.connectBtn}
            onClick={() => joinMediasoupRoom(conversationId)}
          >
            🟢 Подключиться к голосовому каналу
          </button>
        </div>
      )}
    </div>
  );
};
export default VoiceRoomStage;
