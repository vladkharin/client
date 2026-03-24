import { useEffect } from "react";
import styles from "./finderModal.module.css";
import { useFinderStore, useSocketStore } from "@/store";

export default function FinderModal() {
  const { sendMessage } = useSocketStore();
  const { usersList, setUsers, setState } = useFinderStore();

  useEffect(() => {
    console.log(usersList);
  });
  const findFriend = (e) => {
    if (e.target.value) {
      sendMessage("users:find", { name: e.target.value });
    } else {
      setUsers(null);
    }
  };

  const sendFriendRequest = (targetId: number) => {
    sendMessage("friend:request", { targetId });
  };

  const closeModal = () => {
    setState(false);
  };
  return (
    <div className={styles.background}>
      <div className={styles.wrapper}>
        <button onClick={closeModal}>Закрыть</button>
        <input type="text" className={styles.input} onInput={(e) => findFriend(e)} />
        {usersList === null ? (
          <p>Нет людей с таким именем</p>
        ) : (
          usersList?.map((user) => (
            <div key={user.id}>
              <p>{user.username}</p>
              <button onClick={() => sendFriendRequest(user.id)}>Добавить</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
