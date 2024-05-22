import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export const createThread = async () => {
  try {
    console.log('Starting a new conversation...');
    const thread = await openai.beta.threads.create();
    console.log(`New thread created with ID: ${thread.id}`);
    return thread.id;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return null;
  }
};

export const aiResponse = async (threadId, userInput) => {
  try {
    if (!threadId) {
      console.log('Error: Missing thread_id');
      return null;
    }

    console.log(`Received message: ${userInput} for thread ID: ${threadId}`);

    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: userInput,
    });

    // Running the Assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: 'asst_BdyD9Gn5zC0srMe3LqMFxlBG',
    });

    let runStatus;
    do {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    } while (runStatus.status !== 'completed');

    const messages = await openai.beta.threads.messages.list(threadId);
    const response = messages.data[0].content[0].text.value;

    return response;
  } catch (error) {
    console.error(`Error in aiResponse function: ${error.message}`);
    return null;
  }
};
