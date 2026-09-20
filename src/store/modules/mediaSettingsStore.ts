import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface MediaSettingsState {
  audioInputDeviceId: string;
  audioOutputDeviceId: string;
  videoInputDeviceId: string;
  inputVolume: number; // 0 - 100
  outputVolume: number; // 0 - 100
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;

  // Per-user volume and mute settings (persisted)
  userVolumes: Record<number, number>; // userId -> volume (0 - 200)
  userMuted: Record<number, boolean>; // userId -> isMuted

  setAudioInputDeviceId: (id: string) => void;
  setAudioOutputDeviceId: (id: string) => void;
  setVideoInputDeviceId: (id: string) => void;
  setInputVolume: (vol: number) => void;
  setOutputVolume: (vol: number) => void;
  setUserVolume: (userId: number, vol: number) => void;
  setUserMuted: (userId: number, muted: boolean) => void;
  toggleUserMuted: (userId: number) => void;
  getUserVolume: (userId: number) => number;
  isUserMuted: (userId: number) => boolean;
  setEchoCancellation: (val: boolean) => void;
  setNoiseSuppression: (val: boolean) => void;
  setAutoGainControl: (val: boolean) => void;
  applyOutputSettings: () => void;
  applyUserVolume: (userId: number) => void;
}

export const useMediaSettingsStore = create<MediaSettingsState>()(
  persist(
    devtools(
      (set, get) => ({
        audioInputDeviceId: "default",
        audioOutputDeviceId: "default",
        videoInputDeviceId: "default",
        inputVolume: 100,
        outputVolume: 100,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        userVolumes: {},
        userMuted: {},

        setAudioInputDeviceId: (id) => set({ audioInputDeviceId: id }),

        setAudioOutputDeviceId: (id) => {
          set({ audioOutputDeviceId: id });
          get().applyOutputSettings();
        },

        setVideoInputDeviceId: (id) => set({ videoInputDeviceId: id }),

        setInputVolume: (vol) => set({ inputVolume: Math.max(0, Math.min(100, vol)) }),

        setOutputVolume: (vol) => {
          const clamped = Math.max(0, Math.min(100, vol));
          set({ outputVolume: clamped });
          get().applyOutputSettings();
        },

        setUserVolume: (userId, vol) => {
          const clamped = Math.max(0, Math.min(200, Math.round(vol)));
          set((state) => ({
            userVolumes: { ...state.userVolumes, [userId]: clamped },
          }));
          get().applyUserVolume(userId);
        },

        setUserMuted: (userId, muted) => {
          set((state) => ({
            userMuted: { ...state.userMuted, [userId]: muted },
          }));
          get().applyUserVolume(userId);
        },

        toggleUserMuted: (userId) => {
          const current = !!get().userMuted[userId];
          get().setUserMuted(userId, !current);
        },

        getUserVolume: (userId) => {
          const val = get().userVolumes[userId];
          return val !== undefined ? val : 100;
        },

        isUserMuted: (userId) => {
          return !!get().userMuted[userId];
        },

        setEchoCancellation: (val) => set({ echoCancellation: val }),
        setNoiseSuppression: (val) => set({ noiseSuppression: val }),
        setAutoGainControl: (val) => set({ autoGainControl: val }),

        applyUserVolume: (userId: number) => {
          if (typeof document === "undefined") return;
          const audio = document.getElementById(`remote-audio-${userId}`) as HTMLAudioElement | null;
          if (!audio) return;
          const { outputVolume, userVolumes, userMuted } = get();
          if (userMuted[userId]) {
            audio.volume = 0;
          } else {
            const userVol = userVolumes[userId] !== undefined ? userVolumes[userId] : 100;
            const masterFraction = outputVolume / 100;
            const userFraction = userVol / 100;
            audio.volume = Math.max(0, Math.min(1, masterFraction * userFraction));
          }
        },

        applyOutputSettings: () => {
          if (typeof document === "undefined") return;
          const { outputVolume, audioOutputDeviceId, userVolumes, userMuted } = get();
          const audioElements = document.querySelectorAll<HTMLAudioElement>('audio[id^="remote-audio-"]');
          audioElements.forEach((audio) => {
            const peerIdStr = audio.id.replace("remote-audio-", "");
            const userId = Number(peerIdStr);
            if (!isNaN(userId) && userMuted[userId]) {
              audio.volume = 0;
            } else {
              const userVol = !isNaN(userId) && userVolumes[userId] !== undefined ? userVolumes[userId] : 100;
              const masterFraction = outputVolume / 100;
              const userFraction = userVol / 100;
              audio.volume = Math.max(0, Math.min(1, masterFraction * userFraction));
            }

            if (audioOutputDeviceId && audioOutputDeviceId !== "default" && typeof (audio as any).setSinkId === "function") {
              (audio as any).setSinkId(audioOutputDeviceId).catch((err: any) => {
                console.warn("Не удалось применить setSinkId к аудио:", err);
              });
            }
          });
        },
      }),
      { name: "media-settings-store" },
    ),
    {
      name: "crafthive-media-settings",
    },
  ),
);
