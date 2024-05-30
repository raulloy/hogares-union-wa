import express from 'express';
import {
  receivedMessage,
  verifyToken,
  sendMessage,
  fetchMessages,
  fetchThreads,
} from '../controllers/whatsAppControllers.js';

const whatsAppRouter = express.Router();

whatsAppRouter.get('/', verifyToken);
whatsAppRouter.post('/', receivedMessage);
whatsAppRouter.post('/send', sendMessage);

whatsAppRouter.get('/messages', fetchMessages);
whatsAppRouter.get('/threads', fetchThreads);

export default whatsAppRouter;
