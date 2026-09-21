"use client";

import { useEffect, useState } from "react";
import { useChatStore } from "@/store/modules/chat";
import styles from "./chatList.module.css";
import { CHAT } from "@/types/types";
import { useSocketStore, useUserStore, useCallStore } from "@/store";
import { REQUESTS } from "@/commands/commands";
import { toast } from "react-toastify";
import CreateChannelModal from "../createChannelModal/CreateChannelModal";
import ChannelSettingsModal from "../channelSettingsModal/ChannelSettingsModal";
import { ServerSettingsModal } from "../serverSettingsModal/ServerSettingsModal";
import ConfirmModal from "../confirmModal/ConfirmModal";
import UserActionPopover, { TargetUserAction } from "../userActionPopover/UserActionPopover";
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
    onlineUserIds,
    setServerSettingsModalOpen,
  } = useChatStore();

  const { user_id, username: currentUsername, setProfileModalOpen } = useUserStore();
  const { sendMessage } = useSocketStore();
  const {
    inCall,
    conversationId: callConvId,
    isMicMuted,
    isCameraActive,
    isScreenActive,
    channelParticipants,
    setChannelParticipants,
  } = useCallStore();

  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [createChannelType, setCreateChannelType] = useState<"SERVER_CHANNEL" | "SERVER_VOICE">("SERVER_CHANNEL");
  const [channelToEdit, setChannelToEdit] = useState<CHAT | null>(null);
  const [isDeleteServerOpen, setIsDeleteServerOpen] = useState(false);
  const [isLeaveServerOpen, setIsLeaveServerOpen] = useState(false);
  const [selectedUserAction, setSelectedUserAction] = useState<TargetUserAction | null>(null);
  const [userActionPos, setUserActionPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (activeServer?.channels) {
      const voiceChs = activeServer.channels.filter((c) => c.type === "SERVER_VOICE");
      voiceChs.forEach((ch) => {
        sendMessage(REQUESTS.getRoomUsers, { conversationId: ch.id })
          .then((res: any) => {
            const list = Array.isArray(res) ? res : (res?.response ?? []);
            if (Array.isArray(list)) {
              setChannelParticipants(ch.id, list);
            }
          })
          .catch(() => {});
      });
    }
  }, [activeServer?.id, activeServer?.channels, sendMessage, setChannelParticipants]);

  const isOwner = activeServer?.ownerId === user_id || activeServer?.role === "OWNER";

  const handleDeleteServer = async () => {
    if (!activeServer) return;
    try {
      await sendMessage(REQUESTS.serverDelete, { serverId: activeServer.id });
      const serverName = activeServer.name;
      setServers(servers.filter((s) => s.id !== activeServer.id));
      setActiveServer(null);
      setActiveChat(null);
      toast.info(`Сервер "${serverName}" удален`);
    } catch (err: any) {
      toast.error(err?.message || "Ошибка удаления сервера");
      throw err;
    }
  };

  const handleLeaveServer = async () => {
    if (!activeServer) return;
    try {
      await sendMessage(REQUESTS.serverLeave, { serverId: activeServer.id });
      const serverName = activeServer.name;
      setServers(servers.filter((s) => s.id !== activeServer.id));
      setActiveServer(null);
      setActiveChat(null);
      toast.info(`Вы покинули сервер "${serverName}"`);
    } catch (err: any) {
      toast.error(err?.message || "Ошибка выхода с сервера");
      throw err;
    }
  };

  const handleCreateChannel = async (name: string, type: "SERVER_CHANNEL" | "SERVER_VOICE") => {
    if (!activeServer) return;
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
        toast.success(`Канал "${newChannel.name}" успешно создан!`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Ошибка создания канала");
      throw err;
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
              <button
                type="button"
                onClick={() => setServerSettingsModalOpen(true)}
                title="Настройки сервера (роли, название, участники)"
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#e2e8f0",
                  borderRadius: "6px",
                  padding: "3px 7px",
                  fontSize: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                ⚙️
              </button>
              {isOwner ? (
                <button
                  type="button"
                  onClick={() => setIsDeleteServerOpen(true)}
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
                  onClick={() => setIsLeaveServerOpen(true)}
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
              padding: "8px 12px",
              margin: "0 4px 8px 4px",
              fontSize: "12px",
              background: "rgba(249, 115, 22, 0.08)",
              border: "1px dashed rgba(249, 115, 22, 0.3)",
              borderRadius: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "12px" }}>
                🔗 Пригласить на сервер:
              </span>
              <span style={{ fontSize: "11px", color: "var(--primary)", fontWeight: 700 }}>
                {activeServer.inviteCode}
              </span>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/invite/${activeServer.inviteCode}`;
                  navigator.clipboard?.writeText(url);
                  toast.success("Ссылка-приглашение скопирована в буфер обмена!");
                }}
                style={{
                  flex: 1,
                  background: "var(--primary)",
                  border: "none",
                  color: "#ffffff",
                  borderRadius: "6px",
                  padding: "6px 8px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                title="Скопировать полную ссылку"
              >
                📋 Скопировать ссылку
              </button>
              {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/invite/${activeServer.inviteCode}`;
                    navigator
                      .share({
                        title: `Присоединяйся к серверу ${activeServer.name} в CraftHive!`,
                        text: `Приглашаю тебя на сервер "${activeServer.name}" в CraftHive!`,
                        url,
                      })
                      .catch(() => {});
                  }}
                  style={{
                    background: "var(--bg-element)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                  title="Поделиться через приложение"
                >
                  📤
                </button>
              )}
            </div>
          </div>


          {/* Текстовые каналы */}
          <div className={styles.section_title} style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Текстовые каналы</span>
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  setCreateChannelType("SERVER_CHANNEL");
                  setIsCreateChannelOpen(true);
                }}
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
                  {isOwner && (
                    <button
                      type="button"
                      className={styles.channel_settings_btn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setChannelToEdit(channel);
                      }}
                      title="Настройки канала"
                    >
                      ⚙️
                    </button>
                  )}
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
                onClick={() => {
                  setCreateChannelType("SERVER_VOICE");
                  setIsCreateChannelOpen(true);
                }}
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
              const channelUsers = channelParticipants[channel.id] || [];
              const isMeInChannel = inCall && callConvId === channel.id;
              const mergedUsers = [...channelUsers];
              if (isMeInChannel && user_id && !mergedUsers.some((u) => u.id === user_id)) {
                mergedUsers.unshift({
                  id: user_id,
                  username: currentUsername || "Я",
                  hasAudio: !isMicMuted,
                  hasVideo: isCameraActive,
                });
              }

              return (
                <div className={styles.voice_channel_container} key={channel.id}>
                  <div
                    className={`${styles.chat_item} ${isActive ? styles.chat_item_active : ""}`}
                    onClick={() => chatClicked(channel)}
                  >
                    <div className={styles.chat_avatar} style={{ background: "transparent", fontSize: "18px" }}>
                      🔊
                    </div>
                    <div className={styles.chat_content}>
                      <span className={styles.chat_name}>{channel.name}</span>
                    </div>
                    {mergedUsers.length > 0 && (
                      <span className={styles.count_badge} style={{ fontSize: "11px" }}>
                        {mergedUsers.length}
                      </span>
                    )}
                    {isOwner && (
                      <button
                        type="button"
                        className={styles.channel_settings_btn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setChannelToEdit(channel);
                        }}
                        title="Настройки канала"
                      >
                        ⚙️
                      </button>
                    )}
                  </div>

                  {mergedUsers.length > 0 && (
                    <div className={styles.voice_users_list}>
                      {mergedUsers.map((user) => {
                        const isMe = user.id === user_id;
                        const userMuted = isMe ? isMicMuted : !user.hasAudio;
                        const userCam = isMe ? isCameraActive : user.hasVideo;

                        return (
                          <div
                            key={user.id}
                            className={styles.voice_user_row}
                            title={isMe ? `${user.username} (Вы)` : `Нажмите для действий с ${user.username}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isMe) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setUserActionPos({ top: rect.top, left: rect.right + 10 });
                                setSelectedUserAction(user);
                              }
                            }}
                          >
                            <div
                              className={`${styles.voice_user_avatar} ${!userMuted ? styles.voice_user_speaking : ""}`}
                              style={{ background: getAvatarGradient(user.username) }}
                            >
                              {getInitials(user.name || user.username)}
                            </div>
                            <span className={styles.voice_user_name}>
                              {user.username} {isMe ? "(Вы)" : ""}
                            </span>
                            <div className={styles.voice_user_icons}>
                              {userCam && <span>📹</span>}
                              {userMuted && <span>🔇</span>}
                              {!userMuted && <span>🎙️</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {voiceConnectedWidget}

        {/* Модальное окно создания канала */}
        <CreateChannelModal
          isOpen={isCreateChannelOpen}
          onClose={() => setIsCreateChannelOpen(false)}
          initialType={createChannelType}
          onCreate={(name, type) => handleCreateChannel(name, type)}
        />

        {/* Подтверждение удаления сервера */}
        <ConfirmModal
          isOpen={isDeleteServerOpen}
          onClose={() => setIsDeleteServerOpen(false)}
          onConfirm={handleDeleteServer}
          title="Удалить сервер"
          description={`Вы действительно хотите удалить сервер "${activeServer.name}"? Все каналы, история сообщений и настройки будут безвозвратно удалены.`}
          confirmText="Удалить сервер"
          variant="danger"
        />

        {/* Подтверждение выхода с сервера */}
        <ConfirmModal
          isOpen={isLeaveServerOpen}
          onClose={() => setIsLeaveServerOpen(false)}
          onConfirm={handleLeaveServer}
          title="Покинуть сервер"
          description={`Вы уверены, что хотите покинуть сервер "${activeServer.name}"? Вы потеряете доступ к его каналам, пока не получите новое приглашение.`}
          confirmText="Покинуть сервер"
          variant="warning"
        />

        {/* Модальное окно настроек канала */}
        {channelToEdit && (
          <ChannelSettingsModal
            channel={channelToEdit}
            serverId={activeServer.id}
            onClose={() => setChannelToEdit(null)}
          />
        )}

        {/* Модальное окно настроек сервера (название, роли, участники, инвайты) */}
        <ServerSettingsModal />

        {/* Меню действий с пользователем */}
        <UserActionPopover
          isOpen={!!selectedUserAction}
          user={selectedUserAction}
          anchorPos={userActionPos}
          onClose={() => setSelectedUserAction(null)}
        />
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
                  const isOnline = otherMember?.id
                    ? (onlineUserIds.includes(otherMember.id) || !!otherMember.isOnline)
                    : false;

                  return (
                    <div
                      key={chat.id}
                      className={`${styles.chat_item} ${isActive ? styles.chat_item_active : ""}`}
                      onClick={() => chatClicked(chat)}
                    >
                      <div className={styles.chat_avatar_wrapper}>
                        <div
                          className={styles.chat_avatar}
                          style={{ background: getAvatarGradient(username) }}
                        >
                          {getInitials(username)}
                        </div>
                        {isOnline && <span className={styles.online_badge} />}
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
                          {otherMember?.customStatus || (isOnline ? "в сети" : "не в сети")}
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

      {/* Меню действий с пользователем */}
      <UserActionPopover
        isOpen={!!selectedUserAction}
        user={selectedUserAction}
        anchorPos={userActionPos}
        onClose={() => setSelectedUserAction(null)}
      />
    </aside>
  );
}
