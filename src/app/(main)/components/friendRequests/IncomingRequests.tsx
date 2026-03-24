import styles from "./incomingRequests.module.css";
import { useSocketStore, useUserStore } from "@/store";

export default function IncomingRequestsModal() {
  const { sendMessage } = useSocketStore();
  const { friendRequests, setFriendRequestState } = useUserStore();

  const acceptFriendRequest = (targetId: number) => {
    sendMessage("friend:respond", { senderId: targetId, accept: true });
  };

  const closeModal = () => {
    setFriendRequestState(false);
  };

  return (
    <div className={styles.background}>
      <div className={styles.wrapper}>
        <button onClick={closeModal}>Закрыть</button>
        {friendRequests?.incoming?.map((user) => (
          <div key={user.id}>
            <p>{user.username}</p>
            <button onClick={() => acceptFriendRequest(user.id)}>Добавить</button>
          </div>
        ))}
      </div>
    </div>
  );
}
