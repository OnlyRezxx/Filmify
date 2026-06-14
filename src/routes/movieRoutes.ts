import { Router } from 'express';
import {
  uploadMovie,
  getMovies,
  getMovieById,
  toggleLike,
  toggleDislike,
  addComment,
  deleteComment,
  downloadMovie,
  toggleWatchlist,
  search,
} from '../controllers/movieController';
import { protect, authorize } from '../middleware/auth';
import { upload } from '../controllers/movieController';

const router = Router();

router.get('/search', search);
router.get('/', getMovies);
router.get('/:id', getMovieById);
router.post(
  '/',
  protect,
  authorize('creator'),
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  uploadMovie
);
router.post('/:id/like', protect, toggleLike);
router.post('/:id/dislike', protect, toggleDislike);
router.post('/:id/comment', protect, addComment);
router.delete('/:movieId/comment/:commentId', protect, deleteComment);
router.get('/:id/download', protect, downloadMovie);
router.post('/:id/watchlist', protect, toggleWatchlist);

export default router;
