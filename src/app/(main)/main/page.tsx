"use client";

import { AuthGuard } from "@/components/guards/AuthGuard";
import ChatList from "../components/chatList/ChatList";

import styles from "./page.module.css";
import WrapperMessages from "../components/wrapperMessages/WrapperMessages";
import { useChatStore } from "@/store/modules/chat";
import CallModal from "../components/callModal/CallModal";

export default function Page() {
  const { inComingCall } = useChatStore();

  return (
    <AuthGuard>
      <div className={styles.wrapper}>
        <ChatList />
        <WrapperMessages />

        {inComingCall && <CallModal />}
      </div>
    </AuthGuard>
  );
}
