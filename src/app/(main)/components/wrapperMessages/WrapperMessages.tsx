"use client";

import { useEffect, useRef } from "react"; // добавили useRef
import { useSocketStore, useUserStore } from "@/store";
import { useChatStore } from "@/store/modules/chat";
import { useCallStore } from "@/store";
import styles from "./wrapperMessages.module.css";
import { REQUESTS } from "@/commands/commands";

export default function WrapperzMessages() {
  const { activeChat, messages } = useChatStore();
  const { sendMessage } = useSocketStore();
  const { removeProducer, setOutgoing, setConversationId } = useCallStore();
  const { user_id } = useUserStore();

  const inputRef = useRef<HTMLInputElement>(null); // Реф для инпута
  const audioRef = useRef<HTMLAudioElement>(null);

  const clickToCall = () => {
    if (activeChat?.id) {
      setOutgoing(true);
      setConversationId(activeChat.id);
      sendMessage("call:request", { conversationId: activeChat.id });
    }
  };

  // Функция отправки
  const handleSend = () => {
    const value = inputRef.current?.value;
    if (value && activeChat?.id) {
      sendMessage(REQUESTS.messageSend, {
        conversationId: activeChat.id,
        content: value,
        isTemporary: activeChat.isTemporary,
        targetUserId: activeChat.isTemporary ? activeChat.ownerId : undefined,
      });
      if (!inputRef.current) return;
      inputRef.current.value = ""; // Очищаем после отправки
    }
  };

  useEffect(() => {
    if (Object.keys(removeProducer).length > 0 && audioRef.current) {
      const firstAudio = Object.values(removeProducer)[0]?.audio;
      if (firstAudio && firstAudio.srcObject) {
        audioRef.current.srcObject = firstAudio.srcObject;
        audioRef.current.play().catch((e) => console.warn("🔇 Play failed:", e));
      }
    }
  }, [removeProducer]);

  return (
    <div className={styles.wrapper}>
      {activeChat === null ? (
        <div style={{ margin: "auto", color: "var(--text-secondary)" }}>Выберите чат для начала общения</div>
      ) : (
        <>
          <div className={styles.upper_menu}>
            <div className={styles.left_side}>
              <div className={styles.avatar}></div>
              <span style={{ fontWeight: 600 }}>{activeChat.name || "Чат"}</span>
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
                      // 2. Здесь должны быть ОБА класса: общий .message и специфичный (self или other)
                      className={`${styles.message} ${isSelf ? styles.message_self : styles.message_other}`}
                    >
                      {/* 3. Добавь эти классы для текста и автора, чтобы работал цвет из CSS */}
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
                onKeyDown={(e) => e.key === "Enter" && handleSend()} // Отправка по Enter
              />
              <button className={styles.send_button} onClick={handleSend}>
                Отправить
              </button>
            </div>
          </div>
          <audio ref={audioRef} autoPlay />
        </>
      )}
    </div>
  );
}
