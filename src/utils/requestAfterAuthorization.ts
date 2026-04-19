import { useChatStore, useSocketStore, useUserStore } from "@/store";

export const requestAfterAuthorization = async () => {
  const { sendMessage } = useSocketStore.getState();
  const { setChats } = useChatStore.getState();
  const { setFriendList, setFriendRequest } = useUserStore.getState();

  try {
    // Теперь они выполнятся по порядку или параллельно,
    // даже если сокет ещё в процессе "рукопожатия"
    const [dm, friends, incoming] = await Promise.all([
      sendMessage("dm:list", {}),
      sendMessage("friend:list", {}),
      sendMessage("friend:incoming", {}),
    ]);

    if (dm) setChats(dm);

    if (friends) setFriendList(friends);

    if (incoming) setFriendRequest(incoming, "incoming");

    console.log("Данные загружены:", { dm, friends, incoming });
  } catch (e) {
    console.error("Ошибка при первичной загрузке:", e);
  }
};
