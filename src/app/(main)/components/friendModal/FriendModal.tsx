// components/friendModal/FriendModal.tsx
import { useSocketStore, useChatStore, useUserStore } from "@/store";
import { useRouter } from "next/navigation";
import styles from "./friendModal.module.css";

export default function FriendModal() {
  const router = useRouter();
  const { setFriendListState, friendList } = useUserStore();
  const { findOrCreateDirectChat, setActiveChat } = useChatStore();

  const handleWriteToFriend = (userId: number, username: string) => {
    const chat = findOrCreateDirectChat(userId, username);
    setActiveChat(chat);
    setFriendListState(false);

    if (chat.isTemporary) {
      startTemporaryChatCleanup(chat.id);
    }
  };

  const closeModal = () => {
    setFriendListState(false);
  };

  return (
    <div className={styles.background}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h2>Ваши друзья</h2>
          <button className={styles.close_btn} onClick={closeModal}>
            Закрыть
          </button>
        </div>

        <div className={styles.friendList}>
          {friendList?.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: "20px" }}>Список друзей пуст</p>
          ) : (
            friendList?.map((user) => (
              <div key={user.id} className={styles.friendItem}>
                <p>@{user.username}</p>
                <button onClick={() => handleWriteToFriend(user.id, user.username)} className={styles.writeButton}>
                  Написать
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// 🔹 Таймер очистки временных чатов
const TEMPORARY_CHAT_TIMEOUT = 5 * 60 * 1000; // 5 минут

const startTemporaryChatCleanup = (chatId: number) => {
  // Очищаем предыдущий таймер для этого чата (если был)
  const existingTimer = (window as any).__tempChatTimers?.[chatId];
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Создаём новый таймер
  const timer = setTimeout(() => {
    const { removeTemporaryChat } = useChatStore.getState();
    const { messages } = useChatStore.getState();

    // Проверяем, есть ли сообщения в чате
    const hasMessages = messages.some((m) => m.conversationId === chatId);

    if (!hasMessages) {
      // Если сообщений нет — удаляем чат
      removeTemporaryChat(chatId);
      console.log("⏰ Temporary chat auto-removed:", chatId);
    }
  }, TEMPORARY_CHAT_TIMEOUT);

  // Сохраняем ссылку на таймер
  if (!(window as any).__tempChatTimers) {
    (window as any).__tempChatTimers = {};
  }
  (window as any).__tempChatTimers[chatId] = timer;
};

// 🔹 Очистка таймера при отправке сообщения (вызывать в ChatWindow)
export const cancelTemporaryChatCleanup = (chatId: number) => {
  const existingTimer = (window as any).__tempChatTimers?.[chatId];
  if (existingTimer) {
    clearTimeout(existingTimer);
    delete (window as any).__tempChatTimers[chatId];
    console.log("⏹️ Temporary chat cleanup cancelled:", chatId);
  }
};
