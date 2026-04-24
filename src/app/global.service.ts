import { useUserStore } from "@/store";
import { useChatStore } from "@/store/modules/chat";

export const findUserusername = (conversationId: number) => {
  const { chats } = useChatStore.getState();

  const necessaryChat = chats?.find((chat) => chat.id === conversationId);
  console.log(necessaryChat?.interlocutor);
  return necessaryChat?.interlocutor;
};
