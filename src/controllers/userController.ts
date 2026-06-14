import { Request, Response } from 'express';
import User from '../models/User';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/auth';

// @desc    Request to become a creator
// @route   POST /api/users/creator-request
// @access  Private
export const requestCreator = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    if (req.user.role === 'creator') {
      res.status(400).json({ message: 'Already a creator' });
      return;
    }

    req.user.creatorRequestStatus = 'pending';
    await req.user.save();

    // Notify admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        user: admin._id,
        type: 'creator_approved',
        title: 'New Creator Request',
        message: `${req.user?.username} has requested to become a creator`,
        relatedUser: req.user._id,
      });
    }

    res.json({ message: 'Creator request submitted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Public
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('friends', 'username profilePicture')
      .populate('followers', 'username profilePicture')
      .populate('following', 'username profilePicture');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Follow/Unfollow user
// @route   POST /api/users/:id/follow
// @access  Private
export const toggleFollow = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userToFollow = await User.findById(req.params.id);
    if (!userToFollow) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (userToFollow._id.toString() === req.user._id.toString()) {
      res.status(400).json({ message: 'Cannot follow yourself' });
      return;
    }

    const isFollowing = req.user.following.includes(userToFollow._id);

    if (isFollowing) {
      // Unfollow
      req.user.following = req.user.following.filter(
        id => id.toString() !== userToFollow._id.toString()
      );
      userToFollow.followers = userToFollow.followers.filter(
        id => id.toString() !== req.user._id.toString()
      );
    } else {
      // Follow
      req.user.following.push(userToFollow._id);
      userToFollow.followers.push(req.user._id);

      // Create notification
      await Notification.create({
        user: userToFollow._id,
        type: 'follow',
        title: 'New Follower',
        message: `${req.user.username} started following you`,
        relatedUser: req.user._id,
      });
    }

    await req.user.save();
    await userToFollow.save();

    res.json({ message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add/Remove friend
// @route   POST /api/users/:id/friend
// @access  Private
export const toggleFriend = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userToAdd = await User.findById(req.params.id);
    if (!userToAdd) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (userToAdd._id.toString() === req.user._id.toString()) {
      res.status(400).json({ message: 'Cannot add yourself as friend' });
      return;
    }

    const isFriend = req.user.friends.includes(userToAdd._id);

    if (isFriend) {
      // Remove friend
      req.user.friends = req.user.friends.filter(
        id => id.toString() !== userToAdd._id.toString()
      );
      userToAdd.friends = userToAdd.friends.filter(
        id => id.toString() !== req.user._id.toString()
      );
    } else {
      // Add friend
      req.user.friends.push(userToAdd._id);
      userToAdd.friends.push(req.user._id);
    }

    await req.user.save();
    await userToAdd.save();

    res.json({ message: isFriend ? 'Friend removed' : 'Friend added' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Subscribe to creator
// @route   POST /api/users/:id/subscribe
// @access  Private
export const toggleSubscribe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const creator = await User.findById(req.params.id);
    if (!creator || creator.role !== 'creator') {
      res.status(404).json({ message: 'Creator not found' });
      return;
    }

    const isSubscribed = req.user.subscribedCreators.includes(creator._id);

    if (isSubscribed) {
      req.user.subscribedCreators = req.user.subscribedCreators.filter(
        id => id.toString() !== creator._id.toString()
      );
    } else {
      req.user.subscribedCreators.push(creator._id);
    }

    await req.user.save();

    res.json({ message: isSubscribed ? 'Unsubscribed successfully' : 'Subscribed successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get notifications
// @route   GET /api/users/notifications
// @access  Private
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('relatedUser', 'username profilePicture')
      .populate('relatedMovie', 'title thumbnail');

    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/users/notifications/:id/read
// @access  Private
export const markNotificationAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    res.json(notification);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
