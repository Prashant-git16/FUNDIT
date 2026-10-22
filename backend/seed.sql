-- ============================================================
-- Fundit Seed Data — Local Development Only
-- This file contains FICTIONAL data. No real personal or payment data.
-- Run after schema.sql:
--   mysql -u fundit_user -p fundit_db < seed.sql
-- ============================================================

-- Clear existing data (FK-safe order)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE moderation_logs;
TRUNCATE TABLE expenses;
TRUNCATE TABLE donations;
TRUNCATE TABLE campaigns;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- ─── Users ───────────────────────────────────────────────────────────────────
-- Passwords are bcrypt hashes of "Password1!" (cost 12) — for dev only
-- To generate a real hash: node -e "const b=require('bcrypt');b.hash('Password1!',12).then(console.log)"

INSERT INTO users (id, name, email, password_hash, role) VALUES
(1, 'Admin User',     'admin@fundit.in',   '$2b$12$T5lJSrJOLvMmXuDOwW97/ObPx1Ym3sAiJVQ6w2r9aSnFbIZLRIWRi', 'admin'),
(2, 'Priya Sharma',   'priya@example.com', '$2b$12$T5lJSrJOLvMmXuDOwW97/ObPx1Ym3sAiJVQ6w2r9aSnFbIZLRIWRi', 'user'),
(3, 'Rahul Verma',    'rahul@example.com', '$2b$12$T5lJSrJOLvMmXuDOwW97/ObPx1Ym3sAiJVQ6w2r9aSnFbIZLRIWRi', 'user'),
(4, 'Aisha Khan',     'aisha@example.com', '$2b$12$T5lJSrJOLvMmXuDOwW97/ObPx1Ym3sAiJVQ6w2r9aSnFbIZLRIWRi', 'user');

-- ─── Campaigns ───────────────────────────────────────────────────────────────

INSERT INTO campaigns
  (id, owner_id, title, category, description, target_amount, raised_amount, deadline, status)
VALUES
(1, 2, 'Free Eye Surgery for Underprivileged Children',
 'healthcare',
 'Many children in rural India suffer from treatable eye conditions that rob them of their futures. This campaign funds free cataract and corneal surgeries for children aged 5–15 who cannot afford treatment. Every rupee raised goes directly to hospital fees, medicines, and post-operative care. We partner with three verified hospitals in Maharashtra to ensure professional, compassionate treatment.',
 250000.00, 178000.00, DATE_ADD(CURDATE(), INTERVAL 45 DAY), 'active'),

(2, 3, 'Digital Classrooms for Village Government Schools',
 'education',
 'Government schools in our district lack computers and internet connectivity. We aim to set up 10 fully equipped digital classrooms — each with a projector, 20 laptops, and a 50 Mbps broadband connection — so that 500+ students can access quality educational content and learn 21st-century skills. All equipment is donated to the school trust with a three-year maintenance contract.',
 400000.00, 102500.00, DATE_ADD(CURDATE(), INTERVAL 60 DAY), 'active'),

(3, 4, 'Flood Relief for Families in Assam',
 'disaster_relief',
 'The recent floods in Assam have displaced over 2 000 families. This campaign provides immediate relief: dry rations, clean drinking water, medicines, and temporary shelter materials. Funds are distributed through our ground volunteer network with photo documentation provided to donors. Any surplus will be directed to long-term rebuilding efforts once immediate needs are met.',
 500000.00, 480000.00, DATE_ADD(CURDATE(), INTERVAL 15 DAY), 'active'),

(4, 2, 'Rescue and Rehabilitate Street Dogs in Bengaluru',
 'animal_welfare',
 'Our team rescues injured and diseased street dogs in Bengaluru, provides veterinary care, and re-homes them with verified adopters. This campaign funds six months of operations: medicines, surgeries, neutering, vaccination, shelter rent, and food. We have a zero-euthanasia policy and operate with full transparency.',
 150000.00, 62000.00, DATE_ADD(CURDATE(), INTERVAL 90 DAY), 'active'),

(5, 3, 'Plant 10 000 Native Trees in the Western Ghats',
 'environment',
 'Deforestation in the Western Ghats threatens biodiversity and water security. We partner with local tribal communities to plant 10 000 native-species saplings with a 90% survival guarantee backed by two years of maintenance. Community members are employed as paid caretakers, creating sustainable livelihoods alongside ecological impact.',
 180000.00, 95000.00, DATE_ADD(CURDATE(), INTERVAL 120 DAY), 'active'),

(6, 4, 'Transitional Housing for Domestic Violence Survivors',
 'shelter_housing',
 'Women and children leaving abusive home situations need a safe place to rebuild their lives. This campaign funds six months of rent and utilities for a 10-room transitional shelter in Pune managed by a registered NGO. Residents receive counselling, legal aid, and job-placement support while staying in the shelter.',
 300000.00, 145000.00, DATE_ADD(CURDATE(), INTERVAL 75 DAY), 'active');

-- ─── Donations ────────────────────────────────────────────────────────────────

INSERT INTO donations
  (campaign_id, donor_id, amount, currency, is_anonymous, razorpay_order_id, razorpay_payment_id, status)
VALUES
(1, 3, 5000.00, 'INR', 0, 'order_seed_001', 'pay_seed_001', 'paid'),
(1, 4, 3000.00, 'INR', 1, 'order_seed_002', 'pay_seed_002', 'paid'),
(2, 4, 2500.00, 'INR', 0, 'order_seed_003', 'pay_seed_003', 'paid'),
(3, 2, 10000.00, 'INR', 0, 'order_seed_004', 'pay_seed_004', 'paid'),
(3, 3, 7500.00, 'INR', 1, 'order_seed_005', 'pay_seed_005', 'paid'),
(4, 3, 1500.00, 'INR', 0, 'order_seed_006', 'pay_seed_006', 'paid'),
(5, 2, 3000.00, 'INR', 0, 'order_seed_007', 'pay_seed_007', 'paid'),
(6, 4, 5000.00, 'INR', 1, 'order_seed_008', 'pay_seed_008', 'paid');

-- ─── Expenses ─────────────────────────────────────────────────────────────────

INSERT INTO expenses (campaign_id, amount, description) VALUES
(1, 45000.00, 'Hospital fees for 3 surgeries — AIIMS Nagpur (batch 1)'),
(1, 28000.00, 'Post-operative medicines and eye drops for 12 patients'),
(3, 120000.00, 'Dry rations: 400 family kits (rice, dal, oil, salt)'),
(3, 80000.00,  'Clean water supply: 5 000 litre water tankers for 7 villages');
