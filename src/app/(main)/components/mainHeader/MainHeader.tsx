import { useState, useEffect } from "react";
import { useChatStore, useFinderStore, useUserStore } from "@/store";
import { requestNotificationPermission } from "@/lib/firebase";
import styles from "./header.module.css";

import { toast } from "react-toastify";

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
      toast.success("Push-уведомления успешно включены!");
      if (typeof window !== "undefined" && "Notification" in window) {
        try {
          new Notification("CraftHive", {
            body: "Тестовое уведомление: всё работает отлично!",
            icon: "/icon.png",
          });
        } catch {}
      }
    } else if (typeof window !== "undefined" && Notification.permission === "denied") {
      toast.warn("Уведомления отключены в настройках браузера для этого сайта");
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className={styles.wrapper}>
      <div className={styles.leftSection}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>⚡</span>
          <span className={styles.brandTitle}>
            craft<span>Hive</span>
          </span>
        </div>

        <nav className={styles.navGroup}>
          <button
            className={styles.navButton}
            onClick={() => setState(true)}
            title="Поиск пользователей и чатов"
          >
            <span className={styles.btnIcon}>🔍</span>
            <span>Поиск</span>
          </button>

          <button
            className={styles.navButton}
            onClick={() => setFriendListState(true)}
            title="Список друзей"
          >
            <span className={styles.btnIcon}>👥</span>
            <span>Друзья</span>
          </button>

          {friendRequests.incoming.length > 0 && (
            <button
              className={`${styles.navButton} ${styles.badgeButton}`}
              onClick={() => setFriendRequestState(true)}
              title="Входящие заявки в друзья"
            >
              <span className={styles.btnIcon}>📩</span>
              <span>Заявки</span>
              <span className={styles.badge}>{friendRequests.incoming.length}</span>
            </button>
          )}

          <button
            className={styles.navButton}
            onClick={() => setCreateGroupModalOpen(true)}
            title="Создать новую группу"
          >
            <span className={styles.btnIcon}>➕</span>
            <span>Группа</span>
          </button>
        </nav>
      </div>

      <div className={styles.rightGroup}>
        {!notifGranted && (
          <button
            className={styles.notifBtn}
            onClick={handleEnableNotifications}
            title="Включить Push-уведомления"
          >
            <span>🔔</span>
            <span className={styles.notifText}>Push</span>
          </button>
        )}

        <button
          className={styles.profileBtn}
          onClick={() => setProfileModalOpen(true)}
          title="Открыть профиль"
        >
          <div className={styles.userAvatarSmall}>
            {getInitials(username)}
          </div>
          <span className={styles.userNameText}>
            {username ? `@${username}` : "Профиль"}
          </span>
        </button>

        <button
          className={styles.logoutBtn}
          onClick={() => logout()}
          title="Выйти из аккаунта"
        >
          <span>Выход</span>
        </button>
      </div>
    </header>
  );
}
