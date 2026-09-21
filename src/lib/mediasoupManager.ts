import * as mediasoup from "mediasoup-client";
import { useSocketStore, useCallStore, useMediaSettingsStore } from "@/store";
import { playJoinSound, playLeaveSound, playMuteSound } from "./audioSounds";
import { reportClientError } from "./clientLogger";
import { toast } from "react-toastify";

let device: mediasoup.types.Device | null = null;
let sendTransport: mediasoup.types.Transport | null = null;
let recvTransport: mediasoup.types.Transport | null = null;
let audioProduced = false;
let audioProducer: mediasoup.types.Producer | null = null;
let videoProducer: mediasoup.types.Producer | null = null;
const pendingProducers: Array<{ conversationId: number; producerId: string; peerId: string }> = [];
const consumedProducerIds = new Set<string>();

export const joinMediasoupRoom = async (conversationId: number) => {
  console.log("📞 joinMediasoupRoom вызван для conversationId:", conversationId);

  audioProduced = false;
  audioProducer = null;
  videoProducer = null;
  consumedProducerIds.clear();
  pendingProducers.length = 0;

  useCallStore.setState({
    conversationId,
    inCall: true,
    voiceConnectionState: "connecting",
    error: null,
  });

  try {
    sendTransport?.close();
    recvTransport?.close();
  } catch {}
  sendTransport = null;
  recvTransport = null;
  device = null;

  try {
    const { sendMessage } = useSocketStore.getState();

    const routerRtpCapabilities = await sendMessage("mediasoup:getRouterRtpCapabilities", { conversationId });
    if (!routerRtpCapabilities) {
      throw new Error("Сервер не вернул параметры RTP роутера");
    }

    device = new mediasoup.Device();
    await device.load({ routerRtpCapabilities });

    // 1. Создаем Send Transport
    const sendTransportInfo = await sendMessage("mediasoup:createWebRtcTransport", {
      conversationId,
      direction: "send",
    });
    sendTransport = device.createSendTransport(sendTransportInfo);
    setupSendTransport(sendTransport, conversationId);

    // 2. Создаем Recv Transport
    const recvTransportInfo = await sendMessage("mediasoup:createWebRtcTransport", {
      conversationId,
      direction: "recv",
    });
    recvTransport = device.createRecvTransport(recvTransportInfo);
    setupRecvTransport(recvTransport, conversationId);

    useCallStore.setState({
      conversationId,
      inCall: true,
      voiceConnectionState: "connected",
      error: null,
    });
    playJoinSound();

    // 3. Запускаем микрофон
    produceAudio().catch((err) => {
      console.error("produceAudio failed in join:", err);
    });

    // 4. Обрабатываем очередь продюсеров
    while (pendingProducers.length > 0) {
      const p = pendingProducers.shift();
      if (p) {
        consumeProducer(p.conversationId, p.producerId, p.peerId).catch(console.error);
      }
    }

    // 5. Запрашиваем существующих продюсеров
    try {
      const existingProducers = await sendMessage("mediasoup:getProducers", { conversationId });
      if (Array.isArray(existingProducers)) {
        for (const prod of existingProducers) {
          if (prod.producerId && !consumedProducerIds.has(prod.producerId)) {
            consumeProducer(conversationId, prod.producerId, String(prod.userId)).catch(console.error);
          }
        }
      }
    } catch (err) {
      console.warn("Не удалось получить существующих продюсеров:", err);
    }
  } catch (error: any) {
    console.error("❌ joinMediasoupRoom failed:", error);
    reportClientError({
      source: "webrtc_join",
      message: error?.message || String(error),
      stack: error?.stack,
      context: { conversationId },
    });
    toast.error("Не удалось подключиться к голосовой комнате: " + (error?.message || "Ошибка соединения"));
    useCallStore.setState({ error: String(error?.message || error), inCall: false });
    leaveMediasoupRoom();
  }
};

function setupSendTransport(transport: mediasoup.types.Transport, conversationId: number) {
  transport.on("connect", ({ dtlsParameters }, callback, errback) => {
    useSocketStore
      .getState()
      .sendMessage("mediasoup:connectTransport", {
        conversationId,
        transportId: transport.id,
        dtlsParameters,
      })
      .then(() => callback())
      .catch((err) => {
        reportClientError({
          source: "webrtc_transport",
          message: `Send transport connect error: ${err?.message || err}`,
          stack: err?.stack,
          context: { conversationId, transportId: transport.id },
        });
        errback(err);
      });
  });

  transport.on("produce", ({ kind, rtpParameters }, callback, errback) => {
    useSocketStore
      .getState()
      .sendMessage("mediasoup:produce", {
        conversationId,
        transportId: transport.id,
        kind,
        rtpParameters,
      })
      .then((data) => {
        if (data && data.id) {
          callback({ id: data.id });
        } else {
          errback(new Error("No producer ID returned from server"));
        }
      })
      .catch((err) => {
        reportClientError({
          source: "webrtc_transport",
          message: `Produce error (${kind}): ${err?.message || err}`,
          stack: err?.stack,
          context: { conversationId, kind },
        });
        errback(err);
      });
  });

  transport.on("connectionstatechange", (state) => {
    console.log(`📡 Send transport connection state: ${state}`);
    if (state === "failed") {
      reportClientError({
        source: "webrtc_transport",
        message: "Send transport connection failed (WebRTC / ICE failure)",
        context: { conversationId, transportId: transport.id, state, direction: "send" },
      });
      toast.error("Сбой соединения с голосовым сервером (WebRTC / UDP). Проверьте фаервол или VPN.");
    }
  });
}

function setupRecvTransport(transport: mediasoup.types.Transport, conversationId: number) {
  transport.on("connect", ({ dtlsParameters }, callback, errback) => {
    useSocketStore
      .getState()
      .sendMessage("mediasoup:connectTransport", {
        conversationId,
        transportId: transport.id,
        dtlsParameters,
      })
      .then(() => callback())
      .catch((err) => {
        reportClientError({
          source: "webrtc_transport",
          message: `Recv transport connect error: ${err?.message || err}`,
          stack: err?.stack,
          context: { conversationId, transportId: transport.id },
        });
        errback(err);
      });
  });

  transport.on("connectionstatechange", (state) => {
    console.log(`📡 Recv transport connection state: ${state}`);
    if (state === "failed") {
      reportClientError({
        source: "webrtc_transport",
        message: "Recv transport connection failed (WebRTC / ICE failure)",
        context: { conversationId, transportId: transport.id, state, direction: "recv" },
      });
    }
  });
}

async function produceAudio() {
  if (audioProduced || !sendTransport) return;
  if (device && !device.canProduce("audio")) {
    console.warn("Device cannot produce audio");
    return;
  }
  audioProduced = true;

  try {
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (typeof window !== "undefined" && !window.isSecureContext) {
        toast.error("Для работы микрофона требуется HTTPS-соединение (защищенный контекст).");
        throw new Error("Insecure context: getUserMedia not available without HTTPS");
      }
      toast.error("Ваш браузер не поддерживает доступ к микрофону.");
      throw new Error("getUserMedia is not supported on this browser/device");
    }

    const { audioInputDeviceId, echoCancellation, noiseSuppression, autoGainControl } =
      useMediaSettingsStore.getState();

    const audioConstraints: MediaTrackConstraints = {
      echoCancellation,
      noiseSuppression,
      autoGainControl,
      deviceId: audioInputDeviceId && audioInputDeviceId !== "default" ? { exact: audioInputDeviceId } : undefined,
    };

    const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    useCallStore.getState().setLocalStream(stream);

    const track = stream.getAudioTracks()[0];
    if (!track || track.readyState === "ended" || !track.enabled) {
      throw new Error("Invalid audio track");
    }

    const producer = await sendTransport.produce({ track });
    audioProducer = producer;
    useCallStore.getState().addProducer({ id: producer.id, kind: "audio", track });

    producer.on("transportclose", () => {
      useCallStore.getState().removeProducer(producer.id);
      audioProducer = null;
    });
  } catch (e: any) {
    console.error("💥 produceAudio failed:", e);
    audioProduced = false;

    reportClientError({
      source: "webrtc_mic",
      message: e?.message || "produceAudio failed",
      stack: e?.stack,
      context: {
        errorName: e?.name,
      },
    });

    if (e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError") {
      toast.error("Доступ к микрофону заблокирован браузером. Разрешите микрофон в настройках сайта (иконка замка слева в адресной строке).", { autoClose: 7000 });
    } else if (e?.name === "NotFoundError" || e?.name === "DevicesNotFoundError") {
      toast.error("Микрофон не обнаружен на вашем устройстве.", { autoClose: 5000 });
    } else if (e?.name === "NotReadableError") {
      toast.error("Микрофон уже используется другим приложением.", { autoClose: 5000 });
    }
  }
}

export async function switchAudioInput(deviceId: string) {
  if (!audioProducer || !sendTransport) return;
  try {
    const { echoCancellation, noiseSuppression, autoGainControl } = useMediaSettingsStore.getState();
    const audioConstraints: MediaTrackConstraints = {
      echoCancellation,
      noiseSuppression,
      autoGainControl,
      deviceId: deviceId && deviceId !== "default" ? { exact: deviceId } : undefined,
    };
    const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    const newTrack = stream.getAudioTracks()[0];
    if (newTrack) {
      await audioProducer.replaceTrack({ track: newTrack });
      const oldStream = useCallStore.getState().localStream;
      oldStream?.getAudioTracks().forEach((t) => t.stop());
      useCallStore.getState().setLocalStream(stream);
    }
  } catch (err) {
    console.error("Failed to switch audio input device:", err);
  }
}

export function toggleMuteMic(): boolean {
  const { localStream, isMicMuted, setIsMicMuted } = useCallStore.getState();
  if (!localStream) return isMicMuted;

  const audioTrack = localStream.getAudioTracks()[0];
  if (audioTrack) {
    const nextMuted = !isMicMuted;
    audioTrack.enabled = isMicMuted; // если был muted (true), включаем (enabled = true)
    setIsMicMuted(nextMuted);
    playMuteSound(nextMuted);
    return nextMuted;
  }
  return isMicMuted;
}

export async function toggleCamera(): Promise<boolean> {
  if (!sendTransport) return false;

  if (videoProducer) {
    videoProducer.close();
    useCallStore.getState().removeProducer(videoProducer.id);
    useCallStore.getState().setLocalVideoStream(null);
    useCallStore.getState().setIsCameraActive(false);
    videoProducer = null;
    return false;
  }

  try {
    const { videoInputDeviceId } = useMediaSettingsStore.getState();
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: 24,
        deviceId: videoInputDeviceId && videoInputDeviceId !== "default" ? { exact: videoInputDeviceId } : undefined,
      },
    });
    const track = stream.getVideoTracks()[0];
    if (!track) return false;

    videoProducer = await sendTransport.produce({ track });
    useCallStore.getState().addProducer({ id: videoProducer.id, kind: "video", track });
    useCallStore.getState().setLocalVideoStream(stream);
    useCallStore.getState().setIsCameraActive(true);
    useCallStore.getState().setIsScreenActive(false);

    videoProducer.on("transportclose", () => {
      if (videoProducer) useCallStore.getState().removeProducer(videoProducer.id);
      useCallStore.getState().setLocalVideoStream(null);
      useCallStore.getState().setIsCameraActive(false);
      videoProducer = null;
    });

    track.onended = () => {
      if (videoProducer) {
        videoProducer.close();
        useCallStore.getState().removeProducer(videoProducer.id);
        useCallStore.getState().setLocalVideoStream(null);
        useCallStore.getState().setIsCameraActive(false);
        videoProducer = null;
      }
    };

    return true;
  } catch (err) {
    console.error("Failed to toggle camera:", err);
    return false;
  }
}

export async function switchVideoInput(deviceId: string) {
  if (!videoProducer || !sendTransport) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: 24,
        deviceId: deviceId && deviceId !== "default" ? { exact: deviceId } : undefined,
      },
    });
    const newTrack = stream.getVideoTracks()[0];
    if (newTrack) {
      await videoProducer.replaceTrack({ track: newTrack });
      const oldStream = useCallStore.getState().localVideoStream;
      oldStream?.getVideoTracks().forEach((t) => t.stop());
      useCallStore.getState().setLocalVideoStream(stream);
    }
  } catch (err) {
    console.error("Failed to switch video input device:", err);
  }
}


export async function toggleScreenShare(): Promise<boolean> {
  if (!sendTransport) return false;

  if (videoProducer) {
    videoProducer.close();
    useCallStore.getState().removeProducer(videoProducer.id);
    useCallStore.getState().setLocalVideoStream(null);
    useCallStore.getState().setIsScreenActive(false);
    videoProducer = null;
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    });
    const track = stream.getVideoTracks()[0];
    if (!track) return false;

    videoProducer = await sendTransport.produce({ track });
    useCallStore.getState().addProducer({ id: videoProducer.id, kind: "video", track });
    useCallStore.getState().setLocalVideoStream(stream);
    useCallStore.getState().setIsScreenActive(true);
    useCallStore.getState().setIsCameraActive(false);

    videoProducer.on("transportclose", () => {
      if (videoProducer) useCallStore.getState().removeProducer(videoProducer.id);
      useCallStore.getState().setLocalVideoStream(null);
      useCallStore.getState().setIsScreenActive(false);
      videoProducer = null;
    });

    track.onended = () => {
      if (videoProducer) {
        videoProducer.close();
        useCallStore.getState().removeProducer(videoProducer.id);
        useCallStore.getState().setLocalVideoStream(null);
        useCallStore.getState().setIsScreenActive(false);
        videoProducer = null;
      }
    };

    return true;
  } catch (err) {
    console.error("Failed to share screen:", err);
    return false;
  }
}

export const consumeProducer = async (conversationId: number, producerId: string, peerId: string) => {
  if (consumedProducerIds.has(producerId)) return;

  if (!device || !recvTransport) {
    pendingProducers.push({ conversationId, producerId, peerId });
    return;
  }

  consumedProducerIds.add(producerId);

  try {
    const { sendMessage } = useSocketStore.getState();

    const response = await sendMessage("mediasoup:consume", {
      conversationId: Number(conversationId),
      producerId,
      rtpCapabilities: device.rtpCapabilities,
      transportId: recvTransport.id,
    });

    const consumer = await recvTransport.consume({
      id: response.id,
      producerId: response.producerId,
      kind: response.kind,
      rtpParameters: response.rtpParameters,
    });

    const { track } = consumer;
    const stream = new MediaStream([track]);

    if (consumer.kind === "audio") {
      const oldAudio = document.getElementById(`remote-audio-${peerId}`);
      if (oldAudio) oldAudio.remove();

      const audio = document.createElement("audio");
      audio.id = `remote-audio-${peerId}`;
      audio.srcObject = stream;
      audio.autoplay = true;
      audio.setAttribute("playsinline", "true");

      const { outputVolume, audioOutputDeviceId } = useMediaSettingsStore.getState();
      audio.volume = outputVolume / 100;
      if (audioOutputDeviceId && audioOutputDeviceId !== "default" && typeof (audio as any).setSinkId === "function") {
        (audio as any).setSinkId(audioOutputDeviceId).catch(() => {});
      }

      document.body.appendChild(audio);
      const peerUserId = Number(peerId);
      if (!isNaN(peerUserId)) {
        useMediaSettingsStore.getState().applyUserVolume(peerUserId);
      }

      try {
        await audio.play();
      } catch (err) {
        const unlock = async () => {
          try {
            await audio.play();
          } catch {}
          window.removeEventListener("click", unlock);
        };
        window.addEventListener("click", unlock);
      }

      useCallStore.getState().addRemoteParticipant(peerId, producerId, audio);
    } else if (consumer.kind === "video") {

      // Сохраняем видео-поток в стор для красивого React рендеринга в CallOverlay!
      useCallStore.getState().setRemoteVideoStream(peerId, stream);
    }
  } catch (error: any) {
    console.error("❌ [Consume FATAL]:", error);
    reportClientError({
      source: "webrtc_transport",
      message: `consumeProducer failed: ${error?.message || error}`,
      stack: error?.stack,
      context: { conversationId, producerId, peerId },
    });
    consumedProducerIds.delete(producerId);
  }
};

export const leaveMediasoupRoom = () => {
  playLeaveSound();
  audioProduced = false;
  audioProducer = null;
  consumedProducerIds.clear();
  pendingProducers.length = 0;
  if (videoProducer) {
    videoProducer.close();
    videoProducer = null;
  }

  document.querySelectorAll('audio[id^="remote-audio-"]').forEach((el) => el.remove());

  sendTransport?.close();
  recvTransport?.close();
  sendTransport = null;
  recvTransport = null;
  device = null;

  const { conversationId } = useCallStore.getState();
  if (conversationId) {
    useSocketStore.getState().sendMessage("mediasoup:leaveRoom", { conversationId });
  }
  useCallStore.getState().reset();
  useCallStore.setState({ voiceConnectionState: "disconnected" });
};
