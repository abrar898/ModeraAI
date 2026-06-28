import mongoose from 'mongoose';

const appealSchema = new mongoose.Schema(
  {
    submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true },
    imageIndex: { type: Number, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    justification: { type: String, required: true, minlength: 20 },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    adminResponse: { type: String, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Appeal', appealSchema);
