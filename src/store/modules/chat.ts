import { CHAT, ServerItem } from "@/types/types";
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
  fileUrl?: string | null;
  fileName?: string | null;
  sender: { id: number; username: string };
}

export interface MessageReaction {
  id: number;
  messageId: number;
  userId: number;
  emoji: string;
  user?: { id: number; username: string };
}

export interface MessageChat {
  id: number;
  content: string;
  imageUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  audioDuration?: number | null;
  isPinned?: boolean;
  expiresAt?: string | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  replyToId?: number | null;
  replyTo?: MessageReply | null;
  reactions?: MessageReaction[];
  conversationId: number;
  createdAt: string;
  sender: { id: number; username: string; avatar?: string | null };
  senderId: number;
}

interface CHAT_STATE {
  chats: CHAT[] | null;
  activeChat: CHAT | null;
  servers: ServerItem[];
  activeServer: ServerItem | null;
  inComingCall: IncomingCall | null;
  acceptedCall: AcceptedCall | null;
  messages: MessageChat[];
  firstUnreadId: number | null;
  isChatsLoading: boolean;
  isMessagesLoading: boolean;
  createGroupModalOpen: boolean;
  createServerModalOpen: boolean;
  isMemberListOpen: boolean;
  typingUsers: Record<number, string[]>;
  onlineUserIds: number[];

  setIsChatsLoading: (loading: boolean) => void;
  setIsMessagesLoading: (loading: boolean) => void;
  setCreateGroupModalOpen: (open: boolean) => void;
  setCreateServerModalOpen: (open: boolean) => void;
  setIsMemberListOpen: (open: boolean) => void;
  toggleMemberList: () => void;
  setOnlineUserIds: (ids: number[]) => void;
  setUserOnlineStatus: (userId: number, isOnline: boolean, lastSeenAt?: string) => void;
  setChats: (chats: CHAT[]) => void;
  addChat: (chat: CHAT) => void;
  setActiveChat: (chat: CHAT | null) => void;
  setServers: (servers: ServerItem[]) => void;
  addServer: (server: ServerItem) => void;
  setActiveServer: (server: ServerItem | null) => void;
  updateServerChannel: (serverId: number, channel: CHAT) => void;
  deleteServerChannel: (serverId: number, channelId: number) => void;
  setIncomingCall: (inComingCall: IncomingCall | null) => void;
  setAcceptedCall: (call: AcceptedCall) => void;
  clearAcceptedCall: () => void;
  setMessages: (messages: MessageChat[]) => void;
  setFirstUnreadId: (id: number | null) => void;
  addMessage: (message: MessageChat) => void;
  updateMessage: (messageId: number, content: string, editedAt?: string) => void;
  deleteMessage: (messageId: number) => void;
  updateMessageReactions: (messageId: number, reactions: MessageReaction[]) => void;
  setPinnedMessage: (conversationId: number, pinnedMessage: any) => void;
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
      servers: [],
      activeServer: null,
      inComingCall: null,
      acceptedCall: null,
      messages: [],
      firstUnreadId: null,
      isChatsLoading: true,
      isMessagesLoading: false,
      createGroupModalOpen: false,
      createServerModalOpen: false,
      isMemberListOpen: true,
      typingUsers: {},
      onlineUserIds: [],

      setIsChatsLoading: (isChatsLoading: boolean) => set({ isChatsLoading }),
      setIsMessagesLoading: (isMessagesLoading: boolean) => set({ isMessagesLoading }),
      setCreateGroupModalOpen: (open: boolean) => set({ createGroupModalOpen: open }),
      setCreateServerModalOpen: (open: boolean) => set({ createServerModalOpen: open }),
      setIsMemberListOpen: (open: boolean) => set({ isMemberListOpen: open }),
      toggleMemberList: () => set((state) => ({ isMemberListOpen: !state.isMemberListOpen })),
      setOnlineUserIds: (ids: number[]) =>
        set((state) => {
          const onlineSet = new Set(ids);
          const updatedChats =
            state.chats?.map((c) => {
              if (c.interlocutor) {
                return {
                  ...c,
                  interlocutor: {
                    ...c.interlocutor,
                    isOnline: onlineSet.has(c.interlocutor.id),
                  },
                };
              }
              return c;
            }) || null;

          const updatedActiveChat = state.activeChat?.interlocutor
            ? {
                ...state.activeChat,
                interlocutor: {
                  ...state.activeChat.interlocutor,
                  isOnline: onlineSet.has(state.activeChat.interlocutor.id),
                },
              }
            : state.activeChat;

          return {
            onlineUserIds: ids,
            chats: updatedChats,
            activeChat: updatedActiveChat,
          };
        }),
      setUserOnlineStatus: (userId: number, isOnline: boolean, lastSeenAt?: string) =>
        set((state) => {
          const onlineUserIds = isOnline
            ? Array.from(new Set([...state.onlineUserIds, userId]))
            : state.onlineUserIds.filter((id) => id !== userId);

          const updatedChats =
            state.chats?.map((c) => {
              if (c.interlocutor && c.interlocutor.id === userId) {
                return {
                  ...c,
                  interlocutor: {
                    ...c.interlocutor,
                    isOnline,
                    ...(lastSeenAt && { lastSeenAt }),
                  },
                };
              }
              return c;
            }) || null;

          const updatedActiveChat =
            state.activeChat?.interlocutor && state.activeChat.interlocutor.id === userId
              ? {
                  ...state.activeChat,
                  interlocutor: {
                    ...state.activeChat.interlocutor,
                    isOnline,
                    ...(lastSeenAt && { lastSeenAt }),
                  },
                }
              : state.activeChat;

          return {
            onlineUserIds,
            chats: updatedChats,
            activeChat: updatedActiveChat,
          };
        }),
      setChats: (chats: CHAT[]) =>
        set((state) => {
          const onlineSet = new Set(state.onlineUserIds);
          const enhancedChats = chats.map((c) => {
            if (c.interlocutor) {
              return {
                ...c,
                interlocutor: {
                  ...c.interlocutor,
                  isOnline: c.interlocutor.isOnline ?? onlineSet.has(c.interlocutor.id),
                },
              };
            }
            return c;
          });
          return { chats: enhancedChats, isChatsLoading: false };
        }),
      setActiveChat: (chat: CHAT | null) =>
        set((state) => ({
          activeChat: chat,
          firstUnreadId: null,
          messages: state.activeChat?.id === chat?.id ? state.messages : [],
        })),
      setServers: (servers: ServerItem[]) => set({ servers }),
      addServer: (server: ServerItem) => set((state) => ({ servers: [...state.servers, server] })),
      setActiveServer: (server: ServerItem | null) => set({ activeServer: server }),
      updateServerChannel: (serverId: number, updatedChannel: CHAT) =>
        set((state) => {
          const newServers = state.servers.map((srv) => {
            if (srv.id === serverId) {
              return {
                ...srv,
                channels: srv.channels.map((c) => (c.id === updatedChannel.id ? { ...c, ...updatedChannel } : c)),
              };
            }
            return srv;
          });
          const newActiveServer =
            state.activeServer?.id === serverId
              ? {
                  ...state.activeServer,
                  channels: state.activeServer.channels.map((c) =>
                    c.id === updatedChannel.id ? { ...c, ...updatedChannel } : c,
                  ),
                }
              : state.activeServer;
          const newActiveChat =
            state.activeChat?.id === updatedChannel.id ? { ...state.activeChat, ...updatedChannel } : state.activeChat;

          return {
            servers: newServers,
            activeServer: newActiveServer,
            activeChat: newActiveChat,
          };
        }),
      deleteServerChannel: (serverId: number, channelId: number) =>
        set((state) => {
          const newServers = state.servers.map((srv) => {
            if (srv.id === serverId) {
              return {
                ...srv,
                channels: srv.channels.filter((c) => c.id !== channelId),
              };
            }
            return srv;
          });
          const newActiveServer =
            state.activeServer?.id === serverId
              ? {
                  ...state.activeServer,
                  channels: state.activeServer.channels.filter((c) => c.id !== channelId),
                }
              : state.activeServer;
          const newActiveChat = state.activeChat?.id === channelId ? null : state.activeChat;

          return {
            servers: newServers,
            activeServer: newActiveServer,
            activeChat: newActiveChat,
          };
        }),
      setIncomingCall: (inComingCall: IncomingCall | null) => set({ inComingCall }),
      setAcceptedCall: (call) => set({ acceptedCall: call }),
      clearAcceptedCall: () => set({ acceptedCall: null }),
      setMessages: (messages: MessageChat[]) => set({ messages, isMessagesLoading: false }),
      setFirstUnreadId: (firstUnreadId: number | null) => set({ firstUnreadId }),

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

      updateMessageReactions: (messageId: number, reactions: MessageReaction[]) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageId ? { ...m, reactions } : m,
          ),
        })),

      setPinnedMessage: (conversationId: number, pinnedMessage: any) =>
        set((state) => ({
          activeChat:
            state.activeChat?.id === conversationId
              ? { ...state.activeChat, pinnedMessage }
              : state.activeChat,
          chats:
            state.chats?.map((c) =>
              c.id === conversationId ? { ...c, pinnedMessage } : c,
            ) || null,
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
        const existingChat = chats?.find((chat) => chat.interlocutor?.id === userId);

        if (existingChat) {
          return existingChat;
        }

        const temporaryChat: CHAT & { isTemporary: boolean } = {
          id: Date.now(),
          updatedAt: new Date().toISOString(),
          lastMessage: null,
          isTemporary: true,
          interlocutor: {
            id: userId,
            username: username,
            name: null,
            surname: null,
          },
        };

        set((state) => ({
          chats: state.chats ? [temporaryChat, ...state.chats] : [temporaryChat],
        }));

        return temporaryChat;
      },

      removeTemporaryChat: (chatId: number) => {
        const { activeChat } = get();
        set((state) => ({
          chats: state.chats?.filter((c) => c.id !== chatId) ?? null,
          activeChat: activeChat?.id === chatId ? null : activeChat,
        }));
      },

      replaceTemporaryChat: (tempId: number, realChat: CHAT) => {
        set((state) => {
          const isUpdatingActive = state.activeChat?.id === tempId;
          const newChats = state.chats?.map((chat) => (chat.id === tempId ? { ...realChat, isTemporary: false } : chat)) ?? null;

          return {
            chats: newChats,
            activeChat: isUpdatingActive ? { ...realChat, isTemporary: false } : state.activeChat,
          };
        });
      },

      updateChatLastMessage: (chatId: number, message: MessageChat) => {
        set((state) => ({
          chats:
            state.chats?.map((chat) => {
              if (chat.id === chatId) {
                return {
                  ...chat,
                  updatedAt: message.createdAt,
                  lastMessage: {
                    text: message.content,
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
          const exists = state.chats?.some((c) => c.id === newChat.id);
          if (exists) return state;

          return {
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
