import dotenv from 'dotenv';
import axios from 'axios';

import Thread from '../models/thread.js';
import Message from '../models/message.js';
import { io } from '../server.js';
import { aiResponse, createThread } from './openAIControllers.js';
import AIResponse from '../models/aiResponse.js';
import { templateText } from '../utils.js';

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
    const text = messages.text.body;
    const userId = messages.from;

    console.log(`Received message: ${text} from user: ${userId}`);

    let thread = await Thread.findOne({ userId });

    if (!thread) {
      const threadId = await createThread();
      if (!threadId) {
        res.status(500).send('Error creating thread');
        return;
      }
      thread = new Thread({ userId, threadId });
      await thread.save();
    }

    // Save received message to the database
    const receivedMessage = new Message({
      message: text,
      threadId: thread._id, // Reference the thread
      userId: userId,
    });
    await receivedMessage.save();

    const response = await aiResponse(thread.threadId, text);
    console.log(thread.mode);

    if (thread.mode === 'automatic') {
      await sendMessageHelper(userId, response, thread._id);
    }

    // Save AI response to the database
    const aiResponseEntry = new AIResponse({
      response: response,
      threadId: thread._id, // Reference the thread
      userId: userId,
    });
    await aiResponseEntry.save();

    // Emit the messages to the frontend with the correct userId and threadId
    io.emit('userMessage', {
      message: text,
      userId: userId,
      threadId: thread._id,
    });
    io.emit('aiResponse', {
      response: response,
      userId: userId,
      threadId: thread._id,
    });

    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error(`Error in receivedMessage function: ${error.message}`);
    res.status(200).send('EVENT_RECEIVED');
  }
};

const sendMessageHelper = async (userId, message, threadId) => {
  console.log(`Sending message to: ${userId}, message: ${message}`);
  const sendMessageResult = await sendWhatsAppMessage(userId, message);

  if (sendMessageResult) {
    console.log('Response sent to user via WhatsApp');

    // Save the sent message to the database
    const sentMessage = new Message({
      message,
      threadId, // Reference the thread
      userId: phoneNumberId,
    });
    await sentMessage.save();

    return 'Message sent';
  } else {
    console.log('Failed to send response to user via WhatsApp');
    return 'Failed to send message';
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { userId, message } = req.body;
    let thread = await Thread.findOne({ userId });
    if (!thread) {
      res.status(500).send('Thread not found');
      return;
    }

    const result = await sendMessageHelper(userId, message, thread._id);
    if (result === 'Message sent') {
      res.status(200).send(result);
    } else {
      res.status(500).send(result);
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

export const fetchMessages = async (req, res) => {
  const { threadId } = req.query;
  try {
    const messages = await Message.find({ threadId }).sort({ createdAt: 1 });
    const aiResponses = await AIResponse.find({ threadId, seen: false }).sort({
      createdAt: 1,
    });

    res.json({ messages, aiResponses });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).send('Error fetching messages');
  }
};

export const markSeen = async (req, res) => {
  const { threadId } = req.body;
  try {
    await AIResponse.updateMany({ threadId, seen: false }, { seen: true });
    res.status(200).send('AI responses marked as seen');
  } catch (error) {
    console.error('Error marking AI responses as seen:', error);
    res.status(500).send('Error marking AI responses as seen');
  }
};

export const fetchUnseenAIResponses = async (req, res) => {
  const { userId } = req.query;
  try {
    const threads = await Thread.find({ userId });
    if (threads.length === 0) {
      return res.json({ unseen: false });
    }

    const threadId = threads[0]._id;
    const unseenResponses = await AIResponse.find({ threadId, seen: false });

    res.json({ unseen: unseenResponses.length > 0 });
  } catch (error) {
    console.error('Error fetching unseen AI responses:', error);
    res.status(500).send('Error fetching unseen AI responses');
  }
};

export const fetchThreads = async (req, res) => {
  try {
    const messages = await Thread.find();
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).send('Error fetching messages');
  }
};

export const fetchThread = async (req, res) => {
  const { threadId } = req.query;
  try {
    const thread = await Thread.findById(threadId);
    res.json(thread);
  } catch (error) {
    console.error('Error fetching thread:', error);
    res.status(500).send('Error fetching thread');
  }
};

export const toggleMode = async (req, res) => {
  const { threadId } = req.body;

  try {
    const thread = await Thread.findById(threadId);
    if (!thread) {
      return res.status(404).send('Thread not found');
    }

    thread.mode = thread.mode === 'assisted' ? 'automatic' : 'assisted';
    await thread.save();

    res.status(200).send(`Mode switched to ${thread.mode}`);
  } catch (error) {
    console.error('Error toggling mode:', error);
    res.status(500).send('Error toggling mode');
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

// sendTemplateMessage('5215545096630', 'bienvenida_mkt');
