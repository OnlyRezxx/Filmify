import { Router } from 'express';
import {
  requestCreator,
  getUsers,
  getUserById,
  toggleFollow,
  toggleFriend,
  toggleSubscribe,
  getNotifications,
  markNotificationAsRead,
} from '../controllers/userController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.post('/creator-request', protect, requestCreator);
router.get('/', protect, authorize('admin'), getUsers);
router.get('/:id', getUserById);
router.post('/:id/follow', protect, toggleFollow);
router.post('/:id/friend', protect, toggleFriend);
router.post('/:id/subscribe', protect, toggleSubscribe);
router.get('/notifications', protect, getNotifications);
router.put('/notifications/:id/read', protect, markNotificationAsRead);

export default router;
