import express from 'express';
import {
  receivedMessage,
  verifyToken,
  sendMessage,
  fetchMessages,
  fetchThreads,
  markSeen,
  fetchUnseenAIResponses,
  toggleMode,
} from '../controllers/whatsAppControllers.js';

const whatsAppRouter = express.Router();

whatsAppRouter.get('/', verifyToken);
whatsAppRouter.post('/', receivedMessage);
whatsAppRouter.post('/send', sendMessage);

whatsAppRouter.get('/messages', fetchMessages);
whatsAppRouter.get('/threads', fetchThreads);
whatsAppRouter.post('/mark-seen', markSeen);
whatsAppRouter.get('/unseen-ai-responses', fetchUnseenAIResponses);
whatsAppRouter.post('/toggle-mode', toggleMode);

export default whatsAppRouter;
