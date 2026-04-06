const express = require('express');

const router = express.Router();

// GET request
router.get('/', (req, res) => {
    res.json({ message: 'Welcome to the server' });
});

// POST request
router.post('/', (req, res) => {
    res.json({ message: 'Data received', data: req.body });
});

// GET by ID
router.get('/:id', (req, res) => {
    res.json({ message: `Get item with ID: ${req.params.id}` });
});

// PUT request
router.put('/:id', (req, res) => {
    res.json({ message: `Update item with ID: ${req.params.id}` });
});

// DELETE request
router.delete('/:id', (req, res) => {
    res.json({ message: `Delete item with ID: ${req.params.id}` });
});

module.exports = router;