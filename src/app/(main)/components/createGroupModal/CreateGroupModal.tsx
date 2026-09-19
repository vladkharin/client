"use client";

import { useState } from "react";
import { useChatStore, useSocketStore, useUserStore } from "@/store";
import styles from "./createGroupModal.module.css";
import { REQUESTS } from "@/commands/commands";
import { CHAT } from "@/types/types";

export default function CreateGroupModal() {
  const { setCreateGroupModalOpen, setActiveChat, addChat, setMessages } = useChatStore();
  const { friendList } = useUserStore();
  const { sendMessage } = useSocketStore();

  const [groupName, setGroupName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleFriend = (friendId: number) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId],
    );
  };

  const closeModal = () => {
    setCreateGroupModalOpen(false);
  };

  const handleCreateGroup = async () => {
    const trimmedName = groupName.trim();
    if (!trimmedName || selectedFriends.length === 0 || isLoading) return;

    try {
      setIsLoading(true);
      const response = await sendMessage(REQUESTS.groupChatCreate, {
        name: trimmedName,
        participantIds: selectedFriends,
      });

      if (response && (response.conversationId || response.chat)) {
        const createdChat: CHAT = response.chat || {
          id: response.conversationId,
          type: "GROUP",
          name: trimmedName,
          updatedAt: new Date().toISOString(),
          lastMessage: null,
          interlocutor: null,
          membersCount: selectedFriends.length + 1,
        };

        addChat(createdChat);
        setActiveChat(createdChat);
        setMessages([]);
        closeModal();
      }
    } catch (e) {
      console.error("Ошибка при создании группы:", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.background}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h2>Создание группы</h2>
          <button className={styles.close_btn} onClick={closeModal}>
            ✕
          </button>
        </div>

        <div className={styles.input_group}>
          <label className={styles.input_label}>Название группы</label>
          <input
            className={styles.name_input}
            type="text"
            placeholder="Введите название..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            autoFocus
          />
        </div>

        <div className={styles.subtitle}>
          Выберите участников ({selectedFriends.length}):
        </div>

        <div className={styles.friendList}>
          {friendList?.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: "20px" }}>
              Список друзей пуст. Добавьте друзей для создания группы.
            </p>
          ) : (
            friendList?.map((user) => {
              const isSelected = selectedFriends.includes(user.id);
              return (
                <div
                  key={user.id}
                  className={`${styles.friendItem} ${isSelected ? styles.friendItemSelected : ""}`}
                  onClick={() => toggleFriend(user.id)}
                >
                  <p>@{user.username}</p>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={isSelected}
                    onChange={() => toggleFriend(user.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              );
            })
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={closeModal}>
            Отмена
          </button>
          <button
            className={styles.createButton}
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || selectedFriends.length === 0 || isLoading}
          >
            {isLoading ? "Создание..." : "Создать группу"}
          </button>
        </div>
      </div>
    </div>
  );
}
