import express from 'express';
import {
  receivedMessage,
  verifyToken,
  sendMessage,
} from '../controllers/whatsAppControllers.js';

const whatsAppRouter = express.Router();

whatsAppRouter.get('/', verifyToken);
whatsAppRouter.post('/', receivedMessage);
whatsAppRouter.post('/send', sendMessage);

export default whatsAppRouter;
