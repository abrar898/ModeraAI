import mongoose from 'mongoose';

export const MODERATION_CATEGORIES = [
  'graphic_violence',
  'hate_symbols',
  'self_harm',
  'extremist_propaganda',
  'weapons_contraband',
  'harassment_humiliation',
];

export const CATEGORY_LABELS = {
  graphic_violence: 'Graphic Violence',
  hate_symbols: 'Hate Symbols',
  self_harm: 'Self-Harm',
  extremist_propaganda: 'Extremist Propaganda',
  weapons_contraband: 'Weapons & Contraband',
  harassment_humiliation: 'Harassment & Humiliation',
};

const categoryPolicySchema = new mongoose.Schema({
  category: { type: String, enum: MODERATION_CATEGORIES, required: true },
  enabled: { type: Boolean, default: true },
  confidenceThreshold: { type: Number, min: 0, max: 100, default: 70 },
  enforcementBehavior: { type: String, enum: ['auto_block', 'flag_for_review'], default: 'flag_for_review' },
});

const policySchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    categories: [categoryPolicySchema],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Ensure only one active policy at a time
policySchema.pre('save', async function (next) {
  if (this.isActive) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, isActive: true },
      { isActive: false }
    );
  }
  next();
});

export default mongoose.model('Policy', policySchema);
