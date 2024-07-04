import { io } from '../server.js';

export const emitMessagesToFrontend = (text, response, userId, threadId) => {
  io.emit('userMessage', {
    message: text,
    userId: userId,
    threadId: threadId,
  });
  io.emit('aiResponse', {
    response: response,
    userId: userId,
    threadId: threadId,
  });
};
