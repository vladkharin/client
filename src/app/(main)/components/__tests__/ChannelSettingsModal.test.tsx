import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChannelSettingsModal from "../channelSettingsModal/ChannelSettingsModal";
import { CHAT } from "@/types/types";

const mockSendMessage = vi.fn().mockResolvedValue({ status: 200 });

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

describe("ChannelSettingsModal", () => {
  const mockChannel: CHAT = {
    id: 101,
    name: "general",
    type: "SERVER_CHANNEL",
    updatedAt: new Date().toISOString(),
    lastMessage: null,
    interlocutor: null,
    serverId: 5,
  };

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render channel overview with name input", () => {
    render(
      <ChannelSettingsModal
        channel={mockChannel}
        serverId={5}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByRole("heading", { name: /Обзор канала/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("general")).toBeInTheDocument();
  });

  it("should call onClose when ESC or close button is clicked", () => {
    render(
      <ChannelSettingsModal
        channel={mockChannel}
        serverId={5}
        onClose={mockOnClose}
      />,
    );

    const closeBtn = screen.getByTitle("Закрыть (ESC)");
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
