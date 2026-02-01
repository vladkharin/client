import { CHAT } from "@/types/types";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface AcceptedCall {
  callerId: number;
  conversationId: number;
}

interface IncomingCall {
  callerId: number;
  conversationId: number;
}

interface CHAT_STATE {
  chats: CHAT[] | null;
  activeChat: CHAT | null;
  inComingCall: IncomingCall | null;
  acceptedCall: AcceptedCall | null;
  setChats: (chats: CHAT[]) => void;
  setActiveChat: (chat: CHAT) => void;
  setIncomingCall: (inComingCall: IncomingCall) => void;
  setAcceptedCall: (call: AcceptedCall) => void;
  clearAcceptedCall: () => void;
}

export const useChatStore = create<CHAT_STATE>()(
  devtools(
    (set) => ({
      chats: null,
      activeChat: null,
      inComingCall: null,
      acceptedCall: null,
      setChats: (chats: CHAT[]) => set({ chats }),
      setActiveChat: (chat: CHAT) => set({ activeChat: chat }),
      setIncomingCall: (inComingCall: IncomingCall) => set({ inComingCall }),
      setAcceptedCall: (call) => set({ acceptedCall: call }),
      clearAcceptedCall: () => set({ acceptedCall: null }),
    }),
    {
      name: "chats",
    },
  ),
);
