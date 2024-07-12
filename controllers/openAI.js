import OpenAI from 'openai';
import dotenv from 'dotenv';
import { createHubSpotContact } from './hubspot.js';

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
      assistant_id: 'asst_74UYtN4MF2A5pnBzQafAki5j',
    });

    let runStatus;
    do {
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);

      if (runStatus.status === 'requires_action') {
        const args = JSON.parse(
          runStatus.required_action.submit_tool_outputs.tool_calls[0].function
            .arguments
        );
        const toolCallId =
          runStatus.required_action.submit_tool_outputs.tool_calls[0].id;
        const output = await createHubSpotContact(
          args.firstname,
          args.lastname,
          args.phone,
          args.email,
          args.desarrollo
        );

        if (!output) {
          await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
            tool_outputs: [
              {
                tool_call_id: toolCallId,
                output: JSON.stringify({
                  message: 'An error occurred, please try again.',
                }),
              },
            ],
          });
        } else {
          // Proceed to submit the output as before
          await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
            tool_outputs: [
              {
                tool_call_id: toolCallId,
                output: JSON.stringify(output),
              },
            ],
          });
        }
      }
    } while (runStatus.status !== 'completed');

    const messages = await openai.beta.threads.messages.list(threadId);
    const response = messages.data[0].content[0].text.value;

    return response;
  } catch (error) {
    console.error(`Error in aiResponse function: ${error.message}`);
    return null;
  }
};
