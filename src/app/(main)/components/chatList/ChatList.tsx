import { useChatStore } from "@/store/modules/chat";
import styles from "./chatList.module.css";
import { CHAT } from "@/types/types";
import { useSocketStore, useUserStore } from "@/store";
import { REQUESTS } from "@/commands/commands";

export default function ChatList() {
  const { chats, setActiveChat } = useChatStore();
  const { user_id } = useUserStore();
  const { sendMessage } = useSocketStore();

  const chatClicked = (chat: CHAT) => {
    setActiveChat(chat);

    sendMessage(REQUESTS.messageHistory, { conversationId: chat.id, userId: user_id });
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
            const otherMember = chat.members.find((member) => member.userId !== user_id);

            return (
              <div key={chat?.id} className={styles.chat_item} onClick={() => chatClicked(chat)}>
                <div>
                  {otherMember?.user?.name} {otherMember?.user?.surname}
                </div>
                <div>@{otherMember?.username}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
