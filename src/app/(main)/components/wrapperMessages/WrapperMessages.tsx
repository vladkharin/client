"use client";

import { useEffect, useRef } from "react";
import { useSocketStore, useUserStore } from "@/store";
import { useChatStore } from "@/store/modules/chat";
import { useCallStore } from "@/store";
import styles from "./wrapperMessages.module.css";
import { REQUESTS } from "@/commands/commands";

export default function WrapperMessages() {
  const { activeChat, setActiveChat, messages, setMessages, isMessagesLoading } = useChatStore();
  const { sendMessage } = useSocketStore();
  const { setOutgoing, setConversationId } = useCallStore();
  const { user_id } = useUserStore();

  const inputRef = useRef<HTMLInputElement>(null);

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

  // Функция отправки
  const handleSend = async () => {
    const value = inputRef.current?.value?.trim();
    if (value && activeChat?.id) {
      const isTemp = !!activeChat.isTemporary;
      const targetUserId = isTemp ? activeChat.interlocutor?.id : undefined;
      const currentChatId = activeChat.id;

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      try {
        const response = await sendMessage(REQUESTS.messageSend, {
          conversationId: currentChatId,
          content: value,
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
              conversationId: response.conversationId,
              createdAt: response.createdAt || new Date().toISOString(),
              senderId: user_id || response.senderId,
              sender: response.sender || { id: user_id, username: "" },
            });
          }
        }
      } catch (err) {
        console.error("Failed to send message:", err);
      }
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
            <button className={styles.callBtn} onClick={clickToCall}>Позвонить</button>
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
                      <div className={styles.message_content}>{message.content}</div>
                      <div className={styles.message_author}>{isSelf ? "вы" : message.sender.username}</div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.messages_empty}>
                  <div className={styles.messages_empty_icon}>✨</div>
                  <div className={styles.messages_empty_title}>Здесь пока пусто</div>
                  <div className={styles.messages_empty_desc}>Напишите первое сообщение, чтобы начать диалог!</div>
                </div>
              )}
            </div>

            {/* Инпут вынесен из скроллера вниз */}
            <div className={styles.input_container}>
              <input
                ref={inputRef}
                type="text"
                placeholder="Напишите сообщение..."
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <button className={styles.send_button} onClick={handleSend}>
                Отправить
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
