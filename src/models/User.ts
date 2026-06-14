import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password?: string;
  googleId?: string;
  role: 'user' | 'creator' | 'admin';
  creatorRequestStatus?: 'pending' | 'approved' | 'rejected';
  dateOfBirth: Date;
  favoriteGenres: string[];
  profilePicture?: string;
  friends: mongoose.Types.ObjectId[];
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
  watchHistory: mongoose.Types.ObjectId[];
  watchlist: mongoose.Types.ObjectId[];
  subscribedCreators: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema: Schema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    select: false,
  },
  googleId: {
    type: String,
    sparse: true,
  },
  role: {
    type: String,
    enum: ['user', 'creator', 'admin'],
    default: 'user',
  },
  creatorRequestStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: undefined,
  },
  dateOfBirth: {
    type: Date,
    required: true,
  },
  favoriteGenres: [{
    type: String,
  }],
  profilePicture: {
    type: String,
  },
  friends: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  followers: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  following: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  watchHistory: [{
    type: Schema.Types.ObjectId,
    ref: 'Movie',
  }],
  watchlist: [{
    type: Schema.Types.ObjectId,
    ref: 'Movie',
  }],
  subscribedCreators: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true,
});

// Index for search functionality
userSchema.index({ username: 'text', email: 'text' });

const User = mongoose.model<IUser>('User', userSchema);

export default User;
