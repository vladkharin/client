"use client";

import { useEffect, useRef } from "react"; // добавили useRef
import { useSocketStore } from "@/store";
import { useChatStore } from "@/store/modules/chat";
import { useCallStore } from "@/store";
import styles from "./wrapperMessages.module.css";
import { REQUESTS } from "@/commands/commands";

export default function WrapperzMessages() {
  const { activeChat, messages } = useChatStore();
  const { sendMessage } = useSocketStore();
  const { removeProducer } = useCallStore();

  const inputRef = useRef<HTMLInputElement>(null); // Реф для инпута
  const audioRef = useRef<HTMLAudioElement>(null);

  const clickToCall = () => {
    if (activeChat?.id) {
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
        <div>Нет активного чата</div>
      ) : (
        <>
          <div className={styles.upper_menu}>
            <div className={styles.left_side}>
              <div className={styles.avatar}></div>
            </div>
            <button onClick={clickToCall}>Позвонить</button>
          </div>

          <div className={styles.wrapper_messages}>
            <div>Сообщения</div>
            <div className={styles.scroller_messages}>
              {messages &&
                messages.map((message) => (
                  <div className={styles.message} key={message.id}>
                    <div>{message.content}</div>
                    <div>{message.sender.username}</div>
                  </div>
                ))}
              {/* Привязываем реф */}
              <input ref={inputRef} type="text" placeholder="Введите сообщение..." />
              {/* Кнопка отправки */}
              <button onClick={handleSend}>Отправить</button>
            </div>
          </div>
          <audio ref={audioRef} autoPlay />
        </>
      )}
    </div>
  );
}
