export const REQUESTS = {
  friendRequest: 'friend:request',
  friendRespond: 'friend:respond',
  friendList: 'friend:list',
  friendIncoming: 'friend:incoming',
  friendOutgoing: 'friend:outgoing',
} as const;

export const NOTIFICATIONS = {
  friendRequestReceived: 'notification.friend.request.received',
} as const;
