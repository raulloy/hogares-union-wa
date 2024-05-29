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
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model('Message', MessageSchema);

export default Message;
