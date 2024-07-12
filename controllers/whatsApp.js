import dotenv from 'dotenv';
import axios from 'axios';

import Thread from '../models/thread.js';
import Message from '../models/message.js';
import { aiResponse, createThread } from './openAI.js';
import { templateText } from '../utils.js';
import { findOrCreateThread, saveAIResponse, saveMessage } from './mongoDB.js';
import { emitMessagesToFrontend } from './sockets.js';

dotenv.config();

const version = process.env.WA_API_VERSION;
const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;
const accessToken = process.env.WA_API_KEY;

export const verifyToken = (req, res) => {
  try {
    const verifyToken = 'IronMan';

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === verifyToken) {
        console.log('WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
      } else {
        res.sendStatus(403);
      }
    }
  } catch (error) {
    res.status(400).send();
  }
};

export const receivedMessage = async (req, res) => {
  try {
    const entry = req.body['entry'][0];
    const changes = entry['changes'][0];
    const value = changes['value'];
    const messageObject = value['messages'];
    const messages = messageObject[0];
    const userId = messages.from;
    const thread = await findOrCreateThread(userId);

    if (messages.type === 'text') {
      const text = messages.text.body;
      console.log(`Received text message: ${text} from user: ${userId}`);

      await saveMessage(text, thread._id, userId);

      const response = await aiResponse(thread.threadId, text);
      console.log(thread.mode);

      if (thread.mode === 'automatic') {
        const sendMessageResult = await sendWhatsAppMessage(userId, response);
        if (sendMessageResult) {
          console.log('Response sent to user via WhatsApp');

          // Save the sent message to the database
          await saveMessage(response, thread._id, userId);
        } else {
          console.log('Failed to send response to user via WhatsApp');
        }
      }

      await saveAIResponse(response, thread._id, phoneNumberId);

      emitMessagesToFrontend(req.io, text, response, userId, thread._id);
    } else if (messages.type === 'audio') {
      const audioId = messages.audio.id;
      console.log(
        `Received voice message with id: ${audioId} from user: ${userId}`
      );

      await saveMessage('Voice Message', thread._id, userId);

      await sendWhatsAppMessage(
        userId,
        'Por el momento no puedo escuchar mensajes de audio, ¿podrías escribir tus preguntas por favor?'
      );
    } else {
      console.log(
        `Received non-text, non-audio message of type: ${messages.type} from user: ${userId}`
      );

      await saveMessage('File Message', thread._id, userId);

      await sendWhatsAppMessage(
        userId,
        'Por el momento solo puedo procesar mensajes de texto, ¿podrías escribir tus preguntas por favor?'
      );
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error(`Error in receivedMessage function: ${error.message}`);
    res.status(200).send('EVENT_RECEIVED');
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { userId, message } = req.body;
    const thread = await Thread.findOne({ userId });

    if (!thread) {
      return res.status(500).send('Thread not found');
    }

    console.log(`Sending message to: ${userId}, message: ${message}`);
    const sendMessageResult = await sendWhatsAppMessage(userId, message);

    if (sendMessageResult) {
      console.log('Response sent to user via WhatsApp');

      // Saving the sent message to the database
      await saveMessage(message, thread._id, phoneNumberId);

      res.status(200).send('Message sent');
    } else {
      console.log('Failed to send response to user via WhatsApp');
      res.status(500).send('Failed to send message');
    }
  } catch (error) {
    console.error(`Error in sendMessage function: ${error.message}`);
    res.status(500).send('Error sending message');
  }
};

const sendWhatsAppMessage = async (to, message) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: {
          body: message,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log('Message sent:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      'Error sending message:',
      error.response ? error.response.data : error.message
    );
    return null;
  }
};

const sendTemplateMessage = async (phoneNumber, templateName) => {
  const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: phoneNumber,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: 'es_MX',
      },
      components: [],
    },
  };

  try {
    let userId = phoneNumber;
    let thread = await Thread.findOne({ userId });

    if (!thread) {
      const threadId = await createThread();
      if (!threadId) {
        console.error('Error creating thread');
        return;
      }
      thread = new Thread({ userId, threadId });
      await thread.save();
    }

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    console.log('Template message sent successfully:', response.data);

    // Save the sent template message to the database
    const sentTemplateMessage = new Message({
      message: templateText,
      threadId: thread._id,
      userId: '259295097276676',
    });
    await sentTemplateMessage.save();
  } catch (error) {
    console.error(
      'Error sending template message:',
      error.response ? error.response.data : error.message
    );
  }
};

// sendTemplateMessage('5215541915469', 'bienvenida_mkt');
