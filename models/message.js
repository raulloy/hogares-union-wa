import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    msgByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Thread',
    },
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model('Message', MessageSchema);

export default Message;
