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

export interface MessageChat {
  content: string;
  conversationId: number;
  createdAt: string;
  id: number;
  sender: { id: number; username: string };
  senderId: number;
}

interface CHAT_STATE {
  chats: CHAT[] | null;
  activeChat: CHAT | null;
  inComingCall: IncomingCall | null;
  acceptedCall: AcceptedCall | null;
  messages: MessageChat[];
  setChats: (chats: CHAT[]) => void;
  addChat: (chat: CHAT) => void;
  setActiveChat: (chat: CHAT) => void;
  setIncomingCall: (inComingCall: IncomingCall) => void;
  setAcceptedCall: (call: AcceptedCall) => void;
  clearAcceptedCall: () => void;
  setMessages: (messages: MessageChat[]) => void;
  addMessage: (message: MessageChat) => void;
  prependMessages: (messages: MessageChat[]) => void;

  findOrCreateDirectChat: (userId: number, username: string) => CHAT;
  removeTemporaryChat: (chatId: number) => void;
  updateChatLastMessage: (chatId: number, message: MessageChat) => void;
}

export const useChatStore = create<CHAT_STATE>()(
  devtools(
    (set, get) => ({
      chats: null,
      activeChat: null,
      inComingCall: null,
      acceptedCall: null,
      setChats: (chats: CHAT[]) => set({ chats }),
      setActiveChat: (chat: CHAT) => set({ activeChat: chat }),
      setIncomingCall: (inComingCall: IncomingCall) => set({ inComingCall }),
      setAcceptedCall: (call) => set({ acceptedCall: call }),
      clearAcceptedCall: () => set({ acceptedCall: null }),
      setMessages: (messages: MessageChat[]) => set({ messages }),

      addMessage: (message: MessageChat) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),

      addChat: (chat: CHAT) =>
        set((state) => ({
          // Если массив есть — добавляем в конец, иначе создаём новый с одним элементом
          chats: state.chats ? [...state.chats, chat] : [chat],
        })),

      prependMessages: (messages: MessageChat[]) =>
        set((state) => ({
          messages: [...messages, ...state.messages],
        })),

      findOrCreateDirectChat: (userId: number, username: string) => {
        const { chats } = get();

        // 1. Ищем существующий DIRECT чат с этим пользователем
        const existingChat = chats?.find((chat) => chat.type === "DIRECT" && chat.members?.some((m) => m.userId === userId));

        if (existingChat) {
          console.log("✅ Found existing chat:", existingChat.id);
          return existingChat;
        }

        // 2. Создаём временный чат
        const temporaryChat: CHAT = {
          id: Date.now(), // Временный ID
          type: "DIRECT",
          name: username,
          avatar: null,
          ownerId: userId,
          members: [{ userId, username }],
          isTemporary: true, // 👈 Помечаем как временный
          createdAt: new Date().toISOString(),
          unreadCount: 0,
        };

        console.log("🆕 Created temporary chat:", temporaryChat.id);

        // Добавляем в список чатов
        set((state) => ({
          chats: state.chats ? [...state.chats, temporaryChat] : [temporaryChat],
        }));

        return temporaryChat;
      },

      // 🔹 Удалить временный чат
      removeTemporaryChat: (chatId: number) => {
        const { activeChat } = get();

        set((state) => ({
          chats: state.chats?.filter((c) => c.id !== chatId) ?? null,
          activeChat: activeChat?.id === chatId ? null : activeChat,
        }));

        console.log("🗑️ Removed temporary chat:", chatId);
      },

      // 🔹 Обновить последнее сообщение в чате
      updateChatLastMessage: (chatId: number, message: MessageChat) => {
        set((state) => ({
          chats: state.chats?.map((chat) => (chat.id === chatId ? { ...chat, lastMessage: message } : chat)) ?? null,
        }));
      },
    }),
    {
      name: "chats",
    },
  ),
);
