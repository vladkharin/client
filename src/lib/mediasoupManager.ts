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

    const sendTransportInfo = await sendMessage("mediasoup:createWebRtcTransport", { conversationId: conversationId, direction: "send" });
    sendTransport = device.createSendTransport(sendTransportInfo);
    setupSendTransport(sendTransport, conversationId);
    console.log("📤 Send transport создан");

    const recvTransportInfo = await sendMessage("mediasoup:createWebRtcTransport", { conversationId: conversationId, direction: "recv" });
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
    console.log("📡 Попытка выполнить mediasoup:connectTransport...");

    useSocketStore
      .getState()
      .sendMessage("mediasoup:connectTransport", { conversationId: conversationId, transportId: transport.id, dtlsParameters })
      .then((response) => {
        // Если бэк вернул { success: true }, мы должны это увидеть здесь
        console.log("✅ Ответ от сервера на connect:", response);
        callback(); // <--- Только после этого mediasoup-client начнет вещать!
      })
      .catch((err) => {
        console.error("❌ Ошибка в connectTransport:", err);
        errback(err);
      });
  });

  // Аналогично в produce
  transport.on("produce", ({ kind, rtpParameters }, callback, errback) => {
    console.log("📤 Попытка выполнить mediasoup:produce...");
    useSocketStore
      .getState()
      .sendMessage("mediasoup:produce", { conversationId: conversationId, transportId: transport.id, kind, rtpParameters })
      .then((data) => {
        console.log("✅ Сервер подтвердил Produce:", data);
        if (data && data.id) {
          callback({ id: data.id });
        } else {
          errback(new Error("No producer ID returned from server"));
        }
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
      .sendMessage("mediasoup:connectTransport", { conversationId: conversationId, transportId: transport.id, dtlsParameters })
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const track = stream.getAudioTracks()[0];

      // ✅ Правильно: передаём track
      const producer = await sendTransport.produce({ track });
      console.log("✅ Producer (без track) создан:", producer.id);
    } catch (e) {
      console.error("❌ Даже без track — провал" + e);
    }
  }
}

export const consumeProducer = async (conversationId: number, producerId: string, peerId: string) => {
  console.log(`%c🎧 [Consume START] Producer: ${producerId} for Peer: ${peerId}`, "color: #00ff00; font-weight: bold");

  if (!device || !recvTransport) {
    console.error("❌ [Consume] Device или recvTransport отсутствуют!", { device: !!device, recvTransport: !!recvTransport });
    return;
  }

  // Проверка состояния транспорта
  console.log(`📡 [Consume] Состояние recvTransport: ${recvTransport.connectionState}`);
  if (recvTransport.connectionState === "closed" || recvTransport.connectionState === "failed") {
    console.error("❌ [Consume] Транспорт в нерабочем состоянии!");
  }

  try {
    const { sendMessage } = useSocketStore.getState();

    // 1. Запрос к серверу. ПЕРЕДАЕМ transportId!
    console.log("📤 [Consume] Запрос mediasoup:consume на сервер...");
    const response = await sendMessage("mediasoup:consume", {
      conversationId: Number(conversationId),
      producerId: producerId,
      rtpCapabilities: device.rtpCapabilities,
      transportId: recvTransport.id, // <--- КРИТИЧЕСКИ ВАЖНО
    });

    console.log("📩 [Consume] Сервер одобрил Consume, ID:", response.id);

    // 2. Локальный консьюм
    const consumer = await recvTransport.consume({
      id: response.id,
      producerId: response.producerId,
      kind: response.kind,
      rtpParameters: response.rtpParameters,
    });

    console.log(`✅ [Consume] MediaSoup Consumer создан. Kind: ${consumer.kind}`);

    const { track } = consumer;
    console.log("🎵 [Track Diagnostic]", {
      id: track.id,
      readyState: track.readyState,
      enabled: track.enabled,
      muted: track.muted,
    });

    const stream = new MediaStream([track]);

    // 3. Создание аудио-элемента
    const audio = document.createElement("audio");
    audio.id = `remote-audio-${peerId}`;
    audio.srcObject = stream;
    // ВАЖНО: для iOS/Safari иногда нужно явно выставить playsInline и muted, а потом unmute
    audio.setAttribute("autoplay", "true");
    audio.setAttribute("playsinline", "true");

    document.body.appendChild(audio);

    // Попытка воспроизведения с детальным логом
    try {
      await audio.play();
      console.log(`%c🔊 [Audio SUCCESS] Звук для ${peerId} играет!`, "color: #00ff00");
    } catch (err) {
      console.warn("🔇 [Audio Play Blocked] Ждем клика пользователя...", err);
      const unlock = async () => {
        await audio.play();
        console.log("🔊 [Audio UNLOCKED] Звук пошел после клика");
        window.removeEventListener("click", unlock);
      };
      window.addEventListener("click", unlock);
    }

    useCallStore.getState().addRemoteParticipant(peerId, producerId, audio);
  } catch (error) {
    console.error("❌ [Consume FATAL]:", error);
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
    useSocketStore.getState().sendMessage("mediasoup:leaveRoom", { conversationId: conversationId });
  }
  useCallStore.getState().reset();
  console.log("🧹 MediaSoup сессия завершена");
};
