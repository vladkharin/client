import { useChatStore } from "@/store/modules/chat";
import styles from "./chatList.module.css";
import { CHAT } from "@/types/types";
import { useSocketStore, useUserStore } from "@/store";
import { REQUESTS } from "@/commands/commands";

export default function ChatList() {
  const { chats, setActiveChat, activeChat, setMessages } = useChatStore(); // Достаем activeChat из стора
  const { user_id } = useUserStore();
  const { sendMessage } = useSocketStore();

  const chatClicked = async (chat: CHAT) => {
    setActiveChat(chat);
    const response = await sendMessage(REQUESTS.messageHistory, { conversationId: chat.id, userId: user_id });

    setMessages(response.messages);
  };

  return (
    <div className={styles.chats_wrapper}>
      <div className={styles.titles}>
        <p>Личные сообщения</p>
      </div>

      {chats?.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", padding: "10px" }}>Нет чатов</p>
      ) : (
        chats?.map((chat) => {
          const otherMember = chat.interlocutor;
          const isActive = activeChat?.id === chat.id;

          console.log(otherMember);
          return (
            <div
              key={chat?.id}
              className={`${styles.chat_item} ${isActive ? styles.chat_item_active : ""}`}
              onClick={() => chatClicked(chat)}
            >
              <div className={styles.username}>@{otherMember?.username}</div>
            </div>
          );
        })
      )}
    </div>
  );
}
