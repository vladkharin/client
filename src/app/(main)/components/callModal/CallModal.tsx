import styles from "./callModal.module.css";
import { useSocketStore } from "@/store";
import { useChatStore } from "@/store/modules/chat";
import { findUserusername } from "@/app/global.service";

export default function CallModal() {
  const { sendMessage } = useSocketStore();
  const { inComingCall } = useChatStore();

  const chat_id = inComingCall?.conversationId;

  const callerusername = chat_id ? findUserusername(chat_id)?.user.username : "Неизвестный";

  const clickToCallAccept = () => {
    // const callerId = inComingCall?.callerId;
    // const conversationId = inComingCall?.conversationId;
    // if (conversationId && callerId) {
    // }
    sendMessage("call:accept", { conversationId: inComingCall?.conversationId });
  };

  return (
    <div className={styles.background}>
      <div className={styles.wrapper}>
        <button onClick={() => clickToCallAccept()}>Взять трубку от {callerusername}</button>
      </div>
    </div>
  );
}
