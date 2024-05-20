import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import whatsAppRouter from './routes/routes.js';

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const port = process.env.PORT || 5000;

const version = process.env.WA_API_VERSION;
const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;
const accessToken = process.env.WA_API_KEY;

app.use('/api/wa', whatsAppRouter);

app.get('/api/start', async (req, res) => {
  res.send('Hello World!');
});

app.post('/api/send-message', async (req, res) => {
  const { recipientPhoneNumber, messageContent } = req.body;

  if (
    !version ||
    !phoneNumberId ||
    !recipientPhoneNumber ||
    !messageContent ||
    !accessToken
  ) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const response = await axios.post(
      `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientPhoneNumber,
        type: 'text',
        text: {
          preview_url: false,
          body: messageContent,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
