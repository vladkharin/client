import { useChatStore } from "@/store/modules/chat";
import styles from "./chatList.module.css";
import { CHAT } from "@/types/types";
import { useSocketStore, useUserStore } from "@/store";
import { REQUESTS } from "@/commands/commands";

export default function ChatList() {
  const { chats, setActiveChat, activeChat, setMessages, isChatsLoading, setIsMessagesLoading } = useChatStore();
  const { user_id } = useUserStore();
  const { sendMessage } = useSocketStore();

  const chatClicked = async (chat: CHAT) => {
    setActiveChat(chat);

    if (chat?.isTemporary) {
      setMessages([]);
      return;
    }

    setIsMessagesLoading(true);
    try {
      const response = await sendMessage(REQUESTS.messageHistory, { conversationId: chat.id, userId: user_id });
      if (response?.messages) {
        setMessages(response.messages);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error("Ошибка загрузки сообщений:", err);
      setIsMessagesLoading(false);
    }
  };

  const directChats = chats?.filter((c) => c.type !== "GROUP") || [];
  const groupChats = chats?.filter((c) => c.type === "GROUP") || [];

  return (
    <div className={styles.chats_wrapper}>
      {/* Скелетоны при первой загрузке */}
      {isChatsLoading ? (
        <>
          <div className={styles.loading_hint}>
            <div className={styles.spinner} />
            <span>Загрузка диалогов...</span>
          </div>
          {[1, 2, 3, 4, 5].map((key) => (
            <div key={key} className={styles.skeleton_item}>
              <div className={styles.skeleton_avatar} />
              <div className={styles.skeleton_text_group}>
                <div className={styles.skeleton_title} />
                <div className={styles.skeleton_subtitle} />
              </div>
            </div>
          ))}
        </>
      ) : (
        <>
          {/* Групповые чаты */}
          {groupChats.length > 0 && (
            <>
              <div className={styles.titles}>
                <p>Группы ({groupChats.length})</p>
              </div>
              {groupChats.map((chat) => {
                const isActive = activeChat?.id === chat.id;

                return (
                  <div
                    key={chat.id}
                    className={`${styles.chat_item} ${isActive ? styles.chat_item_active : ""}`}
                    onClick={() => chatClicked(chat)}
                  >
                    <div className={styles.group_header}>
                      <span className={styles.group_icon}>👥</span>
                      <div className={styles.group_name}>{chat.name || "Группа"}</div>
                    </div>
                    {chat.membersCount !== undefined && (
                      <div className={styles.group_meta}>
                        {chat.membersCount} {chat.membersCount === 1 ? "участник" : chat.membersCount < 5 ? "участника" : "участников"}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* Личные сообщения */}
          <div className={styles.titles}>
            <p>Личные сообщения</p>
          </div>

          {directChats.length === 0 && groupChats.length === 0 ? (
            <div className={styles.empty_state}>
              <div className={styles.empty_icon}>💬</div>
              <div className={styles.empty_title}>Пока нет диалогов</div>
              <div className={styles.empty_desc}>Найдите друзей через кнопку «Поиск» вверху и начните общение!</div>
            </div>
          ) : directChats.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", padding: "10px", fontSize: "13px" }}>Нет личных диалогов</p>
          ) : (
            directChats.map((chat) => {
              const otherMember = chat.interlocutor;
              const isActive = activeChat?.id === chat.id;

              return (
                <div
                  key={chat.id}
                  className={`${styles.chat_item} ${isActive ? styles.chat_item_active : ""}`}
                  onClick={() => chatClicked(chat)}
                >
                  <div className={styles.username}>@{otherMember?.username || "пользователь"}</div>
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
