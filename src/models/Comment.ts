import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  movie: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  content: string;
  likes: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema: Schema = new Schema({
  movie: {
    type: Schema.Types.ObjectId,
    ref: 'Movie',
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true,
});

const Comment = mongoose.model<IComment>('Comment', commentSchema);

export default Comment;
