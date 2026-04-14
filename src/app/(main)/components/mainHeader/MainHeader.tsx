import { useFinderStore, useUserStore } from "@/store";
import styles from "./header.module.css";

export default function MainHeader() {
  const { logout, setFriendRequestState, friendRequests, setFriendListState } = useUserStore();
  const { setState } = useFinderStore();

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
  return (
    <div className={styles.wrapper}>
      {/* Логотип или название можно добавить сюда */}
      <button onClick={openFinderModal}>Поиск</button>

      {friendRequests.incoming.length > 0 && (
        <button className={styles.badge_button} onClick={openFriendRequests}>
          Заявки в друзья ({friendRequests.incoming.length})
        </button>
      )}

      <button onClick={openFriendListModal}>Друзья</button>

      <button onClick={logOutOfYourAccount}>Выход</button>
    </div>
  );
}
