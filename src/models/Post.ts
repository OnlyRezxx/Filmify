import mongoose, { Document, Schema } from 'mongoose';

export interface IPost extends Document {
  creator: mongoose.Types.ObjectId;
  content: string;
  image?: string;
  likes: mongoose.Types.ObjectId[];
  comments: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const postSchema: Schema = new Schema({
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  image: {
    type: String,
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  comments: [{
    type: Schema.Types.ObjectId,
    ref: 'Comment',
  }],
}, {
  timestamps: true,
});

const Post = mongoose.model<IPost>('Post', postSchema);

export default Post;
