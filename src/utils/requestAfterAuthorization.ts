import { useChatStore, useSocketStore, useUserStore } from "@/store";

export const requestAfterAuthorization = async () => {
  const { sendMessage } = useSocketStore.getState();
  const { setChats } = useChatStore.getState();
  const { setFriendList, setFriendRequest } = useUserStore.getState();

  try {
    // Теперь они выполнятся по порядку или параллельно,
    // даже если сокет ещё в процессе "рукопожатия"
    const [dm, friends, incoming, servers] = await Promise.all([
      sendMessage("dm:list", {}),
      sendMessage("friend:list", {}),
      sendMessage("friend:incoming", {}),
      sendMessage("server:list", {}),
    ]);

    if (dm) setChats(dm);

    if (friends) setFriendList(friends);

    if (incoming) setFriendRequest(incoming, "incoming");

    if (servers) {
      const serverList = Array.isArray(servers) ? servers : (servers as any)?.response || [];
      useChatStore.getState().setServers(serverList);
    }

    console.log("Данные загружены:", { dm, friends, incoming, servers });
  } catch (e) {
    console.error("Ошибка при первичной загрузке:", e);
  }
};
