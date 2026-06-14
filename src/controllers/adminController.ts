import { Request, Response } from 'express';
import User from '../models/User';
import Movie from '../models/Movie';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/auth';

// @desc    Approve/Reject creator request
// @route   PUT /api/admin/creator-request/:userId
// @access  Private/Admin
export const handleCreatorRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const { status } = req.body; // 'approved' or 'rejected'
    const user = await User.findById(req.params.userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (status === 'approved') {
      user.role = 'creator';
      user.creatorRequestStatus = 'approved';
      
      // Notify user
      await Notification.create({
        user: user._id,
        type: 'creator_approved',
        title: 'Creator Request Approved',
        message: 'Your request to become a creator has been approved!',
      });
    } else if (status === 'rejected') {
      user.creatorRequestStatus = 'rejected';
      
      // Notify user
      await Notification.create({
        user: user._id,
        type: 'creator_rejected',
        title: 'Creator Request Rejected',
        message: 'Your request to become a creator has been rejected.',
      });
    }

    await user.save();
    res.json({ message: `Creator request ${status}`, user });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all pending creator requests
// @route   GET /api/admin/creator-requests
// @access  Private/Admin
export const getCreatorRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const requests = await User.find({ creatorRequestStatus: 'pending' })
      .select('username email dateOfBirth favoriteGenres createdAt');

    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve/Reject movie
// @route   PUT /api/admin/movie/:movieId
// @access  Private/Admin
export const handleMovieReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const { status } = req.body; // 'approved' or 'rejected'
    const movie = await Movie.findById(req.params.movieId).populate('creator');

    if (!movie) {
      res.status(404).json({ message: 'Movie not found' });
      return;
    }

    movie.status = status;
    await movie.save();

    if (status === 'approved') {
      // Notify creator
      await Notification.create({
        user: (movie.creator as any)._id,
        type: 'creator_approved',
        title: 'Movie Approved',
        message: `Your movie "${movie.title}" has been approved and is now public!`,
        relatedMovie: movie._id,
      });

      // Notify subscribers
      const creator = movie.creator as any;
      const subscribers = await User.find({ subscribedCreators: creator._id });
      for (const subscriber of subscribers) {
        await Notification.create({
          user: subscriber._id,
          type: 'new_movie',
          title: 'New Movie from Creator',
          message: `${creator.username} uploaded a new movie: ${movie.title}`,
          relatedUser: creator._id,
          relatedMovie: movie._id,
        });
      }
    } else {
      // Notify creator about rejection
      await Notification.create({
        user: (movie.creator as any)._id,
        type: 'creator_rejected',
        title: 'Movie Rejected',
        message: `Your movie "${movie.title}" has been rejected.`,
        relatedMovie: movie._id,
      });
    }

    res.json({ message: `Movie ${status}`, movie });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all pending movies
// @route   GET /api/admin/movies/pending
// @access  Private/Admin
export const getPendingMovies = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const movies = await Movie.find({ status: 'pending' })
      .populate('creator', 'username email');

    res.json(movies);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all movies (including pending)
// @route   GET /api/admin/movies
// @access  Private/Admin
export const getAllMovies = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const movies = await Movie.find()
      .populate('creator', 'username email role')
      .sort({ createdAt: -1 });

    res.json(movies);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete movie
// @route   DELETE /api/admin/movie/:movieId
// @access  Private/Admin
export const deleteMovie = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    await Movie.findByIdAndDelete(req.params.movieId);
    res.json({ message: 'Movie deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/user/:userId
// @access  Private/Admin
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    await User.findByIdAndDelete(req.params.userId);
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const totalUsers = await User.countDocuments();
    const totalCreators = await User.countDocuments({ role: 'creator' });
    const totalMovies = await Movie.countDocuments();
    const pendingMovies = await Movie.countDocuments({ status: 'pending' });
    const pendingRequests = await User.countDocuments({ creatorRequestStatus: 'pending' });

    res.json({
      totalUsers,
      totalCreators,
      totalMovies,
      pendingMovies,
      pendingRequests,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
