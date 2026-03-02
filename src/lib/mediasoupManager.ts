// src/lib/mediasoupManager.ts
import * as mediasoup from "mediasoup-client";
import { useSocketStore } from "@/store";
import { useCallStore } from "@/store";

let device: mediasoup.types.Device | null = null;
let sendTransport: mediasoup.types.Transport | null = null;
let recvTransport: mediasoup.types.Transport | null = null;
let audioProduced = false;

export const joinMediasoupRoom = async (conversationId: number) => {
  console.log("📞 joinMediasoupRoom вызван");
  try {
    const { sendMessage } = useSocketStore.getState();

    const routerRtpCapabilities = await sendMessage("mediasoup:getRouterRtpCapabilities", { conversationId });
    device = new mediasoup.Device();
    await device.load({ routerRtpCapabilities });
    console.log("✅ Device loaded");

    const sendTransportInfo = await sendMessage("mediasoup:createWebRtcTransport", { conversationId, direction: "send" });
    sendTransport = device.createSendTransport(sendTransportInfo);
    setupSendTransport(sendTransport, conversationId);
    console.log("📤 Send transport создан");

    const recvTransportInfo = await sendMessage("mediasoup:createWebRtcTransport", { conversationId, direction: "recv" });
    recvTransport = device.createRecvTransport(recvTransportInfo);
    setupRecvTransport(recvTransport, conversationId);
    console.log("📥 Recv transport создан");

    setTimeout(() => {
      produceAudio().catch(console.error);
    }, 5000);

    useCallStore.setState({ conversationId, inCall: true, error: null });
  } catch (error) {
    console.error("❌ joinMediasoupRoom failed:", error);
    useCallStore.setState({ error: String(error), inCall: false });
    leaveMediasoupRoom();
  }
};

function setupSendTransport(transport: mediasoup.types.Transport, conversationId: number) {
  transport.on("connect", ({ dtlsParameters }, callback, errback) => {
    console.log("📡 sendTransport.connect вызван");
    useSocketStore
      .getState()
      .sendMessage("mediasoup:connectTransport", { conversationId, transportId: transport.id, dtlsParameters })
      .then(() => {
        console.log("✅ sendTransport подключён");
        callback();
      })
      .catch(errback);
  });

  transport.on("produce", ({ kind, rtpParameters }, callback, errback) => {
    console.log("📤 sendTransport.produce вызван", { kind });
    useSocketStore
      .getState()
      .sendMessage("mediasoup:produce", { conversationId, transportId: transport.id, kind, rtpParameters })
      .then((data: any) => {
        console.log("✅ Producer создан:", data.id);
        callback({ id: data.id });
      })
      .catch(errback);
  });

  transport.on("connectionstatechange", (state) => {
    console.log("📡 sendTransport state:", state);
    if (state === "connected" && !audioProduced) {
      setTimeout(() => produceAudio().catch(console.error), 100);
    }
  });
}

function setupRecvTransport(transport: mediasoup.types.Transport, conversationId: number) {
  transport.on("connect", ({ dtlsParameters }, callback, errback) => {
    console.log("📡 recvTransport.connect вызван");

    useSocketStore
      .getState()
      .sendMessage("mediasoup:connectTransport", { conversationId, transportId: transport.id, dtlsParameters })
      .then(() => {
        console.log("✅ recvTransport подключён");
        callback();
      })
      .catch(errback);
  });
}

async function produceAudio() {
  if (audioProduced || !device?.canProduce("audio") || !sendTransport) return;
  audioProduced = true;

  try {
    console.log("🎤 Запрашиваем микрофон...");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    useCallStore.getState().setLocalStream(stream);

    const track = stream.getAudioTracks()[0];
    console.log("🎧 Аудиотрек:", track, "readyState:", track.readyState, "enabled:", track.enabled);

    if (!track || track.readyState === "ended" || !track.enabled) {
      throw new Error("Invalid audio track");
    }

    console.log("🔄 Вызываем sendTransport.produce...");
    const producer = await sendTransport.produce({ track });
    console.log("✅ Producer успешно создан:", producer.id);

    useCallStore.getState().addProducer({ id: producer.id, kind: "audio", track });

    producer.on("transportclose", () => {
      console.log("CloseOperation producer");
      useCallStore.getState().removeProducer(producer.id);
    });
  } catch (e) {
    console.error("💥 produceAudio failed:", e);
    // Для отладки: попробуем без track
    try {
      const producer = await sendTransport.produce({ kind: "audio" });
      console.log("✅ Producer (без track) создан:", producer.id);
    } catch (e2) {
      console.error("❌ Даже без track — провал");
    }
  }
}

export const consumeProducer = async (conversationId: number, producerId: string, peerId: string) => {
  console.log("🎧 consumeProducer вызван", { producerId, peerId });
  if (!device || !recvTransport) return;

  try {
    const { sendMessage } = useSocketStore.getState();
    const response: any = await sendMessage("mediasoup:consume", {
      conversationId,
      producerId,
      rtpCapabilities: device.rtpCapabilities,
    });

    const consumer = await recvTransport.consume({
      id: producerId,
      producerId,
      kind: response.kind,
      rtpParameters: response.rtpParameters,
    });
    console.log("✅ Consumer создан:", consumer.id);

    const audio = new Audio();
    audio.srcObject = new MediaStream([consumer.track]);
    audio.volume = 1.0;
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch((err) => console.warn("🔇 Автовоспроизведение заблокировано:", err));
    }

    useCallStore.getState().addRemoteParticipant(peerId, producerId, audio);
  } catch (error) {
    console.error("❌ Consume error:", error);
  }
};

export const leaveMediasoupRoom = () => {
  audioProduced = false;
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
  console.log("🧹 MediaSoup сессия завершена");
};
