"use client";

import { useEffect, useRef } from "react"; // добавили useRef
import { useSocketStore, useUserStore } from "@/store";
import { useChatStore } from "@/store/modules/chat";
import { useCallStore } from "@/store";
import styles from "./wrapperMessages.module.css";
import { REQUESTS } from "@/commands/commands";

export default function WrapperMessages() {
  const { activeChat, messages, setMessages } = useChatStore();
  const { sendMessage } = useSocketStore();
  const { setOutgoing, setConversationId } = useCallStore();
  const { user_id } = useUserStore();

  const inputRef = useRef<HTMLInputElement>(null);

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
      sendMessage(REQUESTS.messageSend, {
        conversationId: activeChat.id,
        content: value,
        isTemporary: activeChat.isTemporary,
        targetUserId: activeChat.isTemporary ? activeChat.interlocutor?.id : undefined,
      });

      if (activeChat.isTemporary) {
        const response = await sendMessage(REQUESTS.messageHistory, { conversationId: activeChat.id, userId: user_id });

        if (response?.messages) {
          setMessages(response.messages);
        }
      }
      if (!inputRef.current) return;
      inputRef.current.value = "";
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
            <button onClick={clickToCall}>Позвонить</button>
          </div>

          <div className={styles.wrapper_messages}>
            <div className={styles.scroller_messages}>
              {messages &&
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
                })}
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
