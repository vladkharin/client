import { describe, it, expect, beforeEach } from "vitest";
import { useChatStore, MessageChat } from "../modules/chat";
import { CHAT } from "@/types/types";

describe("chatStore", () => {
  beforeEach(() => {
    useChatStore.setState({
      chats: [],
      activeChat: null,
      messages: [],
      inComingCall: null,
      createGroupModalOpen: false,
      isChatsLoading: false,
      isMessagesLoading: false,
    });
  });

  it("should set chats correctly", () => {
    const mockChats: CHAT[] = [
      {
        id: 1,
        type: "DIRECT",
        updatedAt: new Date().toISOString(),
        lastMessage: null,
        interlocutor: { id: 2, username: "alice", name: "Alice", surname: null },
      },
    ];

    useChatStore.getState().setChats(mockChats);
    expect(useChatStore.getState().chats).toEqual(mockChats);
  });

  it("should set active chat and manage messages", () => {
    const mockChat: CHAT = {
      id: 1,
      type: "DIRECT",
      updatedAt: new Date().toISOString(),
      lastMessage: null,
      interlocutor: { id: 2, username: "alice", name: "Alice", surname: null },
    };

    useChatStore.getState().setActiveChat(mockChat);
    expect(useChatStore.getState().activeChat).toEqual(mockChat);

    const mockMessage: MessageChat = {
      id: 10,
      content: "Hello World",
      conversationId: 1,
      createdAt: new Date().toISOString(),
      senderId: 2,
      sender: { id: 2, username: "alice" },
    };

    useChatStore.getState().addMessage(mockMessage);
    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(useChatStore.getState().messages[0].content).toBe("Hello World");
  });

  it("should replace temporary chat when created", () => {
    const tempChat: CHAT = {
      id: 999,
      type: "DIRECT",
      isTemporary: true,
      updatedAt: new Date().toISOString(),
      lastMessage: null,
      interlocutor: { id: 5, username: "bob", name: "Bob", surname: null },
    };

    useChatStore.getState().setChats([tempChat]);
    useChatStore.getState().setActiveChat(tempChat);

    const realChat: CHAT = {
      id: 50,
      type: "DIRECT",
      updatedAt: new Date().toISOString(),
      lastMessage: null,
      interlocutor: { id: 5, username: "bob", name: "Bob", surname: null },
    };

    useChatStore.getState().replaceTemporaryChat(999, realChat);

    expect(useChatStore.getState().chats).toHaveLength(1);
    expect(useChatStore.getState().chats?.[0].id).toBe(50);
    expect(useChatStore.getState().activeChat?.id).toBe(50);
  });
});
