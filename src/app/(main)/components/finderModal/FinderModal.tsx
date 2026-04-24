import { FormEvent } from "react";
import styles from "./finderModal.module.css";
import { useFinderStore, useSocketStore } from "@/store";
import { REQUESTS } from "@/commands/commands";
import { toast } from "react-toastify";

export default function FinderModal() {
  const { sendMessage } = useSocketStore();
  const { usersList, setUsers, setState, setUser } = useFinderStore();

  const findFriend = async (e: FormEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    if (target.value) {
      const response = await sendMessage("users:find", { name: target.value });
      setUsers(response);
    } else {
      setUsers(null);
    }
  };

  const sendFriendRequest = async (targetId: number) => {
    try {
      const result = await sendMessage(REQUESTS.friendRequest, { targetId });

      if (result.success) {
        // Здесь обновляем список пользователей в сторе,
        // чтобы у юзера проставился флаг hasPendingRequest
        setUser(result.user);
        toast.success("Запрос отправлен!");
      } else if (result.exists) {
        toast.info("Вы уже отправляли запрос этому пользователю");
      }
    } catch (error) {
      toast.error("Не удалось отправить запрос");
    }
  };

  const closeModal = () => {
    setState(false);
  };

  // 1. Сначала определяем, ЧТО мы показываем
  let resultsContent;

  if (usersList === null) {
    // Еще ничего не искали
    resultsContent = <p className={styles.no_results}>Введите имя пользователя</p>;
  } else if (usersList.length === 0) {
    // Искали, но никого не нашли
    resultsContent = <p className={styles.no_results}>Никого не нашли :(</p>;
  } else {
    // Нашли людей
    resultsContent = (
      <div className={styles.results_list}>
        {usersList.map((user) => {
          // Определяем состояние кнопки
          const isFriend = user.isFriend;
          const isPending = user.hasPendingRequest;
          const isReceived = user.isRequestReceived;

          const isDisabled = isFriend || isPending;

          let buttonText = "Добавить";
          if (isFriend) buttonText = "В друзьях";
          else if (isPending) buttonText = "Запрос отправлен";

          return (
            <div key={user.id} className={styles.user_item}>
              <p className={styles.username}>@{user.username}</p>
              <button
                className={`${styles.add_btn} ${isDisabled ? styles.disabled_btn : ""}`}
                onClick={() => !isDisabled && sendFriendRequest(user.id)}
                disabled={isDisabled}
              >
                {buttonText}
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={styles.background}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h2>Поиск друзей</h2>
          <button className={styles.close_btn} onClick={closeModal}>
            Закрыть
          </button>
        </div>

        {/* 2. Используем переменную с контентом */}
        {resultsContent}

        {/* 3. Инпут вынесен в отдельный контейнер, чтобы быть внизу */}
        <div className={styles.input_container}>
          <input type="text" placeholder="Введите имя для поиска..." className={styles.input} onInput={(e) => findFriend(e)} autoFocus />
        </div>
      </div>
    </div>
  );
}
