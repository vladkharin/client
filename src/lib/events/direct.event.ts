import { NOTIFICATIONS } from "@/commands/commands";
import { useChatStore } from "@/store";
import { Socket } from "socket.io-client";

export const DirectEvents = (socket: Socket) => {
  // Пример: обработка списка чатов
  socket.on("dm:list", (data) => {
    if ("response" in data) {
      console.log("📥 Получен список чатов:", data.response);

      useChatStore.getState().setChats(data.response);
      // Обновляем Zustand-состояние
      //   useChatStore.getState().setChats(data.response);
    } else if ("error" in data) {
      console.error("❌ Ошибка загрузки чатов:", data.error);
    }
  });

  socket.on(NOTIFICATIONS.directChatNew, (data) => {
    const { addChat } = useChatStore.getState();

    addChat(data.response);
  });
};
