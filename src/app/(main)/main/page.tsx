"use client";

import { AuthGuard } from "@/components/guards/AuthGuard";
import ChatList from "../components/chatList/ChatList";

import styles from "./page.module.css";
import WrapperMessages from "../components/wrapperMessages/WrapperMessages";
import { useChatStore } from "@/store/modules/chat";
import CallModal from "../components/callModal/CallModal";
import FinderModal from "../components/finderModal/FinderModal";
import { useFinderStore, useUserStore } from "@/store";
import IncomingRequestsModal from "../components/friendRequests/IncomingRequests";
import MainHeader from "../components/mainHeader/MainHeader";
import FriendModal from "../components/friendModal/FriendModal";

export default function Page() {
  const { inComingCall } = useChatStore();
  const { state } = useFinderStore();
  const { friendRequestsState, friendListState } = useUserStore();

  return (
    <AuthGuard>
      <div className={styles.wrapper}>
        <MainHeader />
        <div className={styles.content}>
          <ChatList />
          <WrapperMessages />
        </div>

        {inComingCall && <CallModal />}
        {state && <FinderModal />}
        {friendRequestsState && <IncomingRequestsModal />}
        {friendListState && <FriendModal />}
      </div>
    </AuthGuard>
  );
}
