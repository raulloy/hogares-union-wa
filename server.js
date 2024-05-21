import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';

import whatsAppRouter from './routes/routes.js';

dotenv.config();

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.log(error);
  });

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const port = process.env.PORT || 5000;
const version = process.env.WA_API_VERSION;
const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;
const accessToken = process.env.WA_API_KEY;

app.use('/api/wa', whatsAppRouter);

export const sendWhatsAppMessage = async (to, message) => {
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

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
