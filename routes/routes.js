import express from 'express';
import {
  receivedMessage,
  verifyToken,
  sendMessage,
} from '../controllers/whatsApp.js';
import {
  fetchMessages,
  fetchThread,
  fetchThreads,
  fetchUnseenAIResponses,
  markSeen,
  toggleMode,
} from '../controllers/mongoDB.js';

const whatsAppRouter = express.Router();

whatsAppRouter.get('/', verifyToken);
whatsAppRouter.post('/', receivedMessage);
whatsAppRouter.post('/send', sendMessage);
whatsAppRouter.get('/messages', fetchMessages);
whatsAppRouter.get('/threads', fetchThreads);
whatsAppRouter.get('/thread', fetchThread);
whatsAppRouter.post('/mark-seen', markSeen);
whatsAppRouter.get('/unseen-ai-responses', fetchUnseenAIResponses);
whatsAppRouter.post('/toggle-mode', toggleMode);

export default whatsAppRouter;
