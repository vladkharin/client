import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ChatList from "../chatList/ChatList";
import { useChatStore } from "@/store";
import { CHAT } from "@/types/types";

const mockSendMessage = vi.fn().mockResolvedValue({ messages: [] });

vi.mock("@/store", async () => {
  const actual = await vi.importActual<typeof import("@/store")>("@/store");
  const mockSocketStore = Object.assign(
    () => ({
      sendMessage: mockSendMessage,
    }),
    {
      getState: () => ({
        sendMessage: mockSendMessage,
      }),
    },
  );

  return {
    ...actual,
    useSocketStore: mockSocketStore,
  };
});

describe("ChatList", () => {
  beforeEach(() => {
    useChatStore.setState({
      chats: [],
      activeChat: null,
      messages: [],
      isChatsLoading: false,
    });
  });

  it("should show empty state when there are no chats", () => {
    render(<ChatList />);
    expect(screen.getByText("Пока нет диалогов")).toBeInTheDocument();
  });

  it("should render direct and group chats", () => {
    const mockChats: CHAT[] = [
      {
        id: 1,
        type: "DIRECT",
        updatedAt: new Date().toISOString(),
        lastMessage: null,
        interlocutor: { id: 2, username: "alice", name: "Alice", surname: null },
      },
      {
        id: 2,
        type: "GROUP",
        name: "Frontend Wizards",
        membersCount: 4,
        updatedAt: new Date().toISOString(),
        lastMessage: null,
        interlocutor: null,
      },
    ];

    useChatStore.setState({ chats: mockChats });

    render(<ChatList />);
    expect(screen.getByText("@alice")).toBeInTheDocument();
    expect(screen.getByText("Frontend Wizards")).toBeInTheDocument();
    expect(screen.getByText("4 участника")).toBeInTheDocument();
  });

  it("should set active chat on item click", async () => {
    const mockChat: CHAT = {
      id: 1,
      type: "DIRECT",
      updatedAt: new Date().toISOString(),
      lastMessage: null,
      interlocutor: { id: 2, username: "alice", name: "Alice", surname: null },
    };

    useChatStore.setState({ chats: [mockChat] });

    render(<ChatList />);
    const chatItem = screen.getByText("@alice");

    await act(async () => {
      fireEvent.click(chatItem);
    });

    expect(useChatStore.getState().activeChat).toEqual(mockChat);
  });
});
