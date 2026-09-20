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

export interface MessageReply {
  id: number;
  content: string;
  imageUrl?: string | null;
  sender: { id: number; username: string };
}

export interface MessageChat {
  id: number;
  content: string;
  imageUrl?: string | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  replyToId?: number | null;
  replyTo?: MessageReply | null;
  conversationId: number;
  createdAt: string;
  sender: { id: number; username: string };
  senderId: number;
}

interface CHAT_STATE {
  chats: CHAT[] | null;
  activeChat: CHAT | null;
  inComingCall: IncomingCall | null;
  acceptedCall: AcceptedCall | null;
  messages: MessageChat[];
  isChatsLoading: boolean;
  isMessagesLoading: boolean;
  createGroupModalOpen: boolean;
  typingUsers: Record<number, string[]>;
  setIsChatsLoading: (loading: boolean) => void;
  setIsMessagesLoading: (loading: boolean) => void;
  setCreateGroupModalOpen: (open: boolean) => void;
  setChats: (chats: CHAT[]) => void;
  addChat: (chat: CHAT) => void;
  setActiveChat: (chat: CHAT) => void;
  setIncomingCall: (inComingCall: IncomingCall | null) => void;
  setAcceptedCall: (call: AcceptedCall) => void;
  clearAcceptedCall: () => void;
  setMessages: (messages: MessageChat[]) => void;
  addMessage: (message: MessageChat) => void;
  updateMessage: (messageId: number, content: string, editedAt?: string) => void;
  deleteMessage: (messageId: number) => void;
  setUserTyping: (conversationId: number, username: string, isTyping: boolean) => void;
  prependMessages: (messages: MessageChat[]) => void;

  findOrCreateDirectChat: (userId: number, username: string) => CHAT;
  removeTemporaryChat: (chatId: number) => void;
  replaceTemporaryChat: (tempId: number, realChat: CHAT) => void;
  updateChatLastMessage: (chatId: number, message: MessageChat) => void;
  onNewChat: (newChat: CHAT) => void;
}

export const useChatStore = create<CHAT_STATE>()(
  devtools(
    (set, get) => ({
      chats: null,
      activeChat: null,
      inComingCall: null,
      acceptedCall: null,
      messages: [],
      isChatsLoading: true,
      isMessagesLoading: false,
      createGroupModalOpen: false,
      typingUsers: {},
      setIsChatsLoading: (isChatsLoading: boolean) => set({ isChatsLoading }),
      setIsMessagesLoading: (isMessagesLoading: boolean) => set({ isMessagesLoading }),
      setCreateGroupModalOpen: (open: boolean) => set({ createGroupModalOpen: open }),
      setChats: (chats: CHAT[]) => set({ chats, isChatsLoading: false }),
      setActiveChat: (chat: CHAT) => set({ activeChat: chat }),
      setIncomingCall: (inComingCall: IncomingCall | null) => set({ inComingCall }),
      setAcceptedCall: (call) => set({ acceptedCall: call }),
      clearAcceptedCall: () => set({ acceptedCall: null }),
      setMessages: (messages: MessageChat[]) => set({ messages, isMessagesLoading: false }),

      updateMessage: (messageId: number, content: string, editedAt?: string) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageId ? { ...m, content, editedAt: editedAt || new Date().toISOString() } : m,
          ),
        })),

      deleteMessage: (messageId: number) =>
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== messageId),
        })),

      setUserTyping: (conversationId: number, username: string, isTyping: boolean) =>
        set((state) => {
          const currentTypers = state.typingUsers[conversationId] || [];
          const updated = isTyping
            ? Array.from(new Set([...currentTypers, username]))
            : currentTypers.filter((u) => u !== username);
          return {
            typingUsers: { ...state.typingUsers, [conversationId]: updated },
          };
        }),

      addMessage: (message: MessageChat) =>
        set((state) => {
          if (state.messages?.some((m) => m.id === message.id)) {
            return state;
          }
          return {
            messages: [...(state?.messages ?? []), message],
          };
        }),

      addChat: (chat: CHAT) =>
        set((state) => {
          if (state.chats?.some((c) => c.id === chat.id)) return state;
          return {
            chats: state.chats ? [chat, ...state.chats] : [chat],
          };
        }),

      prependMessages: (messages: MessageChat[]) =>
        set((state) => ({
          messages: [...messages, ...state.messages],
        })),

      findOrCreateDirectChat: (userId: number, username: string) => {
        const { chats } = get();

        // 1. Ищем существующий DIRECT чат с этим пользователем по interlocutor.id
        const existingChat = chats?.find((chat) => chat.interlocutor?.id === userId);

        if (existingChat) {
          console.log("✅ Found existing chat:", existingChat.id);
          return existingChat;
        }

        // 2. Создаём временный чат в новом формате
        const temporaryChat: CHAT & { isTemporary: boolean } = {
          id: Date.now(), // Временный ID (TIMESTAMP)
          updatedAt: new Date().toISOString(),
          lastMessage: null,
          isTemporary: true, // Флаг для логики удаления
          interlocutor: {
            id: userId,
            username: username,
            name: null, // Пока нет данных
            surname: null, // Пока нет данных
          },
        };

        console.log("🆕 Created temporary chat:", temporaryChat.id);

        // Добавляем в список чатов
        set((state) => ({
          chats: state.chats ? [temporaryChat, ...state.chats] : [temporaryChat],
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

      replaceTemporaryChat: (tempId: number, realChat: CHAT) => {
        set((state) => {
          const isUpdatingActive = state.activeChat?.id === tempId;

          // Заменяем в списке чатов
          const newChats = state.chats?.map((chat) => (chat.id === tempId ? { ...realChat, isTemporary: false } : chat)) ?? null;

          return {
            chats: newChats,
            // Если этот чат сейчас открыт — обновляем и активный чат
            activeChat: isUpdatingActive ? { ...realChat, isTemporary: false } : state.activeChat,
          };
        });
      },

      // 🔹 Обновить последнее сообщение в чате
      updateChatLastMessage: (chatId: number, message: MessageChat) => {
        set((state) => ({
          chats:
            state.chats?.map((chat) => {
              if (chat.id === chatId) {
                return {
                  ...chat,
                  updatedAt: message.createdAt, // Обновляем дату чата на дату сообщения
                  lastMessage: {
                    text: message.content, // Конвертируем content в text
                    createdAt: message.createdAt,
                  },
                };
              }
              return chat;
            }) ?? null,
        }));
      },

      onNewChat: (newChat: CHAT) => {
        set((state) => {
          // Проверяем, нет ли уже такого чата (защита от дублей)
          const exists = state.chats?.some((c) => c.id === newChat.id);
          if (exists) return state;

          return {
            // Добавляем новый чат в начало списка
            chats: state.chats ? [newChat, ...state.chats] : [newChat],
          };
        });
      },
    }),
    {
      name: "chats",
    },
  ),
);
