import Thread from '../models/thread.js';
import AIResponse from '../models/aiResponse.js';
import Message from '../models/message.js';

export const findOrCreateThread = async (userId) => {
  let thread = await Thread.findOne({ userId });

  if (!thread) {
    const threadId = await createThread();
    if (!threadId) {
      throw new Error('Error creating thread');
    }
    thread = new Thread({ userId, threadId });
    await thread.save();
  }

  return thread;
};

export const saveMessage = async (message, threadId, userId) => {
  try {
    const newMessage = new Message({
      message: message,
      threadId: threadId,
      userId: userId,
    });
    await newMessage.save();
  } catch (error) {
    console.error(`Error saving message: ${error.message}`);
    throw error;
  }
};

export const saveAIResponse = async (response, threadId, userId) => {
  try {
    const aiResponseEntry = new AIResponse({
      response: response,
      threadId: threadId,
      userId: userId,
    });
    await aiResponseEntry.save();
  } catch (error) {
    console.error(`Error saving AI response: ${error.message}`);
    throw error;
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

    res.json({ unseen: unseenResponses.length > 0, unseenResponses });
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
