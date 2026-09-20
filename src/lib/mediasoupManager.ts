// src/lib/mediasoupManager.ts
import * as mediasoup from "mediasoup-client";
import { useSocketStore } from "@/store";
import { useCallStore } from "@/store";

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

    useCallStore.setState({ conversationId, inCall: true, error: null });

    // 3. Запускаем микрофон
    produceAudio().catch(console.error);

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
  } catch (error) {
    console.error("❌ joinMediasoupRoom failed:", error);
    useCallStore.setState({ error: String(error), inCall: false });
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
      .catch(errback);
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
      .catch(errback);
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
      .catch(errback);
  });
}

async function produceAudio() {
  if (audioProduced || !sendTransport) return;
  if (device && !device.canProduce("audio")) return;
  audioProduced = true;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
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
  } catch (e) {
    console.error("💥 produceAudio failed:", e);
    audioProduced = false;
  }
}

export function toggleMuteMic(): boolean {
  const { localStream, isMicMuted, setIsMicMuted } = useCallStore.getState();
  if (!localStream) return isMicMuted;

  const audioTrack = localStream.getAudioTracks()[0];
  if (audioTrack) {
    audioTrack.enabled = isMicMuted; // если был muted (true), включаем (enabled = true)
    setIsMicMuted(!isMicMuted);
    return !isMicMuted;
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
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: 24 },
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
      document.body.appendChild(audio);

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
  } catch (error) {
    console.error("❌ [Consume FATAL]:", error);
    consumedProducerIds.delete(producerId);
  }
};

export const leaveMediasoupRoom = () => {
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
};
