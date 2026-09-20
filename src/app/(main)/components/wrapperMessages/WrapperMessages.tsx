"use client";

import { useRef, useState, useEffect } from "react";
import { useSocketStore, useUserStore } from "@/store";
import { useChatStore, MessageChat } from "@/store/modules/chat";
import { useCallStore } from "@/store";
import styles from "./wrapperMessages.module.css";
import { REQUESTS } from "@/commands/commands";
import { uploadImage } from "@/API/routes";

const POPULAR_EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
  "🙂", "😉", "😍", "🥰", "😘", "😋", "😜", "😎", "🥳", "🥺",
  "😭", "😤", "😡", "😱", "👍", "👎", "👏", "🙌", "🔥", "❤️",
  "💔", "💯", "🎉", "✨", "🚀", "💡", "👀", "🤝", "⚡", "😴",
  "🤔", "🤫", "🫡", "🙏", "✌️", "👌", "💪", "🤡", "💀", "👻"
];

// Helper for formatting message dates
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
  const { activeChat, setActiveChat, messages, isMessagesLoading, typingUsers, deleteMessage } = useChatStore();
  const { sendMessage } = useSocketStore();
  const { setOutgoing, setConversationId } = useCallStore();
  const { user_id } = useUserStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Phase 1 Features: Reply, Edit, Typing, Emoji
  const [replyingTo, setReplyingTo] = useState<MessageChat | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageChat | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Сброс состояний при смене активного чата
  useEffect(() => {
    setReplyingTo(null);
    setEditingMessage(null);
    setShowEmojiPicker(false);
    if (inputRef.current) inputRef.current.value = "";
    removeSelectedFile();
  }, [activeChat?.id]);

  const handleBack = () => {
    setActiveChat(null as any);
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
      setPreviewUrl(URL.createObjectURL(file));
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

  // Typing indicator emitter
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

  // Reply handlers
  const handleStartReply = (msg: MessageChat) => {
    setEditingMessage(null);
    setReplyingTo(msg);
    inputRef.current?.focus();
  };

  // Edit handlers
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

  // Delete message handler
  const handleDeleteMessage = async (msgId: number) => {
    try {
      await sendMessage(REQUESTS.messageDelete, { messageId: msgId });
      deleteMessage(msgId);
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  // Emoji selection
  const handleSelectEmoji = (emoji: string) => {
    if (inputRef.current) {
      inputRef.current.value = (inputRef.current.value || "") + emoji;
      inputRef.current.focus();
    }
    setShowEmojiPicker(false);
  };

  // Send / Edit submit handler
  const handleSend = async () => {
    const textValue = inputRef.current?.value?.trim() || "";
    if ((!textValue && !selectedFile) || !activeChat?.id || isUploading) return;

    stopTypingImmediately();

    // If we are editing an existing message
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

    // Otherwise regular send or reply
    const isTemp = !!activeChat.isTemporary;
    const targetUserId = isTemp ? activeChat.interlocutor?.id : undefined;
    const currentChatId = activeChat.id;
    const currentReplyId = replyingTo?.id;

    let uploadedImageUrl: string | undefined;

    try {
      setIsUploading(true);

      // Загрузка фото в Cloudinary если прикреплено
      if (selectedFile) {
        const uploadRes = await uploadImage(selectedFile);
        if (uploadRes?.url) {
          uploadedImageUrl = uploadRes.url;
        }
      }

      if (inputRef.current) {
        inputRef.current.value = "";
      }
      removeSelectedFile();
      setReplyingTo(null);

      const response = await sendMessage(REQUESTS.messageSend, {
        conversationId: currentChatId,
        content: textValue,
        imageUrl: uploadedImageUrl,
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
            imageUrl: response.imageUrl || uploadedImageUrl,
            replyToId: response.replyToId,
            replyTo: response.replyTo,
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

  const isGroup = activeChat?.type === "GROUP";
  const chatTitle = isGroup
    ? activeChat.name || "Групповой чат"
    : activeChat?.interlocutor?.username
      ? `@${activeChat.interlocutor.username}`
      : "Чат";

  const currentTypingUsers = (activeChat?.id ? typingUsers[activeChat.id] : []) || [];

  return (
    <section className={styles.wrapper}>
      {activeChat === null ? (
        <div className={styles.noChatSelected}>
          <div className={styles.noChatIcon}>💬</div>
          <div className={styles.noChatTitle}>Выберите диалог</div>
          <div className={styles.noChatDesc}>
            Выберите чат слева или найдите новых собеседников через поиск.
          </div>
        </div>
      ) : (
        <>
          <div className={styles.upper_menu}>
            <div className={styles.left_side}>
              <button className={styles.backBtn} onClick={handleBack} title="Назад к списку чатов">
                ←
              </button>
              <div className={styles.avatar}>
                {isGroup ? "👥" : (activeChat?.interlocutor?.username?.[0]?.toUpperCase() || "👤")}
              </div>
              <div className={styles.chatInfo}>
                <span className={styles.chatTitleText}>{chatTitle}</span>
                {isGroup ? (
                  <span className={styles.chatSubtitle}>
                    {activeChat.membersCount || 0} участников
                  </span>
                ) : (
                  <span className={styles.chatSubtitleOnline}>онлайн</span>
                )}
              </div>
            </div>
            <button className={styles.callBtn} onClick={clickToCall} title="Начать аудиозвонок">
              <span>📞</span>
              <span>Позвонить</span>
            </button>
          </div>

          <div className={styles.wrapper_messages}>
            <div className={styles.scroller_messages}>
              {isMessagesLoading ? (
                <div className={styles.messages_loading}>
                  <div className={styles.messages_spinner} />
                  <span>Загрузка сообщений...</span>
                </div>
              ) : messages && messages.length > 0 ? (
                messages.map((message) => {
                  const isSelf = message.sender.id === user_id;
                  const time = formatTime(message.createdAt);

                  return (
                    <div
                      key={message.id}
                      className={`${styles.message_row} ${isSelf ? styles.row_self : styles.row_other}`}
                    >
                      <div
                        className={`${styles.message_bubble} ${
                          isSelf ? styles.bubble_self : styles.bubble_other
                        }`}
                      >
                        {/* Действия над сообщением при наведении */}
                        <div className={styles.message_actions}>
                          <button
                            className={styles.action_btn}
                            onClick={() => handleStartReply(message)}
                            title="Ответить"
                          >
                            ↩️
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
                              {message.replyTo.content || "📷 Фотография"}
                            </span>
                          </div>
                        )}

                        {!isSelf && isGroup && (
                          <div className={styles.message_sender_name}>
                            {message.sender.username || "участник"}
                          </div>
                        )}

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

                        {message.content && message.content !== "📷 Фотография" && (
                          <div className={styles.message_text}>{message.content}</div>
                        )}

                        <div className={styles.message_footer}>
                          <span className={styles.message_time}>{time}</span>
                          {message.editedAt && <span className={styles.edited_tag}>(ред.)</span>}
                          {isSelf && <span className={styles.read_status}>✓✓</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.messages_empty}>
                  <div className={styles.messages_empty_icon}>✨</div>
                  <div className={styles.messages_empty_title}>Здесь пока пусто</div>
                  <div className={styles.messages_empty_desc}>
                    Напишите первое сообщение или отправьте фото!
                  </div>
                </div>
              )}
            </div>

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
                    {editingMessage ? "Редактирование сообщения" : `Ответ для ${replyingTo?.sender?.username || "пользователя"}`}
                  </span>
                  <span className={styles.context_text}>
                    {editingMessage ? editingMessage.content : (replyingTo?.content || "📷 Фотография")}
                  </span>
                </div>
                <button className={styles.context_close} onClick={cancelContextAction} title="Отменить">
                  ✕
                </button>
              </div>
            )}

            {/* Панель предпросмотра выбранного изображения */}
            {previewUrl && (
              <div className={styles.image_preview_bar}>
                <img src={previewUrl} alt="Preview" className={styles.preview_thumb} />
                <div className={styles.preview_info}>
                  <span className={styles.preview_name}>{selectedFile?.name}</span>
                  <span className={styles.preview_size}>
                    {selectedFile ? (selectedFile.size / 1024).toFixed(1) + " КБ" : ""}
                  </span>
                </div>
                <button className={styles.preview_remove} onClick={removeSelectedFile} title="Удалить фото">
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

            {/* Инпут и кнопки прикрепления / отправки */}
            <div className={styles.input_container}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <button
                className={styles.attach_btn}
                onClick={() => fileInputRef.current?.click()}
                title="Прикрепить изображение"
                type="button"
              >
                📷
              </button>

              <button
                className={styles.attach_btn}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Вставить эмодзи"
                type="button"
              >
                😊
              </button>

              <input
                ref={inputRef}
                type="text"
                className={styles.text_input}
                placeholder={
                  editingMessage
                    ? "Редактируйте сообщение..."
                    : isUploading
                    ? "Загрузка изображения..."
                    : "Напишите сообщение..."
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
                title="Отправить сообщение"
              >
                {isUploading ? "..." : editingMessage ? "Сохранить" : "Отправить"}
              </button>
            </div>
          </div>
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
