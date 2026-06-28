// One-time setup script: creates an admin user and the default policy.
// Run with: node src/seed.js
import dotenv from 'dotenv';
dotenv.config();

import connectDB from './config/db.js';
import User from './models/User.js';
import Policy, { MODERATION_CATEGORIES } from './models/Policy.js';
import mongoose from 'mongoose';

const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME || 'admin';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@moderaai.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin123456';

const run = async () => {
  await connectDB();

  const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
  if (existingAdmin) {
    console.log(`ℹ️  Admin user already exists: ${ADMIN_EMAIL}`);
  } else {
    await User.create({
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'admin',
    });
    console.log(`✅ Admin user created:`);
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   ⚠️  Change this password after first login.`);
  }

  const existingPolicy = await Policy.findOne({ isActive: true });
  if (existingPolicy) {
    console.log('ℹ️  Active policy already exists, skipping.');
  } else {
    await Policy.create({
      version: 1,
      isActive: true,
      categories: MODERATION_CATEGORIES.map((cat) => ({
        category: cat,
        enabled: true,
        confidenceThreshold: 70,
        enforcementBehavior: 'flag_for_review',
      })),
    });
    console.log('✅ Default policy (v1) created with all categories enabled.');
  }

  await mongoose.disconnect();
  console.log('🌱 Seed complete.');
  process.exit(0);
};

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
