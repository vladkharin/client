import { describe, it, expect, beforeEach } from "vitest";
import { useUserStore } from "../modules/user";

describe("userStore", () => {
  beforeEach(() => {
    useUserStore.setState({
      token: null,
      user_id: null,
      username: null,
      friendRequests: { incoming: [], outgoing: [] },
      friendList: null,
      friendRequestsState: false,
      friendListState: false,
      profileModalOpen: false,
    });
    localStorage.clear();
  });

  it("should have initial default values", () => {
    const state = useUserStore.getState();
    expect(state.token).toBeNull();
    expect(state.user_id).toBeNull();
    expect(state.friendRequests.incoming).toHaveLength(0);
  });

  it("should log in user and set state", () => {
    useUserStore.getState().login("test_jwt_token", 42, "testuser");

    const state = useUserStore.getState();
    expect(state.token).toBe("test_jwt_token");
    expect(state.user_id).toBe(42);
    expect(state.username).toBe("testuser");
  });

  it("should log out user and clear state and localStorage", () => {
    useUserStore.getState().login("test_jwt_token", 42);
    useUserStore.getState().logout();

    const state = useUserStore.getState();
    expect(state.token).toBeNull();
    expect(state.user_id).toBeNull();
    expect(localStorage.getItem("auth_token")).toBeNull();
  });

  it("should toggle modal states correctly", () => {
    useUserStore.getState().setProfileModalOpen(true);
    expect(useUserStore.getState().profileModalOpen).toBe(true);

    useUserStore.getState().setFriendRequestState(true);
    expect(useUserStore.getState().friendRequestsState).toBe(true);

    useUserStore.getState().setFriendListState(true);
    expect(useUserStore.getState().friendListState).toBe(true);
  });
});
