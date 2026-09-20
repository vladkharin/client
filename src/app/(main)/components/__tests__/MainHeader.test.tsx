import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MainHeader from "../mainHeader/MainHeader";
import { useUserStore, useChatStore, useFinderStore } from "@/store";

vi.mock("@/lib/firebase", () => ({
  requestNotificationPermission: vi.fn().mockResolvedValue("mock_fcm_token"),
}));

describe("MainHeader", () => {
  beforeEach(() => {
    useUserStore.setState({
      username: "testuser",
      friendRequests: { incoming: [], outgoing: [] },
      friendRequestsState: false,
      friendListState: false,
      profileModalOpen: false,
    });
    useChatStore.setState({
      createGroupModalOpen: false,
    });
    useFinderStore.setState({
      state: false,
    });
  });

  it("should render logo and user username", () => {
    render(<MainHeader />);
    expect(screen.getByText("craft")).toBeInTheDocument();
    expect(screen.getByText("Hive")).toBeInTheDocument();
    expect(screen.getByText("@testuser")).toBeInTheDocument();
  });

  it("should open finder modal when clicking search button", () => {
    render(<MainHeader />);
    const searchBtn = screen.getByTitle("Поиск пользователей и чатов");
    fireEvent.click(searchBtn);
    expect(useFinderStore.getState().state).toBe(true);
  });

  it("should open friends list modal when clicking friends button", () => {
    render(<MainHeader />);
    const friendsBtn = screen.getByTitle("Список друзей");
    fireEvent.click(friendsBtn);
    expect(useUserStore.getState().friendListState).toBe(true);
  });

  it("should display badge when there are incoming friend requests", () => {
    useUserStore.setState({
      friendRequests: {
        incoming: [{ id: 1, username: "alice" }],
        outgoing: [],
      },
    });

    render(<MainHeader />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByTitle("Входящие заявки в друзья")).toBeInTheDocument();
  });
});
