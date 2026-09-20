export type FORM_REGISTRATION = {
  name: string;
  surname: string;
  username: string;
  password: string;
  email: string;
  password_confirmed?: string;
};

export type FORM_AUTHORIZATION = {
  username: string;
  password: string;
};

export type RESPONSE_AUTHORIZATION = {
  id: number;
  access_token: string;
};

export interface Interlocutor {
  id: number;
  username: string;
  name: string | null;
  surname: string | null;
  avatar?: string | null;
  customStatus?: string | null;
  statusEmoji?: string | null;
  lastSeenAt?: string | null;
}

export interface LastMessage {
  text: string;
  createdAt: Date | string;
}

export interface PinnedMessageInfo {
  id: number;
  content: string;
  sender: { id: number; username: string };
  createdAt: string;
}

export interface CHAT {
  id: number;
  type?: "DIRECT" | "GROUP" | "SERVER_CHANNEL" | "SERVER_VOICE";
  name?: string | null;
  avatar?: string | null;
  updatedAt: Date | string;
  lastMessage: LastMessage | null;
  interlocutor: Interlocutor | null;
  isTemporary?: boolean;
  membersCount?: number;
  pinnedMessage?: PinnedMessageInfo | null;
  serverId?: number | null;
}

export interface ReactionItem {
  id: number;
  messageId: number;
  userId: number;
  emoji: string;
  username?: string;
}

export interface ServerItem {
  id: number;
  name: string;
  icon?: string | null;
  ownerId: number;
  inviteCode: string;
  channels: CHAT[];
  membersCount?: number;
  role?: string;
}

export type FriendStatus = "PENDING" | "ACCEPTED" | "BLOCKED";

export interface FriendUser {
  id: number;
  username: string;
}

export interface FriendshipInfo {
  id: number;
  status: FriendStatus;
  createdAt: string;
  isInitiator: boolean;
}

export interface FriendListItem extends FriendUser {
  friendship: FriendshipInfo;
}

export type FriendList = FriendListItem[];

export interface RespondToRequestResult {
  success: boolean;
  action?: "accepted" | "declined";
  friend?: FriendListItem;
  friendId?: number;
  error?: string;
  friendshipId?: number;
}
