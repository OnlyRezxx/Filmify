import { Router } from 'express';
import {
  handleCreatorRequest,
  getCreatorRequests,
  handleMovieReview,
  getPendingMovies,
  getAllMovies,
  deleteMovie,
  deleteUser,
  getDashboardStats,
} from '../controllers/adminController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

// All routes require admin authorization
router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getDashboardStats);
router.get('/creator-requests', getCreatorRequests);
router.put('/creator-request/:userId', handleCreatorRequest);
router.get('/movies/pending', getPendingMovies);
router.get('/movies', getAllMovies);
router.put('/movie/:movieId', handleMovieReview);
router.delete('/movie/:movieId', deleteMovie);
router.delete('/user/:userId', deleteUser);

export default router;
