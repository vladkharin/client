"use client";

import { AuthGuard } from "@/components/guards/AuthGuard";
import ChatList from "../components/chatList/ChatList";
import styles from "./page.module.css";
import WrapperMessages from "../components/wrapperMessages/WrapperMessages";
import { useChatStore } from "@/store/modules/chat";
import CallModal from "../components/callModal/CallModal";
import FinderModal from "../components/finderModal/FinderModal";
import { useCallStore, useFinderStore, useUserStore } from "@/store";
import IncomingRequestsModal from "../components/friendRequests/IncomingRequests";
import MainHeader from "../components/mainHeader/MainHeader";
import FriendModal from "../components/friendModal/FriendModal";
import OutgoingCallModal from "../components/outgoingCallModal/outgoingCallModal";
import CreateGroupModal from "../components/createGroupModal/CreateGroupModal";
import ProfileModal from "../components/profileModal/ProfileModal";

export default function Page() {
  const { inComingCall, createGroupModalOpen, activeChat } = useChatStore();
  const { isOutgoing } = useCallStore();
  const { state } = useFinderStore();
  const { friendRequestsState, friendListState, profileModalOpen } = useUserStore();

  return (
    <AuthGuard>
      <div className={styles.wrapper}>
        <MainHeader />
        <div className={`${styles.content} ${activeChat ? styles.hasActiveChat : styles.noActiveChat}`}>
          <div className={styles.chatListContainer}>
            <ChatList />
          </div>
          <div className={styles.messagesContainer}>
            <WrapperMessages />
          </div>
        </div>

        {inComingCall && <CallModal />}
        {isOutgoing && <OutgoingCallModal />}
        {state && <FinderModal />}
        {friendRequestsState && <IncomingRequestsModal />}
        {friendListState && <FriendModal />}
        {createGroupModalOpen && <CreateGroupModal />}
        {profileModalOpen && <ProfileModal />}
      </div>
    </AuthGuard>
  );
}
