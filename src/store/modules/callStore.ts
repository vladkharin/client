import { create } from "zustand";
import * as mediasoup from "mediasoup-client";
import { devtools } from "zustand/middleware";

interface RemoteParticipant {
  peerId: string;
  producerId: string;
  audio: HTMLAudioElement;
}

interface LocalProducer {
  id: string;
  kind: "audio" | "video";
  track: MediaStreamTrack;
}

export interface ChannelUser {
  id: number;
  username: string;
  name?: string | null;
  surname?: string | null;
  avatar?: string | null;
  customStatus?: string | null;
  statusEmoji?: string | null;
  hasAudio?: boolean;
  hasVideo?: boolean;
}

interface CallState {
  // Состояние комнаты
  inCall: boolean;
  isOutgoing: boolean;
  conversationId: number | null;
  error: string | null;

  // Локальные ресурсы
  localStream: MediaStream | null;
  localVideoStream: MediaStream | null;
  isCameraActive: boolean;
  isScreenActive: boolean;
  isMicMuted: boolean;
  producers: LocalProducer[];

  // Удалённые участники
  remoteParticipants: RemoteParticipant[];
  remoteVideoStreams: Record<string, MediaStream>; // peerId -> MediaStream
  consumers: Record<string, mediasoup.types.Consumer>;
  channelParticipants: Record<number, ChannelUser[]>; // conversationId -> users in voice channel

  // Методы
  setOutgoing: (isOutgoing: boolean) => void;
  setConversationId: (id: number | null) => void;
  setInCall: (inCall: boolean) => void;
  setChannelParticipants: (conversationId: number, users: ChannelUser[]) => void;

  addRemoteParticipant: (peerId: string, producerId: string, audio: HTMLAudioElement) => void;
  removeRemoteParticipant: (producerId: string) => void;
  setRemoteVideoStream: (peerId: string, stream: MediaStream | null) => void;

  addProducer: (producer: LocalProducer) => void;
  removeProducer: (producerId: string) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setLocalVideoStream: (stream: MediaStream | null) => void;
  setIsCameraActive: (active: boolean) => void;
  setIsScreenActive: (active: boolean) => void;
  setIsMicMuted: (muted: boolean) => void;
  setError: (error: string | null) => void;

  reset: () => void;
}

export const useCallStore = create<CallState>()(
  devtools(
    (set, get) => ({
      inCall: false,
      isOutgoing: false,
      conversationId: null,
      error: null,

      localStream: null,
      localVideoStream: null,
      isCameraActive: false,
      isScreenActive: false,
      isMicMuted: false,
      producers: [],
      remoteParticipants: [],
      remoteVideoStreams: {},
      consumers: {},
      channelParticipants: {},

      setOutgoing: (isOutgoing) => set({ isOutgoing }),

      setConversationId: (id) =>
        set({
          conversationId: id,
          inCall: id !== null && !get().isOutgoing,
        }),

      setInCall: (inCall) => set({ inCall }),

      setChannelParticipants: (conversationId, users) =>
        set((state) => ({
          channelParticipants: {
            ...state.channelParticipants,
            [conversationId]: users,
          },
        })),

      addRemoteParticipant: (peerId, producerId, audio) =>
        set((state) => {
          const old = state.remoteParticipants.find((p) => p.peerId === peerId || p.producerId === producerId);
          if (old && old.audio !== audio) {
            old.audio.pause();
            old.audio.remove();
          }
          const filtered = state.remoteParticipants.filter((p) => p.peerId !== peerId && p.producerId !== producerId);
          return {
            remoteParticipants: [...filtered, { peerId, producerId, audio }],
          };
        }),

      removeRemoteParticipant: (id: string) =>
        set((state) => {
          const participant = state.remoteParticipants.find(
            (p) => p.producerId === id || p.peerId === id,
          );
          if (participant) {
            participant.audio.pause();
            participant.audio.remove();
            if (participant.audio.srcObject) {
              const stream = participant.audio.srcObject as MediaStream;
              stream.getTracks().forEach((track) => track.stop());
            }
          }

          const newConsumers = { ...state.consumers };
          delete newConsumers[id];
          if (participant?.producerId) {
            delete newConsumers[participant.producerId];
          }

          const newVideos = { ...state.remoteVideoStreams };
          delete newVideos[id];
          if (participant?.peerId) {
            delete newVideos[participant.peerId];
          }

          return {
            remoteParticipants: state.remoteParticipants.filter(
              (p) => p.producerId !== id && p.peerId !== id,
            ),
            remoteVideoStreams: newVideos,
            consumers: newConsumers,
          };
        }),

      setRemoteVideoStream: (peerId, stream) =>
        set((state) => {
          if (!stream) {
            const copy = { ...state.remoteVideoStreams };
            delete copy[peerId];
            return { remoteVideoStreams: copy };
          }
          return {
            remoteVideoStreams: { ...state.remoteVideoStreams, [peerId]: stream },
          };
        }),

      addProducer: (producer) =>
        set((state) => ({
          producers: [...state.producers, producer],
        })),

      removeProducer: (producerId) =>
        set((state) => ({
          producers: state.producers.filter((p) => p.id !== producerId),
        })),

      setLocalStream: (stream) => set({ localStream: stream }),
      setLocalVideoStream: (stream) => set({ localVideoStream: stream }),
      setIsCameraActive: (active) => set({ isCameraActive: active }),
      setIsScreenActive: (active) => set({ isScreenActive: active }),
      setIsMicMuted: (muted) => set({ isMicMuted: muted }),

      setError: (error) => set({ error }),

      reset: () => {
        const state = get();

        if (state.localStream) {
          state.localStream.getTracks().forEach((t) => t.stop());
        }
        if (state.localVideoStream) {
          state.localVideoStream.getTracks().forEach((t) => t.stop());
        }

        state.remoteParticipants.forEach((p) => {
          p.audio.pause();
          if (p.audio.srcObject) {
            const stream = p.audio.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
          }
        });

        Object.values(state.consumers).forEach((consumer) => {
          consumer.close();
        });

        set({
          inCall: false,
          isOutgoing: false,
          conversationId: null,
          error: null,
          localStream: null,
          localVideoStream: null,
          isCameraActive: false,
          isScreenActive: false,
          isMicMuted: false,
          producers: [],
          remoteParticipants: [],
          remoteVideoStreams: {},
          consumers: {},
        });
      },
    }),
    {
      name: "call-store",
    },
  ),
);
