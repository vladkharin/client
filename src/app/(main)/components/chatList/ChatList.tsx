import { useChatStore } from "@/store/modules/chat";
import styles from "./chatList.module.css";
import { CHAT } from "@/types/types";
import { useSocketStore, useUserStore } from "@/store";
import { REQUESTS } from "@/commands/commands";

// Deterministic gradient generator for avatars
function getAvatarGradient(str: string = "") {
  const gradients = [
    "linear-gradient(135deg, #f97316, #fb923c)",
    "linear-gradient(135deg, #6366f1, #a855f7)",
    "linear-gradient(135deg, #ec4899, #f43f5e)",
    "linear-gradient(135deg, #10b981, #14b8a6)",
    "linear-gradient(135deg, #3b82f6, #06b6d4)",
    "linear-gradient(135deg, #eab308, #f97316)",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

function getInitials(name?: string) {
  if (!name) return "?";
  return name.slice(0, 2).toUpperCase();
}

export default function ChatList() {
  const {
    chats,
    setActiveChat,
    activeChat,
    setMessages,
    isChatsLoading,
    setIsMessagesLoading,
  } = useChatStore();
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
      const response = await sendMessage(REQUESTS.messageHistory, {
        conversationId: chat.id,
        userId: user_id,
      });
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
    <aside className={styles.chats_wrapper}>
      {/* Скелетоны при первой загрузке */}
      {isChatsLoading ? (
        <div className={styles.skeleton_container}>
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
        </div>
      ) : (
        <>
          {/* Групповые чаты */}
          {groupChats.length > 0 && (
            <div className={styles.section}>
              <div className={styles.section_title}>
                <span>Группы</span>
                <span className={styles.count_badge}>{groupChats.length}</span>
              </div>
              <div className={styles.chats_list}>
                {groupChats.map((chat) => {
                  const isActive = activeChat?.id === chat.id;

                  return (
                    <div
                      key={chat.id}
                      className={`${styles.chat_item} ${
                        isActive ? styles.chat_item_active : ""
                      }`}
                      onClick={() => chatClicked(chat)}
                    >
                      <div
                        className={styles.chat_avatar}
                        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                      >
                        👥
                      </div>
                      <div className={styles.chat_content}>
                        <div className={styles.chat_name_row}>
                          <span className={styles.chat_name}>{chat.name || "Группа"}</span>
                        </div>
                        {chat.membersCount !== undefined && (
                          <span className={styles.chat_meta}>
                            {chat.membersCount}{" "}
                            {chat.membersCount === 1
                              ? "участник"
                              : chat.membersCount < 5
                              ? "участника"
                              : "участников"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Личные сообщения */}
          <div className={styles.section}>
            <div className={styles.section_title}>
              <span>Личные сообщения</span>
              {directChats.length > 0 && (
                <span className={styles.count_badge}>{directChats.length}</span>
              )}
            </div>

            {directChats.length === 0 && groupChats.length === 0 ? (
              <div className={styles.empty_state}>
                <div className={styles.empty_icon}>💬</div>
                <div className={styles.empty_title}>Пока нет диалогов</div>
                <div className={styles.empty_desc}>
                  Найдите друзей через кнопку «Поиск» вверху и начните общение!
                </div>
              </div>
            ) : directChats.length === 0 ? (
              <div className={styles.empty_minor}>Нет личных диалогов</div>
            ) : (
              <div className={styles.chats_list}>
                {directChats.map((chat) => {
                  const otherMember = chat.interlocutor;
                  const isActive = activeChat?.id === chat.id;
                  const username = otherMember?.username || "пользователь";

                  return (
                    <div
                      key={chat.id}
                      className={`${styles.chat_item} ${
                        isActive ? styles.chat_item_active : ""
                      }`}
                      onClick={() => chatClicked(chat)}
                    >
                      <div
                        className={styles.chat_avatar}
                        style={{ background: getAvatarGradient(username) }}
                      >
                        {getInitials(username)}
                      </div>
                      <div className={styles.chat_content}>
                        <div className={styles.chat_name_row}>
                          <span className={styles.chat_name}>@{username}</span>
                        </div>
                        <span className={styles.chat_status}>Нажмите, чтобы открыть</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
