const express = require('express');
const { getUsers, getUser, updateUser, deleteUser } = require('../controllers/userController');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes require admin role
router.get('/', authMiddleware, requireRole('admin'), getUsers);
router.get('/:id', authMiddleware, requireRole('admin'), getUser);
router.put('/:id', authMiddleware, requireRole('admin'), updateUser);
router.delete('/:id', authMiddleware, requireRole('admin'), deleteUser);

module.exports = router;
