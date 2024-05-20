import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import {
  receivedMessage,
  verifyToken,
} from '../controllers/whatsAppControllers.js';

const whatsAppRouter = express.Router();

whatsAppRouter.get('/', verifyToken);
whatsAppRouter.post('/', receivedMessage);

export default whatsAppRouter;
