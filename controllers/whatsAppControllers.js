import dotenv from 'dotenv';
import axios from 'axios';

import Thread from '../models/thread.js';
import Message from '../models/message.js';
import { io } from '../server.js';
import { aiResponse, createThread } from './openAIControllers.js';
import AIResponse from '../models/aiResponse.js';

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
    console.log(`Assistant response: ${response}`);

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

export const sendMessage = async (req, res) => {
  try {
    const { userId, message } = req.body;
    console.log(`Sending message to: ${userId}, message: ${message}`);

    const sendMessageResult = await sendWhatsAppMessage(userId, message);
    if (sendMessageResult) {
      console.log('Response sent to user via WhatsApp');

      // Find the thread by userId
      let thread = await Thread.findOne({ userId });
      if (!thread) {
        res.status(500).send('Thread not found');
        return;
      }

      // Save the sent message to the database
      const sentMessage = new Message({
        message,
        threadId: thread._id, // Reference the thread
        userId: phoneNumberId,
      });
      await sentMessage.save();

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

export const fetchThreads = async (req, res) => {
  try {
    const messages = await Thread.find();
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).send('Error fetching messages');
  }
};
