// src/lib/mediasoupManager.ts
import * as mediasoup from "mediasoup-client";
import { useSocketStore } from "@/store";
import { useCallStore } from "@/store";

let device: mediasoup.types.Device | null = null;
let sendTransport: mediasoup.types.Transport | null = null;
let recvTransport: mediasoup.types.Transport | null = null;
let audioProduced = false;
const pendingProducers: Array<{ conversationId: number; producerId: string; peerId: string }> = [];
const consumedProducerIds = new Set<string>();

export const joinMediasoupRoom = async (conversationId: number) => {
  console.log("📞 joinMediasoupRoom вызван для conversationId:", conversationId);

  // Сбрасываем предыдущие соединения и флаги перед началом нового звонка
  audioProduced = false;
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
    console.log("✅ Device loaded");

    // 1. Создаем Send Transport
    const sendTransportInfo = await sendMessage("mediasoup:createWebRtcTransport", {
      conversationId,
      direction: "send",
    });
    sendTransport = device.createSendTransport(sendTransportInfo);
    setupSendTransport(sendTransport, conversationId);
    console.log("📤 Send transport создан");

    // 2. Создаем Recv Transport
    const recvTransportInfo = await sendMessage("mediasoup:createWebRtcTransport", {
      conversationId,
      direction: "recv",
    });
    recvTransport = device.createRecvTransport(recvTransportInfo);
    setupRecvTransport(recvTransport, conversationId);
    console.log("📥 Recv transport создан");

    useCallStore.setState({ conversationId, inCall: true, error: null });

    // 3. Сразу запускаем публикацию своего микрофона (без задержек!)
    produceAudio().catch(console.error);

    // 4. Обрабатываем продюсеры, которые могли прийти пока создавался транспорт
    while (pendingProducers.length > 0) {
      const p = pendingProducers.shift();
      if (p) {
        consumeProducer(p.conversationId, p.producerId, p.peerId).catch(console.error);
      }
    }

    // 5. Запрашиваем у сервера список уже существующих продюсеров в комнате
    try {
      const existingProducers = await sendMessage("mediasoup:getProducers", { conversationId });
      if (Array.isArray(existingProducers)) {
        for (const prod of existingProducers) {
          if (prod.producerId && !consumedProducerIds.has(prod.producerId)) {
            console.log("🔗 Подключаемся к существующему продюсеру в комнате:", prod);
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
    console.log("📡 sendTransport.connect вызван");
    useSocketStore
      .getState()
      .sendMessage("mediasoup:connectTransport", {
        conversationId,
        transportId: transport.id,
        dtlsParameters,
      })
      .then((response) => {
        console.log("✅ Ответ от сервера на connect sendTransport:", response);
        callback();
      })
      .catch((err) => {
        console.error("❌ Ошибка в connectTransport (send):", err);
        errback(err);
      });
  });

  transport.on("produce", ({ kind, rtpParameters }, callback, errback) => {
    console.log("📤 sendTransport.produce вызван для kind:", kind);
    useSocketStore
      .getState()
      .sendMessage("mediasoup:produce", {
        conversationId,
        transportId: transport.id,
        kind,
        rtpParameters,
      })
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
  });
}

function setupRecvTransport(transport: mediasoup.types.Transport, conversationId: number) {
  transport.on("connect", ({ dtlsParameters }, callback, errback) => {
    console.log("📡 recvTransport.connect вызван");
    useSocketStore
      .getState()
      .sendMessage("mediasoup:connectTransport", {
        conversationId,
        transportId: transport.id,
        dtlsParameters,
      })
      .then(() => {
        console.log("✅ recvTransport подключён");
        callback();
      })
      .catch(errback);
  });

  transport.on("connectionstatechange", (state) => {
    console.log("📡 recvTransport state:", state);
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
    console.log("🎤 Запрашиваем доступ к микрофону...");
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    useCallStore.getState().setLocalStream(stream);

    const track = stream.getAudioTracks()[0];
    console.log("🎧 Аудиотрек захвачен:", track.label, "enabled:", track.enabled);

    if (!track || track.readyState === "ended" || !track.enabled) {
      throw new Error("Invalid audio track");
    }

    console.log("🔄 Вызываем sendTransport.produce...");
    const producer = await sendTransport.produce({ track });
    console.log("✅ Audio Producer успешно создан:", producer.id);

    useCallStore.getState().addProducer({ id: producer.id, kind: "audio", track });

    producer.on("transportclose", () => {
      console.log("Producer transport closed");
      useCallStore.getState().removeProducer(producer.id);
    });
  } catch (e) {
    console.error("💥 produceAudio failed:", e);
    audioProduced = false;
  }
}

export const consumeProducer = async (conversationId: number, producerId: string, peerId: string) => {
  if (consumedProducerIds.has(producerId)) {
    console.log(`ℹ️ Producer ${producerId} уже подключен`);
    return;
  }

  // Если ресивер еще не готов — сохраняем в очередь
  if (!device || !recvTransport) {
    console.log(`⏳ recvTransport еще не готов, сохраняем producer ${producerId} в очередь`);
    pendingProducers.push({ conversationId, producerId, peerId });
    return;
  }

  consumedProducerIds.add(producerId);
  console.log(`%c🎧 [Consume START] Producer: ${producerId} для Peer: ${peerId}`, "color: #00ff00; font-weight: bold");

  try {
    const { sendMessage } = useSocketStore.getState();

    // 1. Запрос к серверу на создание консьюмера
    const response = await sendMessage("mediasoup:consume", {
      conversationId: Number(conversationId),
      producerId,
      rtpCapabilities: device.rtpCapabilities,
      transportId: recvTransport.id,
    });

    console.log("📩 [Consume] Сервер подтвердил Consume, ID:", response.id);

    // 2. Локальное создание Consumer в WebRTC транспорте
    const consumer = await recvTransport.consume({
      id: response.id,
      producerId: response.producerId,
      kind: response.kind,
      rtpParameters: response.rtpParameters,
    });

    console.log(`✅ [Consume] MediaSoup Consumer создан: kind=${consumer.kind}`);

    const { track } = consumer;
    const stream = new MediaStream([track]);

    // 3. Удаляем старый аудио-элемент этого пира если был
    const oldAudio = document.getElementById(`remote-audio-${peerId}`);
    if (oldAudio) {
      oldAudio.remove();
    }

    // 4. Создаем HTMLAudioElement
    const audio = document.createElement("audio");
    audio.id = `remote-audio-${peerId}`;
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.setAttribute("playsinline", "true");
    document.body.appendChild(audio);

    try {
      await audio.play();
      console.log(`%c🔊 [Audio SUCCESS] Звук для ${peerId} воспроизводится!`, "color: #00ff00");
    } catch (err) {
      console.warn("🔇 [Audio Autoplay Blocked] Ожидание взаимодействия пользователя:", err);
      const unlock = async () => {
        try {
          await audio.play();
          console.log("🔊 [Audio UNLOCKED] Звук включен после клика");
        } catch {}
        window.removeEventListener("click", unlock);
        window.removeEventListener("touchstart", unlock);
      };
      window.addEventListener("click", unlock);
      window.addEventListener("touchstart", unlock);
    }

    useCallStore.getState().addRemoteParticipant(peerId, producerId, audio);
  } catch (error) {
    console.error("❌ [Consume FATAL]:", error);
    consumedProducerIds.delete(producerId);
  }
};

export const leaveMediasoupRoom = () => {
  audioProduced = false;
  consumedProducerIds.clear();
  pendingProducers.length = 0;

  // Очищаем аудио-элементы
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
  console.log("🧹 MediaSoup сессия завершена и очищена");
};

