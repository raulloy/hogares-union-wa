import mongoose from 'mongoose';

const ThreadSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  threadId: { type: String, required: true },
});

const Thread = mongoose.model('Thread', ThreadSchema);

export default Thread;
