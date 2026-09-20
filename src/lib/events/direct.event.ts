import { NOTIFICATIONS } from "@/commands/commands";
import { useChatStore } from "@/store";
import { Socket } from "socket.io-client";

export const DirectEvents = (socket: Socket) => {
  // Пример: обработка списка чатов
  socket.off("dm:list");
  socket.on("dm:list", (data) => {
    if ("response" in data) {
      console.log("📥 Получен список чатов:", data.response);

      useChatStore.getState().setChats(data.response);
    } else if ("error" in data) {
      console.error("❌ Ошибка загрузки чатов:", data.error);
    }
  });

  socket.off(NOTIFICATIONS.directChatNew);
  socket.on(NOTIFICATIONS.directChatNew, (data) => {
    const { onNewChat } = useChatStore.getState();

    onNewChat(data);
  });

  socket.off("presence:online_users");
  socket.on("presence:online_users", (userIds: number[]) => {
    if (Array.isArray(userIds)) {
      useChatStore.getState().setOnlineUserIds(userIds);
    }
  });

  socket.off(NOTIFICATIONS.userStatus);
  socket.on(NOTIFICATIONS.userStatus, (data: { userId: number; isOnline?: boolean; lastSeenAt?: string }) => {
    if (data && typeof data.userId === "number") {
      useChatStore.getState().setUserOnlineStatus(data.userId, !!data.isOnline, data.lastSeenAt);
    }
  });
};
