"use client";

import { useChatStore } from "@/store/modules/chat";
import styles from "./chatList.module.css";
import { CHAT } from "@/types/types";
import { useSocketStore, useUserStore, useCallStore } from "@/store";
import { REQUESTS } from "@/commands/commands";
import {
  joinMediasoupRoom,
  leaveMediasoupRoom,
  toggleMuteMic,
  toggleCamera,
  toggleScreenShare,
} from "@/lib/mediasoupManager";

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

export default function ChatList() {
  const {
    chats,
    servers,
    setServers,
    setActiveChat,
    activeChat,
    activeServer,
    setActiveServer,
    setMessages,
    isChatsLoading,
    setIsMessagesLoading,
  } = useChatStore();
  const { user_id, setProfileModalOpen } = useUserStore();
  const { sendMessage } = useSocketStore();
  const {

    inCall,
    conversationId: callConvId,
    isMicMuted,
    isCameraActive,
    isScreenActive,
  } = useCallStore();

  const isOwner = activeServer?.ownerId === user_id || activeServer?.role === "OWNER";

  const handleDeleteServer = async () => {
    if (!activeServer) return;
    if (!window.confirm(`Вы действительно хотите удалить сервер "${activeServer.name}"? Это действие необратимо.`)) {
      return;
    }

    try {
      await sendMessage(REQUESTS.serverDelete, { serverId: activeServer.id });
      setServers(servers.filter((s) => s.id !== activeServer.id));
      setActiveServer(null);
      setActiveChat(null);
    } catch (err: any) {
      alert(err?.message || "Ошибка удаления сервера");
    }
  };

  const handleLeaveServer = async () => {
    if (!activeServer) return;
    if (!window.confirm(`Вы уверены, что хотите покинуть сервер "${activeServer.name}"?`)) {
      return;
    }

    try {
      await sendMessage(REQUESTS.serverLeave, { serverId: activeServer.id });
      setServers(servers.filter((s) => s.id !== activeServer.id));
      setActiveServer(null);
      setActiveChat(null);
    } catch (err: any) {
      alert(err?.message || "Ошибка выхода с сервера");
    }
  };

  const handleCreateChannel = async (type: "SERVER_CHANNEL" | "SERVER_VOICE") => {
    if (!activeServer) return;
    const name = window.prompt(type === "SERVER_CHANNEL" ? "Введите название текстового канала:" : "Введите название голосового канала:");
    if (!name || !name.trim()) return;

    try {
      const res: any = await sendMessage(REQUESTS.channelCreate, {
        serverId: activeServer.id,
        name: name.trim(),
        type,
      });

      const newChannel = res?.response ?? res;
      if (newChannel && newChannel.id) {
        const updatedServer = {
          ...activeServer,
          channels: [...(activeServer.channels || []), newChannel],
        };
        setActiveServer(updatedServer);
        setServers(servers.map((s) => (s.id === updatedServer.id ? updatedServer : s)));
        setActiveChat(newChannel);
      }
    } catch (err: any) {
      alert(err?.message || "Ошибка создания канала");
    }
  };

  const chatClicked = async (chat: CHAT) => {
    setActiveChat(chat);

    // Если это голосовой канал — автоматически подключаемся к нему по клику (Discord style)
    if (chat?.type === "SERVER_VOICE") {
      const currentCallId = useCallStore.getState().conversationId;
      const isInCall = useCallStore.getState().inCall;
      if (!isInCall || currentCallId !== chat.id) {
        joinMediasoupRoom(chat.id).catch(console.error);
      }
    }

    if (chat?.isTemporary) {
      setMessages([]);
      return;
    }

    setIsMessagesLoading(true);
    try {
      const response = await sendMessage(REQUESTS.messageHistory, {
        conversationId: chat.id,
        userId: user_id,
      });
      if (response?.messages) {
        setMessages(response.messages);
        useChatStore.getState().setFirstUnreadId(response.firstUnreadId || null);
      } else {
        setMessages([]);
        useChatStore.getState().setFirstUnreadId(null);
      }
    } catch (err) {
      console.error("Ошибка загрузки сообщений:", err);
      setIsMessagesLoading(false);
    }
  };

  const connectedChannelName =
    servers?.flatMap((s) => s.channels || []).find((c) => c.id === callConvId)?.name ||
    chats?.find((c) => c.id === callConvId)?.name ||
    (callConvId ? `Комната #${callConvId}` : "Голосовой канал");

  const voiceConnectedWidget = inCall ? (
    <div className={styles.voiceConnectedCard}>
      <div className={styles.voiceConnectedHeader}>
        <div className={styles.voiceConnectedPulse} />
        <div className={styles.voiceConnectedInfo}>
          <span className={styles.voiceConnectedStatus}>Голос подключен</span>
          <span className={styles.voiceConnectedChannel}>
            🔊 {connectedChannelName}
          </span>
        </div>
        <button
          type="button"
          className={styles.voiceDisconnectBtn}
          onClick={leaveMediasoupRoom}
          title="Отключиться от голосового канала"
        >
          ✕
        </button>
      </div>
      <div className={styles.voiceQuickActions}>
        <button
          type="button"
          className={`${styles.voiceActionBtn} ${isMicMuted ? styles.voiceActionBtnActive : ""}`}
          onClick={toggleMuteMic}
          title={isMicMuted ? "Включить микрофон" : "Заглушить микрофон"}
        >
          {isMicMuted ? "🔇" : "🎙️"}
        </button>
        <button
          type="button"
          className={`${styles.voiceActionBtn} ${isCameraActive ? styles.voiceActionBtnActive : ""}`}
          onClick={toggleCamera}
          title="Камера"
        >
          {isCameraActive ? "📹" : "📷"}
        </button>
        <button
          type="button"
          className={`${styles.voiceActionBtn} ${isScreenActive ? styles.voiceActionBtnActive : ""}`}
          onClick={toggleScreenShare}
          title="Демонстрация экрана"
        >
          {isScreenActive ? "💻" : "🖥️"}
        </button>
        <button
          type="button"
          className={styles.voiceActionBtn}
          onClick={() => setProfileModalOpen(true, "voice")}
          title="Настройки звука и видео"
        >
          ⚙️
        </button>
      </div>
    </div>
  ) : null;


  // ЕСЛИ ВЫБРАН СЕРВЕР: Показываем каналы сервера
  if (activeServer) {
    const textChannels = activeServer.channels?.filter((c) => c.type !== "SERVER_VOICE") || [];
    const voiceChannels = activeServer.channels?.filter((c) => c.type === "SERVER_VOICE") || [];

    return (
      <aside className={styles.chats_wrapper}>
        <div className={styles.section} style={{ paddingTop: "14px" }}>
          <div className={styles.section_title} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "15px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeServer.name}
            </span>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span className={styles.count_badge}>
                {activeServer.membersCount || 1}
              </span>
              {isOwner ? (
                <button
                  type="button"
                  onClick={handleDeleteServer}
                  title="Удалить сервер"
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#ef4444",
                    borderRadius: "6px",
                    padding: "3px 7px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  🗑️
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLeaveServer}
                  title="Покинуть сервер"
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#ef4444",
                    borderRadius: "6px",
                    padding: "3px 7px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  🚪
                </button>
              )}
            </div>
          </div>

          <div
            style={{
              padding: "4px 14px 10px 14px",
              fontSize: "11px",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>
              Инвайт: <code style={{ color: "var(--primary)" }}>{activeServer.inviteCode}</code>
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(activeServer.inviteCode);
                alert("Инвайт-код скопирован в буфер обмена!");
              }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: "12px",
              }}
              title="Скопировать инвайт"
            >
              📋
            </button>
          </div>

          {/* Текстовые каналы */}
          <div className={styles.section_title} style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Текстовые каналы</span>
            {isOwner && (
              <button
                type="button"
                onClick={() => handleCreateChannel("SERVER_CHANNEL")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--primary)",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: "bold",
                  padding: "0 4px",
                }}
                title="Создать текстовый канал"
              >
                +
              </button>
            )}
          </div>
          <div className={styles.chats_list}>
            {textChannels.map((channel) => {
              const isActive = activeChat?.id === channel.id;
              return (
                <div
                  key={channel.id}
                  className={`${styles.chat_item} ${isActive ? styles.chat_item_active : ""}`}
                  onClick={() => chatClicked(channel)}
                >
                  <div className={styles.chat_avatar} style={{ background: "transparent", fontSize: "18px" }}>
                    #
                  </div>
                  <div className={styles.chat_content}>
                    <span className={styles.chat_name}>{channel.name}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Голосовые каналы */}
          <div className={styles.section_title} style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Голосовые каналы</span>
            {isOwner && (
              <button
                type="button"
                onClick={() => handleCreateChannel("SERVER_VOICE")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--primary)",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: "bold",
                  padding: "0 4px",
                }}
                title="Создать голосовой канал"
              >
                +
              </button>
            )}
          </div>
          <div className={styles.chats_list}>
            {voiceChannels.map((channel) => {
              const isActive = activeChat?.id === channel.id;
              return (
                <div
                  key={channel.id}
                  className={`${styles.chat_item} ${isActive ? styles.chat_item_active : ""}`}
                  onClick={() => chatClicked(channel)}
                >
                  <div className={styles.chat_avatar} style={{ background: "transparent", fontSize: "18px" }}>
                    🔊
                  </div>
                  <div className={styles.chat_content}>
                    <span className={styles.chat_name}>{channel.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {voiceConnectedWidget}
      </aside>
    );
  }

  // ОБЫЧНЫЙ РЕЖИМ (DM & Группы)
  const directChats = chats?.filter((c) => c.type !== "GROUP" && c.type !== "SERVER_CHANNEL" && c.type !== "SERVER_VOICE") || [];
  const groupChats = chats?.filter((c) => c.type === "GROUP") || [];

  return (
    <aside className={styles.chats_wrapper}>
      {isChatsLoading ? (
        <div className={styles.skeleton_container}>
          <div className={styles.loading_hint}>
            <div className={styles.spinner} />
            <span>Загрузка диалогов...</span>
          </div>
          {[1, 2, 3, 4, 5].map((key) => (
            <div key={key} className={styles.skeleton_item}>
              <div className={styles.skeleton_avatar} />
              <div className={styles.skeleton_text_group}>
                <div className={styles.skeleton_title} />
                <div className={styles.skeleton_subtitle} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Групповые чаты */}
          {groupChats.length > 0 && (
            <div className={styles.section}>
              <div className={styles.section_title}>
                <span>Группы</span>
                <span className={styles.count_badge}>{groupChats.length}</span>
              </div>
              <div className={styles.chats_list}>
                {groupChats.map((chat) => {
                  const isActive = activeChat?.id === chat.id;

                  return (
                    <div
                      key={chat.id}
                      className={`${styles.chat_item} ${isActive ? styles.chat_item_active : ""}`}
                      onClick={() => chatClicked(chat)}
                    >
                      <div
                        className={styles.chat_avatar}
                        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                      >
                        👥
                      </div>
                      <div className={styles.chat_content}>
                        <div className={styles.chat_name_row}>
                          <span className={styles.chat_name}>{chat.name || "Группа"}</span>
                        </div>
                        {chat.membersCount !== undefined && (
                          <span className={styles.chat_meta}>
                            {chat.membersCount} участников
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Личные сообщения */}
          <div className={styles.section}>
            <div className={styles.section_title}>
              <span>Личные сообщения</span>
              {directChats.length > 0 && (
                <span className={styles.count_badge}>{directChats.length}</span>
              )}
            </div>

            {directChats.length === 0 && groupChats.length === 0 ? (
              <div className={styles.empty_state}>
                <div className={styles.empty_icon}>💬</div>
                <div className={styles.empty_title}>Пока нет диалогов</div>
                <div className={styles.empty_desc}>
                  Найдите друзей через кнопку «Поиск» вверху и начните общение!
                </div>
              </div>
            ) : directChats.length === 0 ? (
              <div className={styles.empty_minor}>Нет личных диалогов</div>
            ) : (
              <div className={styles.chats_list}>
                {directChats.map((chat) => {
                  const otherMember = chat.interlocutor;
                  const isActive = activeChat?.id === chat.id;
                  const username = otherMember?.username || "пользователь";

                  return (
                    <div
                      key={chat.id}
                      className={`${styles.chat_item} ${isActive ? styles.chat_item_active : ""}`}
                      onClick={() => chatClicked(chat)}
                    >
                      <div
                        className={styles.chat_avatar}
                        style={{ background: getAvatarGradient(username) }}
                      >
                        {getInitials(username)}
                      </div>
                      <div className={styles.chat_content}>
                        <div className={styles.chat_name_row}>
                          <span className={styles.chat_name}>@{username}</span>
                          {otherMember?.statusEmoji && (
                            <span style={{ fontSize: "12px", marginLeft: "4px" }}>
                              {otherMember.statusEmoji}
                            </span>
                          )}
                        </div>
                        <span className={styles.chat_status}>
                          {otherMember?.customStatus || "Нажмите, чтобы открыть"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {voiceConnectedWidget}
    </aside>
  );
}
