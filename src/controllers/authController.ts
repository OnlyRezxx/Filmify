import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

// Generate username like User#0001
const generateUsername = async (): Promise<string> => {
  const count = await User.countDocuments();
  const number = (count + 1).toString().padStart(4, '0');
  return `User#${number}`;
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, dateOfBirth, favoriteGenres } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate username
    const username = await generateUsername();

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      dateOfBirth,
      favoriteGenres: favoriteGenres || [],
    });

    // Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Check password
    if (!user.password || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '30d' }
    );

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const user = await User.findById(req.user._id)
      .populate('friends', 'username profilePicture')
      .populate('followers', 'username profilePicture')
      .populate('following', 'username profilePicture')
      .populate('subscribedCreators', 'username profilePicture');

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { favoriteGenres, profilePicture } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { favoriteGenres, profilePicture },
      { new: true, runValidators: true }
    );

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
