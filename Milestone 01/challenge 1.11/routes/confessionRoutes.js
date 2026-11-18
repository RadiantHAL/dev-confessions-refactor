/**
 * Confession Routes
 * Directs HTTP traffic to corresponding controller actions.
 * Contains no business logic or database access.
 */

const express = require('express');
const router = express.Router();
const confessionController = require('../controllers/confessionController');

// Specific category route defined prior to wildcard parameter routes to prevent routing ambiguity
router.get('/category/:cat', confessionController.getConfessionsByCategory);

// Confession collection endpoints
router.post('/', confessionController.createConfession);
router.get('/', confessionController.getAllConfessions);

// Individual confession item endpoints
router.get('/:id', confessionController.getConfessionById);
router.delete('/:id', confessionController.deleteConfession);

module.exports = router;
