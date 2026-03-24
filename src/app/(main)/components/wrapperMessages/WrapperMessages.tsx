// src/components/WrapperzMessages.tsx
"use client";

import { useEffect, useRef } from "react";
import { useSocketStore } from "@/store";
import { useChatStore } from "@/store/modules/chat";
import { useCallStore } from "@/store"; // ← предполагается, что у тебя есть
import styles from "./wrapperMessages.module.css";

export default function WrapperzMessages() {
  const { activeChat } = useChatStore();
  const { sendMessage } = useSocketStore();
  const { removeProducer } = useCallStore(); // ← все удалённые аудио

  const clickToCall = () => {
    if (activeChat?.id) {
      sendMessage("call:request", { conversationId: activeChat.id });
    }
  };

  // Создаём реф для аудио-элемента
  const audioRef = useRef<HTMLAudioElement>(null);

  // Подписываемся на изменения removeProducer
  useEffect(() => {
    if (Object.keys(removeProducer).length > 0 && audioRef.current) {
      // Берём первый аудио-поток (для 1-на-1 этого достаточно)
      const firstAudio = Object.values(removeProducer)[0]?.audio;
      if (firstAudio && firstAudio.srcObject) {
        audioRef.current.srcObject = firstAudio.srcObject;
        // Пытаемся воспроизвести (может потребоваться клик)
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
            <button onClick={() => clickToCall()}>Позвонить</button>
          </div>

          <div className={styles.wrapper_messages}>
            <div>Сообщения</div>
            <div>В будущих обновлениях</div>
          </div>
        </>
      )}
    </div>
  );
}
