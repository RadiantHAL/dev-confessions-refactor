/**
 * Confession Controller
 * Extracts incoming request parameters/payload, invokes domain service methods,
 * and serializes HTTP responses adhering to the established API contract.
 */

const confessionService = require('../services/confessionService');

/**
 * Handles creation of a new anonymous confession.
 * Validates request payload through service layer before persisting.
 */
function createConfession(req, res) {
  const confessionData = req.body;

  // Validate request body against schema constraints before attempting persistence
  const validationResult = confessionService.validateConfessionPayload(confessionData);
  if (!validationResult.isValid) {
    if (validationResult.type === 'text') {
      return res.status(validationResult.status).send(validationResult.body);
    }
    return res.status(validationResult.status).json(validationResult.body);
  }

  // Persist record to data layer
  const createdRecord = confessionService.createConfessionRecord(confessionData);
  return res.status(201).json(createdRecord);
}

/**
 * Handles fetching all confessions in reverse chronological order.
 */
function getAllConfessions(req, res) {
  // Delegate retrieval and chronological sorting to business service
  const confessionFeed = confessionService.fetchAllConfessions();
  return res.json(confessionFeed);
}

/**
 * Handles fetching a single confession by its unique integer identifier.
 */
function getConfessionById(req, res) {
  const confessionId = parseInt(req.params.id, 10);

  const matchedConfession = confessionService.findConfessionById(confessionId);

  // Return standard 404 if record does not exist
  if (!matchedConfession) {
    return res.status(404).json({ msg: 'not found' });
  }

  // Enforce data integrity check: corrupt or empty confession text triggers server error
  if (!matchedConfession.text) {
    return res.status(500).send('broken');
  }

  console.log(`found info with ${matchedConfession.text.length} chars`);
  return res.json(matchedConfession);
}

/**
 * Handles fetching confessions filtered by a category slug.
 */
function getConfessionsByCategory(req, res) {
  const categoryName = req.params.cat;

  // Reject unsupported category requests immediately to prevent arbitrary queries
  if (!confessionService.isCategoryValid(categoryName)) {
    return res.status(400).json({ msg: 'invalid category' });
  }

  const categoryConfessions = confessionService.fetchConfessionsByCategory(categoryName);
  return res.json(categoryConfessions);
}

/**
 * Handles removal of a confession by identifier.
 * Requires administrative delete token header authorization.
 */
function deleteConfession(req, res) {
  const confessionId = parseInt(req.params.id, 10);
  const clientDeleteToken = req.headers['x-delete-token'];
  const expectedDeleteToken = process.env.DELETE_TOKEN || 'supersecret123';

  // Delegate authorization and deletion to service layer
  const removalResult = confessionService.removeConfessionById(
    confessionId,
    clientDeleteToken,
    expectedDeleteToken
  );

  if (!removalResult.success) {
    if (removalResult.type === 'text') {
      return res.status(removalResult.status).send(removalResult.body);
    }
    return res.status(removalResult.status).json(removalResult.body);
  }

  return res.json({ msg: 'ok', item: removalResult.item });
}

module.exports = {
  createConfession,
  getAllConfessions,
  getConfessionById,
  getConfessionsByCategory,
  deleteConfession,
};
