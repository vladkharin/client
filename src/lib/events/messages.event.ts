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

  socket.off(NOTIFICATIONS.messageUpdated);
  socket.on(NOTIFICATIONS.messageUpdated, (data: MessageChat) => {
    const { updateMessage } = useChatStore.getState();
    if (data?.id) {
      updateMessage(data.id, data.content, data.editedAt || undefined);
    }
  });

  socket.off(NOTIFICATIONS.messageDeleted);
  socket.on(NOTIFICATIONS.messageDeleted, (data: { messageId: number; conversationId: number }) => {
    const { deleteMessage } = useChatStore.getState();
    if (data?.messageId) {
      deleteMessage(data.messageId);
    }
  });

  socket.off(NOTIFICATIONS.userTyping);
  socket.on(NOTIFICATIONS.userTyping, (data: { userId: number; username: string; conversationId: number; isTyping: boolean }) => {
    const { setUserTyping } = useChatStore.getState();
    if (data?.conversationId && data?.username) {
      setUserTyping(data.conversationId, data.username, data.isTyping);
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

