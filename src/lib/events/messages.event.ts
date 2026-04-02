import { NOTIFICATIONS, REQUESTS } from "@/commands/commands";
import { MessageChat, useChatStore } from "@/store/modules/chat";
import { Socket } from "socket.io-client";

export const MessagesEvents = (socket: Socket) => {
  socket.on(NOTIFICATIONS.messageNew, (data: MessageChat) => {
    const { addMessage, activeChat } = useChatStore.getState();

    if (activeChat) {
      addMessage(data);
    }
  });

  socket.on(REQUESTS.messageHistory, (data: { response: any; id: number }) => {
    const { setMessages } = useChatStore.getState();

    setMessages(data.response.messages);
  });
};
