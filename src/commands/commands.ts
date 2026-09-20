export const REQUESTS = {
  usersFind: 'users:find',

  directMessagesCreate: 'dm:create',
  directMessagesList: 'dm:list',

  groupChatCreate: 'group:create',
  groupChatList: 'group:get_all',

  friendRequest: 'friend:request',
  friendRespond: 'friend:respond',
  friendList: 'friend:list',
  friendIncoming: 'friend:incoming',
  friendOutgoing: 'friend:outgoing',

  messageSend: 'message:send',
  messageHistory: 'message:history',
  messageEdit: 'message:edit',
  messageDelete: 'message:delete',
  messageRead: 'message:read',
  messageSearch: 'message:search',
  messagePin: 'message:pin',
  messageUnpin: 'message:unpin',

  reactionToggle: 'reaction:toggle',

  typingStart: 'typing:start',
  typingStop: 'typing:stop',

  serverCreate: 'server:create',
  serverList: 'server:list',
  serverGet: 'server:get',
  serverJoin: 'server:join',
  serverDelete: 'server:delete',
  serverLeave: 'server:leave',
  channelCreate: 'channel:create',

  aiQuery: 'ai:query',
  aiSummarize: 'ai:summarize',
  aiTranslate: 'ai:translate',

  userStatusUpdate: 'user:status:update',
  userThemeUpdate: 'user:theme:update',
  user2faGenerate: 'user:2fa:generate',
  user2faVerify: 'user:2fa:verify',
  user2faDisable: 'user:2fa:disable',
  sessionList: 'session:list',
  sessionTerminate: 'session:terminate',

  callRequest: 'call:request',
  callAccept: 'call:accept',
  callCancel: 'call:cancel',

  getRouterRtpCapabilities: 'mediasoup:getRouterRtpCapabilities',
  createTransport: 'mediasoup:createWebRtcTransport',
  connectTransport: 'mediasoup:connectTransport',
  produce: 'mediasoup:produce',
  consume: 'mediasoup:consume',
  leaveRoom: 'mediasoup:leaveRoom',
  resume: 'mediasoup:resume',
} as const;

export const NOTIFICATIONS = {
  directChatNew: 'notification.direct.chat.new',
  groupChatNew: 'notification.group.chat.new',

  friendRequestReceived: 'notification.friend.request.received',
  friendRequestResponded: 'notification.friend.request.responded',

  messageNew: 'notification.message.new',
  messageReceived: 'notification.message.received',
  messageUpdated: 'notification.message.updated',
  messageDeleted: 'notification.message.deleted',
  messagePinned: 'notification.message.pinned',

  reactionUpdated: 'notification.reaction.updated',

  userTyping: 'notification.user.typing',
  userStatus: 'notification.user.status',

  serverNew: 'notification.server.new',
  channelNew: 'notification.channel.new',
} as const;
