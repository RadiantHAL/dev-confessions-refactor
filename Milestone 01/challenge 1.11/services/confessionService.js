/**
 * Confession Service
 * Contains all core business logic and in-memory persistence for Dev Confessions.
 */

// In-memory data store for confessions
const confessions = [];

// Auto-incrementing identifier counter for confession records
let lastConfessionId = 0;

// Allowed confession topics to prevent off-topic spam and maintain community relevance
const VALID_CATEGORIES = ['bug', 'deadline', 'imposter', 'vibe-code'];

// Enforce maximum post length to maintain concise, readable community confessions and prevent excessive memory use
const MAX_TEXT_LENGTH = 500;

/**
 * Validates incoming confession payload against business rules.
 * Throws specific structured errors so controller can map to the legacy API contract.
 */
function validateConfessionPayload(confessionData) {
  if (!confessionData) {
    return { isValid: false, status: 400, type: 'json', body: { msg: 'bad' } };
  }

  if (!confessionData.text) {
    return { isValid: false, status: 400, type: 'json', body: { msg: 'need text' } };
  }

  // Guard against overly verbose submissions to enforce micro-confession format
  if (confessionData.text.length >= MAX_TEXT_LENGTH) {
    return {
      isValid: false,
      status: 400,
      type: 'json',
      body: { error: 'text too big, must be less than 500 characters long buddy' },
    };
  }

  // Prevent blank / empty text submissions
  if (confessionData.text.length === 0) {
    return { isValid: false, status: 400, type: 'text', body: 'too short' };
  }

  // Restrict to predefined categories to ensure feed integrity
  if (!VALID_CATEGORIES.includes(confessionData.category)) {
    return { isValid: false, status: 400, type: 'text', body: 'category not in stuff' };
  }

  return { isValid: true };
}

/**
 * Persists a new confession record into storage.
 */
function createConfessionRecord(confessionData) {
  const newConfession = {
    id: ++lastConfessionId,
    text: confessionData.text,
    category: confessionData.category,
    created_at: new Date(),
  };

  confessions.push(newConfession);
  console.log(`added one info ${newConfession.id}`);
  return newConfession;
}

/**
 * Retrieves all confessions sorted chronologically descending (newest first).
 * Creates a shallow copy before sorting to avoid mutating the in-memory store in place.
 */
function fetchAllConfessions() {
  // Sort descending by created_at; fallback to descending ID if created in the same millisecond
  const sortedConfessions = [...confessions].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id
  );

  console.log('fetching all data result');
  return {
    data: sortedConfessions,
    count: sortedConfessions.length,
  };
}

/**
 * Finds a single confession record by its integer ID.
 */
function findConfessionById(confessionId) {
  return confessions.find((item) => item.id === confessionId);
}

/**
 * Checks whether a category string belongs to the supported categories list.
 */
function isCategoryValid(categoryName) {
  return VALID_CATEGORIES.includes(categoryName);
}

/**
 * Filters confessions matching a category, reversing order to display most recent additions first.
 */
function fetchConfessionsByCategory(categoryName) {
  // Use filter with explicit return condition for clarity, reversed to show recent posts first
  return confessions
    .filter((confession) => confession.category === categoryName)
    .reverse();
}

/**
 * Removes a confession by ID if the provided deletion token matches the configured secret.
 */
function removeConfessionById(confessionId, clientToken, expectedToken) {
  // Guard with authorization check to prevent unauthorized deletion by anonymous users
  if (clientToken !== expectedToken) {
    return { success: false, status: 403, body: { msg: 'no permission' } };
  }

  if (isNaN(confessionId)) {
    return { success: false, status: 400, type: 'text', body: 'no id' };
  }

  const targetIndex = confessions.findIndex((item) => item.id === confessionId);

  if (targetIndex === -1) {
    return { success: false, status: 404, body: { msg: 'not found buddy' } };
  }

  // Remove single record from in-memory array
  const deletedItems = confessions.splice(targetIndex, 1);
  console.log('deleted something');

  return { success: true, status: 200, item: deletedItems[0] };
}

module.exports = {
  VALID_CATEGORIES,
  validateConfessionPayload,
  createConfessionRecord,
  fetchAllConfessions,
  findConfessionById,
  isCategoryValid,
  fetchConfessionsByCategory,
  removeConfessionById,
};
