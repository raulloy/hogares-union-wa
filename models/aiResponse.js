import mongoose from 'mongoose';

const AIResponseSchema = new mongoose.Schema(
  {
    response: { type: String, required: true },
    threadId: {
      type: mongoose.Schema.ObjectId,
      required: true,
      ref: 'Thread',
    },
    userId: { type: String, required: true },
    seen: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const AIResponse = mongoose.model('AIResponse', AIResponseSchema);

export default AIResponse;
