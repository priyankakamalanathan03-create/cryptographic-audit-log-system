const express = require('express');
const noteController = require('../controllers/noteController');
const auth = require('../middleware/auth');

const router = express.Router();

// All notes routes require authentication
router.get('/', auth, noteController.getNotes);
router.post('/', auth, noteController.createNote);
router.put('/:id', auth, noteController.updateNote);
router.delete('/:id', auth, noteController.deleteNote);

module.exports = router;
