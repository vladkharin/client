import { NOTIFICATIONS, REQUESTS } from "@/commands/commands";
import { MessageChat, useChatStore } from "@/store/modules/chat";
import { Socket } from "socket.io-client";

export const MessagesEvents = (socket: Socket) => {
  socket.off(NOTIFICATIONS.messageNew);
  socket.on(NOTIFICATIONS.messageNew, (data: MessageChat) => {
    const { addMessage, activeChat, updateChatLastMessage } = useChatStore.getState();

    if (data.conversationId) {
      updateChatLastMessage(data.conversationId, data);
    }

    if (activeChat && activeChat.id === data.conversationId) {
      addMessage(data);
    }
  });

  socket.off(REQUESTS.messageHistory);
  socket.on(REQUESTS.messageHistory, (data: { response: any; id: number }) => {
    const { setMessages } = useChatStore.getState();

    if (data?.response?.messages) {
      setMessages(data.response.messages);
    }
  });
};
