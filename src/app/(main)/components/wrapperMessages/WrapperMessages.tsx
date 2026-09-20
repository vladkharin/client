"use client";

import React, { useRef, useState, useEffect } from "react";
import { useSocketStore, useUserStore } from "@/store";
import { useChatStore, MessageChat } from "@/store/modules/chat";
import { useCallStore } from "@/store";
import styles from "./wrapperMessages.module.css";
import { REQUESTS } from "@/commands/commands";
import { uploadFile } from "@/API/routes";
import VoiceMessagePlayer from "./VoiceMessagePlayer";
import VoiceRoomStage from "./VoiceRoomStage";
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

const POPULAR_EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
  "🙂", "😉", "😍", "🥰", "😘", "😋", "😜", "😎", "🥳", "🥺",
  "😭", "😤", "😡", "😱", "👍", "👎", "👏", "🙌", "🔥", "❤️",
  "💔", "💯", "🎉", "✨", "🚀", "💡", "👀", "🤝", "⚡", "😴",
  "🤔", "🤫", "🫡", "🙏", "✌️", "👌", "💪", "🤡", "💀", "👻"
];

const REACTION_LIST = ["👍", "❤️", "🔥", "😂", "😮", "😢"];

function formatTime(dateString?: string) {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function WrapperMessages() {
  const {
    activeChat,
    setActiveChat,
    messages,
    setMessages,
    firstUnreadId,
    setFirstUnreadId,
    isMessagesLoading,
    setIsMessagesLoading,
    typingUsers,
    deleteMessage,
  } = useChatStore();
  const { sendMessage } = useSocketStore();
  const {
    inCall,
    conversationId: callConvId,
    isMicMuted,
    isCameraActive,
    isScreenActive,
    channelParticipants,
    localVideoStream,
    remoteVideoStreams,
    setOutgoing,
    setConversationId,
  } = useCallStore();
  const { user_id, setProfileModalOpen } = useUserStore();

  const isVoiceChannel = activeChat?.type === "SERVER_VOICE";
  const isInThisVoiceChannel = inCall && callConvId === activeChat?.id;

  const [voiceViewMode, setVoiceViewMode] = useState<"stage" | "chat">("stage");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Phase 1-3 States
  const [replyingTo, setReplyingTo] = useState<MessageChat | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageChat | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unreadSeparatorRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const scrollToUnreadOrBottom = () => {
    if (firstUnreadId && unreadSeparatorRef.current) {
      unreadSeparatorRef.current.scrollIntoView({ behavior: "auto", block: "center" });
    } else {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  };

  useEffect(() => {
    if (messages && messages.length > 0) {
      const timer = setTimeout(() => {
        scrollToUnreadOrBottom();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [activeChat?.id, messages?.length]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 150;
    setShowScrollBottom(!isNearBottom);
  };

  useEffect(() => {
    if (activeChat?.type === "SERVER_VOICE") {
      setVoiceViewMode("stage");
    }
    setReplyingTo(null);
    setEditingMessage(null);
    setShowEmojiPicker(false);
    setSearchOpen(false);
    setSearchQuery("");
    setShowScrollBottom(false);
    if (inputRef.current) inputRef.current.value = "";
    removeSelectedFile();
    cancelRecording();
  }, [activeChat?.id, activeChat?.type]);

  useEffect(() => {
    if (!activeChat?.id || activeChat.isTemporary) {
      return;
    }

    let isMounted = true;
    setIsMessagesLoading(true);

    sendMessage(REQUESTS.messageHistory, {
      conversationId: activeChat.id,
      userId: user_id,
    })
      .then((response: any) => {
        if (!isMounted) return;
        const msgList = response?.messages || (Array.isArray(response) ? response : []);
        setMessages(msgList);
        setFirstUnreadId(response?.firstUnreadId || null);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Ошибка загрузки сообщений:", err);
        setMessages([]);
      })
      .finally(() => {
        if (isMounted) {
          setIsMessagesLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeChat?.id, user_id, sendMessage, setMessages, setIsMessagesLoading, setFirstUnreadId]);

  const handleBack = () => {
    setActiveChat(null);
  };

  const clickToCall = () => {
    if (activeChat?.id) {
      setOutgoing(true);
      setConversationId(activeChat.id);
      sendMessage("call:request", { conversationId: activeChat.id });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const removeSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Voice recording logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordDuration(0);

      recordIntervalRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start voice recording:", err);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
    }
    setIsRecording(false);
    setRecordDuration(0);
    audioChunksRef.current = [];
  };

  const finishAndSendRecording = async () => {
    if (!mediaRecorderRef.current || !activeChat?.id) return;

    const recordedSeconds = recordDuration;

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      try {
        setIsUploading(true);
        const uploadRes = await uploadFile(audioBlob, "voice_message.webm");

        if (uploadRes?.url) {
          await sendMessage(REQUESTS.messageSend, {
            conversationId: activeChat.id,
            content: "🎙️ Голосовое сообщение",
            fileUrl: uploadRes.url,
            fileType: "audio",
            audioDuration: recordedSeconds,
            replyToId: replyingTo?.id,
          });
        }
      } catch (err) {
        console.error("Failed to upload voice message:", err);
      } finally {
        setIsUploading(false);
        setReplyingTo(null);
      }
    };

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    setIsRecording(false);
    setRecordDuration(0);
  };

  // Typing indicator
  const handleInputChange = () => {
    if (!activeChat?.id) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendMessage(REQUESTS.typingStart, { conversationId: activeChat.id });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current && activeChat?.id) {
        isTypingRef.current = false;
        sendMessage(REQUESTS.typingStop, { conversationId: activeChat.id });
      }
    }, 2500);
  };

  const stopTypingImmediately = () => {
    if (isTypingRef.current && activeChat?.id) {
      isTypingRef.current = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      sendMessage(REQUESTS.typingStop, { conversationId: activeChat.id });
    }
  };

  // Actions: Reply, Edit, Delete, Pin, Reactions
  const handleStartReply = (msg: MessageChat) => {
    setEditingMessage(null);
    setReplyingTo(msg);
    inputRef.current?.focus();
  };

  const handleStartEdit = (msg: MessageChat) => {
    setReplyingTo(null);
    setEditingMessage(msg);
    if (inputRef.current) {
      inputRef.current.value = msg.content || "";
      inputRef.current.focus();
    }
  };

  const cancelContextAction = () => {
    setReplyingTo(null);
    setEditingMessage(null);
    if (inputRef.current && editingMessage) {
      inputRef.current.value = "";
    }
  };

  const handleDeleteMessage = async (msgId: number) => {
    try {
      await sendMessage(REQUESTS.messageDelete, { messageId: msgId });
      deleteMessage(msgId);
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  const handleToggleReaction = (msgId: number, emoji: string) => {
    sendMessage(REQUESTS.reactionToggle, { messageId: msgId, emoji });
  };

  const handlePinMessage = (msgId: number) => {
    sendMessage(REQUESTS.messagePin, { messageId: msgId });
  };

  const handleUnpinMessage = () => {
    if (activeChat?.id) {
      sendMessage(REQUESTS.messageUnpin, { conversationId: activeChat.id });
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    if (inputRef.current) {
      inputRef.current.value = (inputRef.current.value || "") + emoji;
      inputRef.current.focus();
    }
    setShowEmojiPicker(false);
  };

  // Send message
  const handleSend = async () => {
    const textValue = inputRef.current?.value?.trim() || "";
    if ((!textValue && !selectedFile) || !activeChat?.id || isUploading) return;

    stopTypingImmediately();

    if (editingMessage) {
      try {
        setIsUploading(true);
        const res = await sendMessage(REQUESTS.messageEdit, {
          messageId: editingMessage.id,
          content: textValue,
        });
        if (res?.message) {
          useChatStore.getState().updateMessage(editingMessage.id, res.message.content, res.message.editedAt);
        }
        setEditingMessage(null);
        if (inputRef.current) inputRef.current.value = "";
      } catch (err) {
        console.error("Failed to edit message:", err);
      } finally {
        setIsUploading(false);
      }
      return;
    }

    const isTemp = !!activeChat.isTemporary;
    const targetUserId = isTemp ? activeChat.interlocutor?.id : undefined;
    const currentChatId = activeChat.id;
    const currentReplyId = replyingTo?.id;

    let uploadedUrl: string | undefined;
    let uploadedFileType: string | undefined;
    let uploadedFileName: string | undefined;
    let uploadedFileSize: number | undefined;

    try {
      setIsUploading(true);

      if (selectedFile) {
        const uploadRes = await uploadFile(selectedFile);
        if (uploadRes?.url) {
          uploadedUrl = uploadRes.url;
          uploadedFileType = uploadRes.fileType;
          uploadedFileName = uploadRes.fileName;
          uploadedFileSize = uploadRes.fileSize;
        }
      }

      if (inputRef.current) inputRef.current.value = "";
      removeSelectedFile();
      setReplyingTo(null);

      const isImg = uploadedFileType === "image";

      const response = await sendMessage(REQUESTS.messageSend, {
        conversationId: currentChatId,
        content: textValue,
        imageUrl: isImg ? uploadedUrl : undefined,
        fileUrl: !isImg ? uploadedUrl : undefined,
        fileType: uploadedFileType,
        fileName: uploadedFileName,
        fileSize: uploadedFileSize,
        replyToId: currentReplyId,
        isTemporary: isTemp,
        targetUserId,
      });

      if (response) {
        if (isTemp && response.tempConversationId && response.fullChat) {
          useChatStore.getState().replaceTemporaryChat(response.tempConversationId, response.fullChat);
        }
        if (response.id && response.conversationId) {
          useChatStore.getState().addMessage({
            id: response.id,
            content: response.content,
            imageUrl: response.imageUrl,
            fileUrl: response.fileUrl,
            fileName: response.fileName,
            fileSize: response.fileSize,
            fileType: response.fileType,
            audioDuration: response.audioDuration,
            replyToId: response.replyToId,
            replyTo: response.replyTo,
            reactions: response.reactions || [],
            conversationId: response.conversationId,
            createdAt: response.createdAt || new Date().toISOString(),
            senderId: user_id || response.senderId,
            sender: response.sender || { id: user_id, username: "" },
          });
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const isServerChannel = activeChat?.type === "SERVER_CHANNEL" || activeChat?.type === "SERVER_VOICE";
  const isGroup = activeChat?.type === "GROUP";
  const chatTitle = isServerChannel
    ? (activeChat.type === "SERVER_VOICE" ? `🔊 ${activeChat.name}` : `# ${activeChat.name}`)
    : isGroup
    ? (activeChat.name || "Групповой чат")
    : activeChat?.interlocutor?.username
    ? `@${activeChat.interlocutor.username}`
    : "Чат";

  const currentTypingUsers = (activeChat?.id ? typingUsers[activeChat.id] : []) || [];

  // Filtered messages when searching
  const displayedMessages = searchQuery.trim()
    ? (messages || []).filter((m) =>
        m.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.fileName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages || [];

  return (
    <section className={styles.wrapper}>
      {activeChat === null ? (
        <div className={styles.noChatSelected}>
          <div className={styles.noChatIcon}>💬</div>
          <div className={styles.noChatTitle}>Выберите диалог или сервер</div>
          <div className={styles.noChatDesc}>
            Выберите чат слева, найдите собеседников через поиск или выберите сервер сообщества.
          </div>
        </div>
      ) : (
        <>
          {/* Верхняя панель чата */}
          <div className={styles.upper_menu}>
            <div className={styles.left_side}>
              <button className={styles.backBtn} onClick={handleBack} title="Назад к списку чатов">
                ←
              </button>
              <div className={styles.avatar}>
                {activeChat?.type === "SERVER_VOICE"
                  ? "🔊"
                  : activeChat?.type === "SERVER_CHANNEL"
                  ? "#"
                  : isGroup
                  ? "👥"
                  : (activeChat?.interlocutor?.username?.[0]?.toUpperCase() || "👤")}
              </div>
              <div className={styles.chatInfo}>
                <span className={styles.chatTitleText}>{chatTitle}</span>
                {isServerChannel ? (
                  <span className={styles.chatSubtitle}>
                    {activeChat.type === "SERVER_VOICE" ? "Голосовой канал" : "Текстовый канал"}
                  </span>
                ) : isGroup ? (
                  <span className={styles.chatSubtitle}>
                    {activeChat.membersCount || 0} участников
                  </span>
                ) : (
                  <span className={styles.chatSubtitleOnline}>
                    {activeChat?.interlocutor?.statusEmoji ? `${activeChat.interlocutor.statusEmoji} ` : ""}
                    {activeChat?.interlocutor?.customStatus || "онлайн"}
                  </span>
                )}
              </div>
            </div>

            <div className={styles.headerActions}>
              {/* Переключатель Сцена / Чат для голосовых каналов */}
              {isVoiceChannel && (
                <div style={{ display: "flex", background: "var(--bg-element)", borderRadius: "8px", padding: "2px", gap: "2px" }}>
                  <button
                    type="button"
                    onClick={() => setVoiceViewMode("stage")}
                    style={{
                      background: voiceViewMode === "stage" ? "var(--primary)" : "transparent",
                      color: voiceViewMode === "stage" ? "#ffffff" : "var(--text-muted)",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    👥 Сцена ({(channelParticipants[activeChat.id] || []).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoiceViewMode("chat")}
                    style={{
                      background: voiceViewMode === "chat" ? "var(--primary)" : "transparent",
                      color: voiceViewMode === "chat" ? "#ffffff" : "var(--text-muted)",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    💬 Чат
                  </button>
                </div>
              )}

              <button
                className={styles.iconBtn}
                onClick={() => setSearchOpen(!searchOpen)}
                title="Поиск в чате (Ctrl+F)"
              >
                🔍
              </button>
              {isVoiceChannel ? (
                isInThisVoiceChannel ? (
                  <button
                    className={styles.callBtn}
                    onClick={leaveMediasoupRoom}
                    style={{ background: "#ef4444", borderColor: "#dc2626" }}
                    title="Отключиться от голосового канала"
                  >
                    <span>🔴</span>
                    <span>Отключиться</span>
                  </button>
                ) : (
                  <button
                    className={styles.callBtn}
                    onClick={() => joinMediasoupRoom(activeChat.id)}
                    style={{ background: "#10b981", borderColor: "#059669" }}
                    title="Подключиться к голосовому каналу"
                  >
                    <span>🟢</span>
                    <span>Войти в голосовой</span>
                  </button>
                )
              ) : activeChat?.type === "SERVER_CHANNEL" ? null : (
                <button className={styles.callBtn} onClick={clickToCall} title="Начать звонок">
                  <span>📞</span>
                  <span>Позвонить</span>
                </button>
              )}
            </div>
          </div>

          {/* ЕСЛИ ГОЛОСОВОЙ КАНАЛ И ВЫБРАН РЕЖИМ СЦЕНЫ — ПОКАЗЫВАЕМ ПОЛНОЦЕННУЮ СЦЕНУ */}
          {isVoiceChannel && voiceViewMode === "stage" ? (
            <VoiceRoomStage
              conversationId={activeChat.id}
              channelName={activeChat.name || "Голосовой канал"}
              isInRoom={isInThisVoiceChannel}
              participants={channelParticipants[activeChat.id] || []}
              isMicMuted={isMicMuted}
              isCameraActive={isCameraActive}
              isScreenActive={isScreenActive}
              localVideoStream={localVideoStream}
              remoteVideoStreams={remoteVideoStreams}
              viewMode={voiceViewMode}
              onToggleViewMode={setVoiceViewMode}
            />
          ) : (
            <>
              {/* Discord-style Voice Room Stage Banner (при переключении в текстовый чат) */}
              {isVoiceChannel && (
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(99, 102, 241, 0.12))",
                    borderBottom: "1px solid var(--border-color)",
                    padding: "10px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ fontSize: "20px" }}>🔊</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>
                        {activeChat.name} • Текстовый чат канала
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                        {isInThisVoiceChannel
                          ? "🟢 Вы подключены к голосовой связи"
                          : "Нажмите «Сцена», чтобы открыть показ участников и видео"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => setVoiceViewMode("stage")}
                      style={{
                        background: "var(--bg-element)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-primary)",
                        borderRadius: "8px",
                        padding: "6px 12px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      👥 Открыть сцену
                    </button>
                    {isInThisVoiceChannel ? (
                      <button
                        type="button"
                        onClick={toggleMuteMic}
                        style={{
                          background: isMicMuted ? "rgba(239, 68, 68, 0.2)" : "var(--bg-element)",
                          border: "1px solid var(--border-color)",
                          color: isMicMuted ? "#ef4444" : "var(--text-primary)",
                          borderRadius: "8px",
                          padding: "6px 10px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        {isMicMuted ? "🔇 Микр выкл" : "🎙️ Микрофон"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => joinMediasoupRoom(activeChat.id)}
                        style={{
                          background: "var(--primary)",
                          border: "none",
                          color: "#ffffff",
                          borderRadius: "8px",
                          padding: "6px 12px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        🟢 Войти в голос
                      </button>
                    )}
                  </div>
                </div>
              )}

          {/* Строка поиска по чату */}
          {searchOpen && (
            <div className={styles.search_bar}>
              <input
                type="text"
                className={styles.search_input}
                placeholder="Поиск по сообщениям..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button className={styles.search_close} onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
                ✕
              </button>
            </div>
          )}

          {/* Плашка закрепленного сообщения */}
          {activeChat?.pinnedMessage && (
            <div className={styles.pinned_banner}>
              <div className={styles.pinned_content}>
                <span className={styles.pinned_author}>
                  📌 Закреплено от @{activeChat.pinnedMessage.sender?.username || "пользователя"}
                </span>
                <span className={styles.pinned_text}>{activeChat.pinnedMessage.content}</span>
              </div>
              <button className={styles.pinned_unpin} onClick={handleUnpinMessage} title="Открепить">
                ✕
              </button>
            </div>
          )}

          <div className={styles.wrapper_messages}>
            <div
              ref={messagesContainerRef}
              className={styles.scroller_messages}
              onScroll={handleScroll}
            >
              {isMessagesLoading ? (
                <div className={styles.messages_loading}>
                  <div className={styles.messages_spinner} />
                  <span>Загрузка сообщений...</span>
                </div>
              ) : displayedMessages.length > 0 ? (
                displayedMessages.map((message) => {
                  const isSelf = message.sender.id === user_id;
                  const isFirstUnread = message.id === firstUnreadId;
                  const time = formatTime(message.createdAt);

                  // Group reactions by emoji
                  const reactionMap: Record<string, { count: number; userIds: number[] }> = {};
                  (message.reactions || []).forEach((r) => {
                    if (!reactionMap[r.emoji]) {
                      reactionMap[r.emoji] = { count: 0, userIds: [] };
                    }
                    reactionMap[r.emoji].count += 1;
                    reactionMap[r.emoji].userIds.push(r.userId);
                  });

                  return (
                    <React.Fragment key={message.id}>
                      {isFirstUnread && (
                        <div ref={unreadSeparatorRef} className={styles.unread_separator}>
                          <span>Новые сообщения</span>
                        </div>
                      )}
                      <div
                        className={`${styles.message_row} ${isSelf ? styles.row_self : styles.row_other}`}
                      >
                        {!isSelf && (
                          <div
                            className={styles.message_avatar}
                            style={{ background: getAvatarGradient(message.sender.username) }}
                            title={`@${message.sender.username || "пользователь"}`}
                          >
                            {getInitials(message.sender.username)}
                          </div>
                        )}
                        <div
                          className={`${styles.message_bubble} ${
                            isSelf ? styles.bubble_self : styles.bubble_other
                          }`}
                        >
                          {/* Действия над сообщением */}
                          <div className={styles.message_actions}>
                            {REACTION_LIST.map((emoji) => (
                              <button
                                key={emoji}
                                className={styles.action_btn}
                                onClick={() => handleToggleReaction(message.id, emoji)}
                                title={`Реакция ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                            <button
                              className={styles.action_btn}
                              onClick={() => handleStartReply(message)}
                              title="Ответить"
                            >
                              ↩️
                            </button>
                            <button
                              className={styles.action_btn}
                              onClick={() => handlePinMessage(message.id)}
                              title="Закрепить"
                            >
                              📌
                            </button>
                            {isSelf && (
                              <>
                                <button
                                  className={styles.action_btn}
                                  onClick={() => handleStartEdit(message)}
                                  title="Редактировать"
                                >
                                  ✏️
                                </button>
                                <button
                                  className={`${styles.action_btn} ${styles.action_btn_delete}`}
                                  onClick={() => handleDeleteMessage(message.id)}
                                  title="Удалить"
                                >
                                  🗑️
                                </button>
                              </>
                            )}
                          </div>

                          {/* Цитата / ответ */}
                          {message.replyTo && (
                            <div className={styles.quote_block}>
                              <span className={styles.quote_author}>
                                {message.replyTo.sender?.username || "Пользователь"}
                              </span>
                              <span className={styles.quote_text}>
                                {message.replyTo.content || "Медиафайл"}
                              </span>
                            </div>
                          )}

                          {!isSelf && isGroup && (
                            <div className={styles.message_sender_name}>
                              {message.sender.username || "участник"}
                            </div>
                          )}

                          {/* Изображение */}
                          {message.imageUrl && (
                            <div
                              className={styles.message_image_container}
                              onClick={() => setFullscreenImage(message.imageUrl || null)}
                            >
                              <img
                                src={message.imageUrl}
                                alt="Attachment"
                                className={styles.message_image}
                                loading="lazy"
                              />
                            </div>
                          )}

                          {/* Голосовое сообщение */}
                          {message.fileType === "audio" && message.fileUrl && (
                            <VoiceMessagePlayer src={message.fileUrl} duration={message.audioDuration} />
                          )}

                          {/* Документ / файл */}
                          {message.fileUrl && message.fileType !== "audio" && (
                            <div className={styles.file_card}>
                              <div className={styles.file_icon}>
                                {message.fileType === "video" ? "🎥" : "📄"}
                              </div>
                              <div className={styles.file_details}>
                                <span className={styles.file_title}>{message.fileName || "Файл"}</span>
                                <span className={styles.file_size}>
                                  {message.fileSize ? (message.fileSize / 1024).toFixed(1) + " КБ" : ""}
                                </span>
                              </div>
                              <a
                                href={message.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                download={message.fileName}
                                className={styles.file_download_btn}
                                title="Скачать"
                              >
                                ⬇️
                              </a>
                            </div>
                          )}

                          {/* Текст */}
                          {message.content &&
                            message.content !== "📷 Фотография" &&
                            message.content !== "🎙️ Голосовое сообщение" && (
                              <div className={styles.message_text}>{message.content}</div>
                            )}

                          {/* Реакции под сообщением */}
                          {Object.keys(reactionMap).length > 0 && (
                            <div className={styles.reactions_container}>
                              {Object.entries(reactionMap).map(([emoji, data]) => {
                                const hasReacted = data.userIds.includes(user_id || 0);
                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    className={`${styles.reaction_chip} ${hasReacted ? styles.reaction_chip_active : ""}`}
                                    onClick={() => handleToggleReaction(message.id, emoji)}
                                  >
                                    <span>{emoji}</span>
                                    <span className={styles.reaction_chip_count}>{data.count}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          <div className={styles.message_footer}>
                            <span className={styles.message_time}>{time}</span>
                            {message.editedAt && <span className={styles.edited_tag}>(ред.)</span>}
                            {isSelf && <span className={styles.read_status}>✓✓</span>}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              ) : (
                <div className={styles.messages_empty}>
                  <div className={styles.messages_empty_icon}>✨</div>
                  <div className={styles.messages_empty_title}>
                    {searchQuery ? "Ничего не найдено" : "Здесь пока пусто"}
                  </div>
                  <div className={styles.messages_empty_desc}>
                    {searchQuery
                      ? "Попробуйте изменить поисковый запрос."
                      : "Напишите первое сообщение, отправьте файл или запишите голосовое!"}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} style={{ height: "1px", width: "100%" }} />
            </div>

            {/* Кнопка прокрутки вниз */}
            {showScrollBottom && (
              <button
                type="button"
                className={styles.scroll_to_bottom_btn}
                onClick={() => scrollToBottom("smooth")}
                title="Прокрутить вниз"
              >
                ↓
              </button>
            )}

            {/* Индикатор набора текста */}
            {currentTypingUsers.length > 0 && (
              <div className={styles.typing_indicator}>
                <span>
                  {currentTypingUsers.join(", ")} {currentTypingUsers.length === 1 ? "печатает" : "печатают"}...
                </span>
                <div className={styles.typing_dots}>
                  <div className={styles.typing_dot} />
                  <div className={styles.typing_dot} />
                  <div className={styles.typing_dot} />
                </div>
              </div>
            )}

            {/* Панель цитирования или редактирования */}
            {(replyingTo || editingMessage) && (
              <div className={styles.context_banner}>
                <div className={styles.context_info}>
                  <span className={styles.context_title}>
                    {editingMessage
                      ? "Редактирование сообщения"
                      : `Ответ для @${replyingTo?.sender?.username || "пользователя"}`}
                  </span>
                  <span className={styles.context_text}>
                    {editingMessage ? editingMessage.content : (replyingTo?.content || "Медиафайл")}
                  </span>
                </div>
                <button className={styles.context_close} onClick={cancelContextAction} title="Отменить">
                  ✕
                </button>
              </div>
            )}

            {/* Панель предпросмотра изображения */}
            {previewUrl && (
              <div className={styles.image_preview_bar}>
                <img src={previewUrl} alt="Preview" className={styles.preview_thumb} />
                <div className={styles.preview_info}>
                  <span className={styles.preview_name}>{selectedFile?.name}</span>
                  <span className={styles.preview_size}>
                    {selectedFile ? (selectedFile.size / 1024).toFixed(1) + " КБ" : ""}
                  </span>
                </div>
                <button className={styles.preview_remove} onClick={removeSelectedFile} title="Удалить">
                  ✕
                </button>
              </div>
            )}

            {/* Эмодзи пикер */}
            {showEmojiPicker && (
              <div className={styles.emoji_picker}>
                {POPULAR_EMOJIS.map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={styles.emoji_item}
                    onClick={() => handleSelectEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Панель записи голосового сообщения */}
            {isRecording ? (
              <div className={styles.recording_bar}>
                <div className={styles.recording_indicator}>
                  <div className={styles.recording_dot} />
                  <span className={styles.recording_timer}>
                    {Math.floor(recordDuration / 60)}:{(recordDuration % 60).toString().padStart(2, "0")}
                  </span>
                  <span>Запись голосового...</span>
                </div>
                <div className={styles.recording_actions}>
                  <button className={styles.recording_cancel_btn} onClick={cancelRecording}>
                    Отмена
                  </button>
                  <button className={styles.recording_send_btn} onClick={finishAndSendRecording}>
                    Отправить ✈️
                  </button>
                </div>
              </div>
            ) : (
              /* Обычная панель ввода */
              <div className={styles.input_container}>
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <button
                  className={styles.attach_btn}
                  onClick={() => fileInputRef.current?.click()}
                  title="Прикрепить файл или фото"
                  type="button"
                >
                  📎
                </button>

                <button
                  className={styles.attach_btn}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  title="Вставить эмодзи"
                  type="button"
                >
                  😊
                </button>

                <button
                  className={styles.attach_btn}
                  onClick={startRecording}
                  title="Записать голосовое сообщение"
                  type="button"
                >
                  🎙️
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  className={styles.text_input}
                  placeholder={
                    editingMessage
                      ? "Редактируйте сообщение..."
                      : isUploading
                      ? "Загрузка файла..."
                      : "Напишите сообщение (или /ai, /summary)..."
                  }
                  disabled={isUploading}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSend();
                    } else if (e.key === "Escape" && (replyingTo || editingMessage)) {
                      cancelContextAction();
                    }
                  }}
                />

                <button
                  className={styles.send_button}
                  onClick={handleSend}
                  disabled={isUploading}
                  title="Отправить"
                >
                  {isUploading ? (
                    "..."
                  ) : editingMessage ? (
                    <>
                      <span className={styles.send_btn_text}>Сохранить</span>
                      <span className={styles.send_btn_icon}>✓</span>
                    </>
                  ) : (
                    <>
                      <span className={styles.send_btn_text}>Отправить</span>
                      <span className={styles.send_btn_icon}>➤</span>
                    </>
                  )}
                </button>
              </div>
            )}

          </div>
        </>
      )}
    </>
  )}

      {/* Лайтбокс просмотрщика фото на весь экран */}
      {fullscreenImage && (
        <div className={styles.lightbox_overlay} onClick={() => setFullscreenImage(null)}>
          <div className={styles.lightbox_content} onClick={(e) => e.stopPropagation()}>
            <button className={styles.lightbox_close} onClick={() => setFullscreenImage(null)}>
              ✕
            </button>
            <img src={fullscreenImage} alt="Full view" className={styles.lightbox_img} />
          </div>
        </div>
      )}
    </section>
  );
}
