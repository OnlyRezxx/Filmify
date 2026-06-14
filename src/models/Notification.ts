import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  type: 'new_movie' | 'creator_approved' | 'creator_rejected' | 'comment' | 'like' | 'follow';
  title: string;
  message: string;
  relatedUser?: mongoose.Types.ObjectId;
  relatedMovie?: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema: Schema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['new_movie', 'creator_approved', 'creator_rejected', 'comment', 'like', 'follow'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  relatedUser: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  relatedMovie: {
    type: Schema.Types.ObjectId,
    ref: 'Movie',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

notificationSchema.index({ user: 1, createdAt: -1 });

const Notification = mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;
