import { describe, it, expect, beforeEach } from "vitest";
import { useCallStore } from "../modules/callStore";

describe("callStore", () => {
  beforeEach(() => {
    useCallStore.setState({
      inCall: false,
      isOutgoing: false,
      conversationId: null,
      error: null,
      localStream: null,
      producers: [],
      remoteParticipants: [],
      consumers: {},
    });
  });

  it("should initialize with default call states", () => {
    const state = useCallStore.getState();
    expect(state.inCall).toBe(false);
    expect(state.isOutgoing).toBe(false);
    expect(state.conversationId).toBeNull();
  });

  it("should handle outgoing call and conversation state", () => {
    useCallStore.getState().setOutgoing(true);
    expect(useCallStore.getState().isOutgoing).toBe(true);

    useCallStore.getState().setConversationId(10);
    expect(useCallStore.getState().conversationId).toBe(10);
  });

  it("should handle reset state", () => {
    useCallStore.getState().setOutgoing(true);
    useCallStore.getState().setConversationId(10);

    useCallStore.getState().reset();
    const state = useCallStore.getState();
    expect(state.inCall).toBe(false);
    expect(state.isOutgoing).toBe(false);
    expect(state.conversationId).toBeNull();
    expect(state.remoteParticipants).toHaveLength(0);
  });
});
