import Thread from '../models/thread.js';
import { aiResponse, createThread } from './openAIControllers.js';

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

    const response = await aiResponse(thread.threadId, text);
    console.log(`Assistant response: ${response}`);
    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error(`Error in receivedMessage function: ${error.message}`);
    res.status(200).send('EVENT_RECEIVED');
  }
};
