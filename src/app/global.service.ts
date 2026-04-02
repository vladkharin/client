import { useUserStore } from "@/store";
import { useChatStore } from "@/store/modules/chat";

export const findUserusername = (conversationId: number) => {
  const { chats } = useChatStore.getState();
  const { user_id } = useUserStore.getState();

  const necessaryChat = chats?.find((chat) => chat.id === conversationId);
  console.log(necessaryChat?.members.find((member) => member.id !== user_id));
  return necessaryChat?.members.find((member) => member.id !== user_id);
};
