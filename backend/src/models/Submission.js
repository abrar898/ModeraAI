import mongoose from 'mongoose';
import { MODERATION_CATEGORIES } from './Policy.js';

const categoryResultSchema = new mongoose.Schema({
  category: { type: String, enum: MODERATION_CATEGORIES, required: true },
  detected: { type: Boolean, default: false },
  confidence: { type: Number, min: 0, max: 100, default: 0 },
  reasoning: { type: String, default: '' },
  meetsThreshold: { type: Boolean, default: false },
});

const verdictSchema = new mongoose.Schema({
  outcome: { type: String, enum: ['approved', 'flagged', 'blocked'], required: true },
  categoryResults: [categoryResultSchema],
  policyVersion: { type: Number },
  policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy' },
  aiProvider: { type: String, default: null },
  overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  overriddenAt: { type: Date, default: null },
  originalOutcome: { type: String, enum: ['approved', 'flagged', 'blocked', null], default: null },
});

const imageSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  // S3 storage path (preferred when S3 is configured). Pre-signed URLs are
  // generated on-demand from this key — it is never sent to the client.
  s3Key: { type: String, default: null },
  // Legacy inline buffer storage (used when S3 is not configured).
  // When s3Key is set this field is omitted from saves to keep documents small.
  data: { type: Buffer, default: null },
  verdict: verdictSchema,
  appeal: { type: mongoose.Schema.Types.ObjectId, ref: 'Appeal', default: null },
});

const submissionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    images: [imageSchema],
    overallOutcome: {
      type: String,
      enum: ['approved', 'flagged', 'blocked', 'mixed'],
      required: true,
    },
    processed: { type: Boolean, default: false },
    processingTimeMs: { type: Number, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Submission', submissionSchema);
