import { useChatStore } from "@/store/modules/chat";
import styles from "./chatList.module.css";
import { CHAT } from "@/types/types";

export default function ChatList() {
  const { chats, setActiveChat } = useChatStore();

  const chatClicked = (chat: CHAT) => {
    setActiveChat(chat);
  };
  return (
    <div>
      <h2>Чаты</h2>
      {chats?.length === 0 ? (
        <p>Нет чатов</p>
      ) : (
        <div className={styles.chats_wrapper}>
          {chats?.map((chat) => {
            // Определяем собеседника (в DIRECT-чате — другой участник)
            const otherMember = chat.members.find(
              (member) => member.user.username !== "Vladikkkk23", // ← ваш username
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
