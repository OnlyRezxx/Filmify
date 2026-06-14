import { Request, Response } from 'express';
import multer from 'multer';
import Movie from '../models/Movie';
import User from '../models/User';
import Notification from '../models/Notification';
import Comment from '../models/Comment';
import { AuthRequest } from '../middleware/auth';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = file.fieldname === 'video' ? 'uploads/videos/' : 'uploads/thumbnails/';
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.fieldname === 'video') {
    if (!file.mimetype.startsWith('video/')) {
      cb(new Error('Only video files are allowed'));
      return;
    }
  } else if (file.fieldname === 'thumbnail') {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '524288000'), // 500MB default
  },
  fileFilter,
});

// @desc    Upload a movie (Creator only)
// @route   POST /api/movies
// @access  Private/Creator
export const uploadMovie = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'creator') {
      res.status(403).json({ message: 'Only creators can upload movies' });
      return;
    }

    const { title, description, genre, duration, ageRating } = req.body;
    
    if (!req.files || !Array.isArray(req.files)) {
      res.status(400).json({ message: 'Video and thumbnail are required' });
      return;
    }

    const videoFile = (req.files as Express.Multer.File[]).find(f => f.fieldname === 'video');
    const thumbnailFile = (req.files as Express.Multer.File[]).find(f => f.fieldname === 'thumbnail');

    if (!videoFile || !thumbnailFile) {
      res.status(400).json({ message: 'Both video and thumbnail files are required' });
      return;
    }

    const movie = await Movie.create({
      title,
      description,
      genre: genre.split(',').map((g: string) => g.trim()),
      thumbnail: `/uploads/thumbnails/${thumbnailFile.filename}`,
      videoUrl: `/uploads/videos/${videoFile.filename}`,
      duration: parseInt(duration),
      ageRating,
      creator: req.user._id,
      status: 'pending',
    });

    // Notify admins about new movie for review
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        user: admin._id,
        type: 'new_movie',
        title: 'New Movie Pending Review',
        message: `${req.user.username} uploaded a new movie: ${title}`,
        relatedUser: req.user._id,
        relatedMovie: movie._id,
      });
    }

    res.status(201).json(movie);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all approved movies
// @route   GET /api/movies
// @access  Public
export const getMovies = async (req: Request, res: Response): Promise<void> => {
  try {
    const { genre, search, page = 1, limit = 10 } = req.query;
    
    const query: any = { status: 'approved' };
    
    if (genre) {
      query.genre = genre;
    }
    
    if (search) {
      query.$text = { $search: search as string };
    }

    const movies = await Movie.find(query)
      .populate('creator', 'username profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit as number)
      .skip((page as number - 1) * (limit as number));

    const total = await Movie.countDocuments(query);

    res.json({
      movies,
      currentPage: page,
      totalPages: Math.ceil(total / (limit as number)),
      total,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get movie by ID
// @route   GET /api/movies/:id
// @access  Public
export const getMovieById = async (req: Request, res: Response): Promise<void> => {
  try {
    const movie = await Movie.findById(req.params.id)
      .populate('creator', 'username profilePicture')
      .populate('comments');

    if (!movie) {
      res.status(404).json({ message: 'Movie not found' });
      return;
    }

    // Increment views
    movie.views += 1;
    await movie.save();

    res.json(movie);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Like/Unlike movie
// @route   POST /api/movies/:id/like
// @access  Private
export const toggleLike = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      res.status(404).json({ message: 'Movie not found' });
      return;
    }

    const isLiked = movie.likes.includes(req.user._id);
    const isDisliked = movie.dislikes.includes(req.user._id);

    if (isLiked) {
      movie.likes = movie.likes.filter(id => id.toString() !== req.user._id.toString());
    } else {
      movie.likes.push(req.user._id);
      if (isDisliked) {
        movie.dislikes = movie.dislikes.filter(id => id.toString() !== req.user._id.toString());
      }
      
      // Notify creator
      if (movie.creator.toString() !== req.user._id.toString()) {
        await Notification.create({
          user: movie.creator,
          type: 'like',
          title: 'New Like',
          message: `${req.user.username} liked your movie: ${movie.title}`,
          relatedUser: req.user._id,
          relatedMovie: movie._id,
        });
      }
    }

    await movie.save();
    res.json({ message: isLiked ? 'Unliked' : 'Liked', likes: movie.likes.length });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Dislike movie
// @route   POST /api/movies/:id/dislike
// @access  Private
export const toggleDislike = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      res.status(404).json({ message: 'Movie not found' });
      return;
    }

    const isDisliked = movie.dislikes.includes(req.user._id);
    const isLiked = movie.likes.includes(req.user._id);

    if (isDisliked) {
      movie.dislikes = movie.dislikes.filter(id => id.toString() !== req.user._id.toString());
    } else {
      movie.dislikes.push(req.user._id);
      if (isLiked) {
        movie.likes = movie.likes.filter(id => id.toString() !== req.user._id.toString());
      }
    }

    await movie.save();
    res.json({ message: isDisliked ? 'Undisliked' : 'Disliked', dislikes: movie.dislikes.length });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add comment to movie
// @route   POST /api/movies/:id/comment
// @access  Private
export const addComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { content } = req.body;
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) {
      res.status(404).json({ message: 'Movie not found' });
      return;
    }

    const comment = await Comment.create({
      movie: movie._id,
      user: req.user._id,
      content,
    });

    movie.comments.push(comment._id);
    await movie.save();

    // Notify creator
    if (movie.creator.toString() !== req.user._id.toString()) {
      await Notification.create({
        user: movie.creator,
        type: 'comment',
        title: 'New Comment',
        message: `${req.user.username} commented on your movie: ${movie.title}`,
        relatedUser: req.user._id,
        relatedMovie: movie._id,
      });
    }

    res.status(201).json(comment);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete comment (Creator or Admin)
// @route   DELETE /api/movies/:movieId/comment/:commentId
// @access  Private/Creator/Admin
export const deleteComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const movie = await Movie.findById(req.params.movieId);
    if (!movie) {
      res.status(404).json({ message: 'Movie not found' });
      return;
    }

    // Check if user is creator or admin
    if (movie.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403).json({ message: 'Not authorized to delete this comment' });
      return;
    }

    await Comment.findByIdAndDelete(req.params.commentId);
    movie.comments = movie.comments.filter(
      id => id.toString() !== req.params.commentId
    );
    await movie.save();

    res.json({ message: 'Comment deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Download movie
// @route   GET /api/movies/:id/download
// @access  Private
export const downloadMovie = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const movie = await Movie.findById(req.params.id);
    if (!movie || movie.status !== 'approved') {
      res.status(404).json({ message: 'Movie not found' });
      return;
    }

    movie.downloadCount += 1;
    await movie.save();

    res.download(movie.videoUrl, `${movie.title}.mp4`);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add movie to watchlist
// @route   POST /api/movies/:id/watchlist
// @access  Private
export const toggleWatchlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      res.status(404).json({ message: 'Movie not found' });
      return;
    }

    const isInWatchlist = req.user.watchlist.includes(movie._id);

    if (isInWatchlist) {
      req.user.watchlist = req.user.watchlist.filter(
        id => id.toString() !== movie._id.toString()
      );
    } else {
      req.user.watchlist.push(movie._id);
    }

    await req.user.save();
    res.json({ message: isInWatchlist ? 'Removed from watchlist' : 'Added to watchlist' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Search movies and users
// @route   GET /api/search
// @access  Public
export const search = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.query;
    
    if (!query) {
      res.status(400).json({ message: 'Search query is required' });
      return;
    }

    const movies = await Movie.find({
      $text: { $search: query as string },
      status: 'approved',
    }).limit(5);

    const users = await User.find({
      $text: { $search: query as string },
    }).select('username profilePicture role').limit(5);

    res.json({ movies, users });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
