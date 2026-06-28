import User from '../models/User.js';

const OUTCOME_DELTAS = {
  approved: { reputation: 2, stat: 'approvedCount' },
  flagged: { reputation: -5, stat: 'flaggedCount' },
  blocked: { reputation: -10, stat: 'blockedCount' },
  mixed: { reputation: -2, stat: 'flaggedCount' },
};

export async function updateUserReputation(userId, overallOutcome) {
  const delta = OUTCOME_DELTAS[overallOutcome];
  if (!delta) return;

  const update = {
    $inc: {
      reputationScore: delta.reputation,
      totalSubmissions: 1,
      [delta.stat]: 1,
    },
  };

  await User.findByIdAndUpdate(userId, update);
}

export function getReputationTier(score) {
  if (score >= 100) return { label: 'Trusted', color: 'cleared' };
  if (score >= 70) return { label: 'Good standing', color: 'cleared' };
  if (score >= 40) return { label: 'Needs review', color: 'signal' };
  return { label: 'At risk', color: 'blocked' };
}
