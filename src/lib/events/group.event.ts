import { NOTIFICATIONS } from "@/commands/commands";
import { useChatStore } from "@/store";
import { CHAT } from "@/types/types";
import { Socket } from "socket.io-client";

export const GroupEvents = (socket: Socket) => {
  socket.off(NOTIFICATIONS.groupChatNew);
  socket.on(NOTIFICATIONS.groupChatNew, (data: CHAT) => {
    console.log("👥 Получен новый групповой чат:", data);
    const { onNewChat } = useChatStore.getState();
    onNewChat(data);
  });
};
