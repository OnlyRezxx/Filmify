import mongoose, { Document, Schema } from 'mongoose';

export interface IMovie extends Document {
  title: string;
  description: string;
  genre: string[];
  thumbnail: string;
  videoUrl: string;
  duration: number;
  ageRating: string;
  creator: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  views: number;
  likes: mongoose.Types.ObjectId[];
  dislikes: mongoose.Types.ObjectId[];
  comments: mongoose.Types.ObjectId[];
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const movieSchema: Schema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  genre: [{
    type: String,
    required: true,
  }],
  thumbnail: {
    type: String,
    required: true,
  },
  videoUrl: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  ageRating: {
    type: String,
    required: true,
    enum: ['G', 'PG', 'PG-13', 'R', 'NC-17'],
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  views: {
    type: Number,
    default: 0,
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  dislikes: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  comments: [{
    type: Schema.Types.ObjectId,
    ref: 'Comment',
  }],
  downloadCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Index for search functionality
movieSchema.index({ title: 'text', description: 'text' });

const Movie = mongoose.model<IMovie>('Movie', movieSchema);

export default Movie;
