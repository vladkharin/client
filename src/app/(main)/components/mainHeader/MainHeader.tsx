import { useState, useEffect } from "react";
import { useChatStore, useFinderStore, useUserStore } from "@/store";
import { requestNotificationPermission } from "@/lib/firebase";
import styles from "./header.module.css";

export default function MainHeader() {
  const {
    logout,
    setFriendRequestState,
    friendRequests,
    setFriendListState,
    setProfileModalOpen,
    username,
  } = useUserStore();
  const { setCreateGroupModalOpen } = useChatStore();
  const { setState } = useFinderStore();
  const [notifGranted, setNotifGranted] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifGranted(Notification.permission === "granted");
    }
  }, []);

  const handleEnableNotifications = async () => {
    const token = await requestNotificationPermission();
    if (token || (typeof window !== "undefined" && Notification.permission === "granted")) {
      setNotifGranted(true);
    }
  };

  const openFinderModal = () => {
    setState(true);
  };

  const logOutOfYourAccount = () => {
    logout();
  };

  const openFriendRequests = () => {
    setFriendRequestState(true);
  };

  const openFriendListModal = () => {
    setFriendListState(true);
  };

  const openCreateGroupModal = () => {
    setCreateGroupModalOpen(true);
  };

  const openProfile = () => {
    setProfileModalOpen(true);
  };

  return (
    <div className={styles.wrapper}>
      <button onClick={openFinderModal}>Поиск</button>

      {friendRequests.incoming.length > 0 && (
        <button className={styles.badge_button} onClick={openFriendRequests}>
          Заявки ({friendRequests.incoming.length})
        </button>
      )}

      <button onClick={openFriendListModal}>Друзья</button>
      <button onClick={openCreateGroupModal}>+ Группа</button>

      <div className={styles.rightGroup}>
        {!notifGranted && (
          <button
            className={styles.profileBtn}
            onClick={handleEnableNotifications}
            title="Включить Push-уведомления"
          >
            🔔 Включить push
          </button>
        )}
        <button className={styles.profileBtn} onClick={openProfile}>
          👤 {username ? `@${username}` : "Профиль"}
        </button>
        <button className={styles.logoutBtn} onClick={logOutOfYourAccount}>
          Выход
        </button>
      </div>
    </div>
  );
}

