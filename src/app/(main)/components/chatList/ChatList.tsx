import { useChatStore } from "@/store/modules/chat";
import styles from "./chatList.module.css";
import { CHAT } from "@/types/types";
import { useUserStore } from "@/store";

export default function ChatList() {
  const { chats, setActiveChat } = useChatStore();
  const { user_id } = useUserStore();

  const chatClicked = (chat: CHAT) => {
    setActiveChat(chat);
  };

  return (
    <div>
      <div className={styles.titles}>
        <p>Чаты</p>
      </div>
      {chats?.length === 0 ? (
        <p>Нет чатов</p>
      ) : (
        <div className={styles.chats_wrapper}>
          {chats?.map((chat) => {
            // Определяем собеседника (в DIRECT-чате — другой участник)
            const otherMember = chat.members.find(
              (member) => member.userId !== user_id, // ← ваш username
            );

            return (
              <div key={chat.id} className={styles.chat_item} onClick={() => chatClicked(chat)}>
                <div>
                  {otherMember?.user.name} {otherMember?.user.surname}
                </div>
                <div>@{otherMember?.user.username}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
