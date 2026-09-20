import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MemberList from "../memberList/MemberList";
import { useChatStore } from "@/store";
import { ServerItem } from "@/types/types";

const mockSendMessage = vi.fn().mockResolvedValue({ status: 200, members: [] });
const mockOn = vi.fn();
const mockOff = vi.fn();

vi.mock("@/store", async () => {
  const actual = await vi.importActual<typeof import("@/store")>("@/store");
  const mockSocketStore = Object.assign(
    () => ({
      sendMessage: mockSendMessage,
      socket: {
        on: mockOn,
        off: mockOff,
      },
    }),
    {
      getState: () => ({
        sendMessage: mockSendMessage,
        socket: {
          on: mockOn,
          off: mockOff,
        },
      }),
    },
  );

  return {
    ...actual,
    useSocketStore: mockSocketStore,
  };
});

describe("MemberList", () => {
  const mockServer: ServerItem = {
    id: 10,
    name: "CraftHive Devs",
    ownerId: 1,
    inviteCode: "abc12345",
    channels: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useChatStore.setState({
        activeServer: mockServer,
        isMemberListOpen: true,
      });
    });
  });

  it("should not render if not in activeServer", () => {
    act(() => {
      useChatStore.setState({ activeServer: null });
    });
    const { container } = render(<MemberList />);
    expect(container).toBeEmptyDOMElement();
  });

  it("should not render if isMemberListOpen is false", () => {
    act(() => {
      useChatStore.setState({ isMemberListOpen: false });
    });
    const { container } = render(<MemberList />);
    expect(container).toBeEmptyDOMElement();
  });

  it("should render members when activeServer is set", () => {
    render(<MemberList />);
    // Should request server:members on mount
    expect(mockSendMessage).toHaveBeenCalledWith(
      "server:members",
      expect.objectContaining({ serverId: 10 }),
    );
  });
});
