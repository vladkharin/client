import { CHAT } from "@/types/types";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface CHAT_STATE {
  chats: CHAT[] | null;
  activeChat: CHAT | null;
  inComingCall: number | null;
  setChats: (chats: CHAT[]) => void;
  setActiveChat: (chat: CHAT) => void;
  setIncomingCall: (chat_id: number) => void;
}

export const useChatStore = create<CHAT_STATE>()(
  devtools(
    (set) => ({
      chats: null,
      activeChat: null,
      inComingCall: null,
      setChats: (chats: CHAT[]) => set({ chats }),
      setActiveChat: (chat: CHAT) => set({ activeChat: chat }),
      setIncomingCall: (chat_id: number) => set({ inComingCall: chat_id }),
    }),
    {
      name: "chats",
    },
  ),
);
