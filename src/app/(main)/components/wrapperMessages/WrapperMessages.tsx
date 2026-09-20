"use client";

import { useEffect, useRef, useState } from "react";
import { useSocketStore, useUserStore } from "@/store";
import { useChatStore } from "@/store/modules/chat";
import { useCallStore } from "@/store";
import styles from "./wrapperMessages.module.css";
import { REQUESTS } from "@/commands/commands";
import { uploadImage } from "@/API/routes";

export default function WrapperMessages() {
  const { activeChat, setActiveChat, messages, setMessages, isMessagesLoading } = useChatStore();
  const { sendMessage } = useSocketStore();
  const { setOutgoing, setConversationId } = useCallStore();
  const { user_id } = useUserStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Функция отправки
  const handleSend = async () => {
    const textValue = inputRef.current?.value?.trim() || "";
    if ((!textValue && !selectedFile) || !activeChat?.id || isUploading) return;

    const isTemp = !!activeChat.isTemporary;
    const targetUserId = isTemp ? activeChat.interlocutor?.id : undefined;
    const currentChatId = activeChat.id;

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

      const response = await sendMessage(REQUESTS.messageSend, {
        conversationId: currentChatId,
        content: textValue,
        imageUrl: uploadedImageUrl,
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

  return (
    <div className={styles.wrapper}>
      {activeChat === null ? (
        <div style={{ margin: "auto", color: "var(--text-secondary)" }}>Выберите чат для начала общения</div>
      ) : (
        <>
          <div className={styles.upper_menu}>
            <div className={styles.left_side}>
              <button className={styles.backBtn} onClick={handleBack} title="Назад к списку чатов">
                ←
              </button>
              <div className={styles.avatar}>{isGroup ? "👥" : ""}</div>
              <div>
                <span style={{ fontWeight: 600 }}>{chatTitle}</span>
                {isGroup && activeChat.membersCount !== undefined && (
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)", marginLeft: "8px" }}>
                    ({activeChat.membersCount} участников)
                  </span>
                )}
              </div>
            </div>
            <button className={styles.callBtn} onClick={clickToCall}>
              Позвонить
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

                  return (
                    <div
                      key={message.id}
                      className={`${styles.message} ${isSelf ? styles.message_self : styles.message_other}`}
                    >
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
                        <div className={styles.message_content}>{message.content}</div>
                      )}
                      <div className={styles.message_author}>{isSelf ? "вы" : message.sender.username}</div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.messages_empty}>
                  <div className={styles.messages_empty_icon}>✨</div>
                  <div className={styles.messages_empty_title}>Здесь пока пусто</div>
                  <div className={styles.messages_empty_desc}>Напишите первое сообщение или отправьте фото!</div>
                </div>
              )}
            </div>

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

              <input
                ref={inputRef}
                type="text"
                placeholder={isUploading ? "Загрузка изображения..." : "Напишите сообщение..."}
                disabled={isUploading}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <button
                className={styles.send_button}
                onClick={handleSend}
                disabled={isUploading}
              >
                {isUploading ? "Отправка..." : "Отправить"}
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
    </div>
  );
}
