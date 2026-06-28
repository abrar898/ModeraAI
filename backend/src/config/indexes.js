import User from '../models/User.js';
import Submission from '../models/Submission.js';
import Appeal from '../models/Appeal.js';

/** Ensure indexes exist once at startup for faster admin dashboards. */
export async function ensureIndexes() {
  await Promise.all([
    User.collection.createIndex({ createdAt: -1 }),
    User.collection.createIndex({ isActive: 1 }),
    User.collection.createIndex({ role: 1 }),
    Submission.collection.createIndex({ createdAt: -1 }),
    Submission.collection.createIndex({ user: 1, createdAt: -1 }),
    Submission.collection.createIndex({ overallOutcome: 1 }),
    Appeal.collection.createIndex({ status: 1 }),
    Appeal.collection.createIndex({ createdAt: -1 }),
  ]);
}
