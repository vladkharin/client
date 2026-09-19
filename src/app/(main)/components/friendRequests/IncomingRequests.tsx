import { REQUESTS } from "@/commands/commands";
import styles from "./incomingRequests.module.css";
import { useSocketStore, useUserStore } from "@/store";

export default function IncomingRequestsModal() {
  const { sendMessage } = useSocketStore();
  const { friendRequests, setFriendRequestState, removeFriendRequest, addFriend } = useUserStore();

  const acceptFriendRequest = async (targetId: number) => {
    const result = await sendMessage(REQUESTS.friendRespond, { senderId: targetId, accept: true });

    removeFriendRequest(result.friend.id, "incoming");

    addFriend(result.friend);
  };

  const closeModal = () => {
    setFriendRequestState(false);
  };

  return (
    <div className={styles.background}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h2>Заявки в друзья</h2>
          <button className={styles.close_btn} onClick={closeModal}>
            Закрыть
          </button>
        </div>

        <div className={styles.requestList}>
          {!friendRequests?.incoming || friendRequests.incoming.length === 0 ? (
            <p className={styles.no_requests}>Новых заявок пока нет</p>
          ) : (
            friendRequests.incoming.map((item: any, idx) => {
              if (!item) return null;
              const id = item.id ?? item.user?.id ?? item.from?.id;
              const username = item.username ?? item.user?.username ?? item.from?.username ?? "пользователь";

              return (
                <div key={id || idx} className={styles.requestItem}>
                  <p>@{username}</p>
                  <button onClick={() => acceptFriendRequest(id)} className={styles.acceptButton}>
                    Принять
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
