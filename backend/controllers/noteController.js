const Note = require('../models/Note');
const AuditLog = require('../models/AuditLog');

// Get notes for current user
exports.getNotes = async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create a new note
exports.createNote = async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const note = new Note({
      title,
      content,
      userId: req.user.id,
    });

    await note.save();

    // Create Audit Log
    await AuditLog.create({
      userId: req.user.id,
      username: req.user.username,
      action: 'CREATE',
      description: `User created secure note: "${title}"`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update an existing note
exports.updateNote = async (req, res) => {
  try {
    const { title, content } = req.body;
    const { id } = req.params;

    let note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Verify ownership
    if (note.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this note' });
    }

    note.title = title || note.title;
    note.content = content || note.content;

    await note.save();

    // Create Audit Log
    await AuditLog.create({
      userId: req.user.id,
      username: req.user.username,
      action: 'UPDATE',
      description: `User updated secure note: "${note.title}"`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json(note);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a note
exports.deleteNote = async (req, res) => {
  try {
    const { id } = req.params;

    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Verify ownership
    if (note.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this note' });
    }

    const title = note.title;
    await note.deleteOne();

    // Create Audit Log
    await AuditLog.create({
      userId: req.user.id,
      username: req.user.username,
      action: 'DELETE',
      description: `User deleted secure note: "${title}"`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ message: 'Note removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
