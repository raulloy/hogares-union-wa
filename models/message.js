// Message.js
import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    threadId: {
      type: mongoose.Schema.ObjectId,
      required: true,
      ref: 'Thread',
    },
    userId: { type: String, required: true },
    aiResponseId: { type: mongoose.Schema.ObjectId, ref: 'AIResponse' },
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model('Message', MessageSchema);

export default Message;
