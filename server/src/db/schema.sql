-- Schema for the Job Application Tracker.
-- This file is database-agnostic: it only defines tables, it does NOT pick a
-- database. I choose the target when I run it, so the same file can build both
-- my dev and test databases:
--   mysql -u root -p job_tracker      < src/db/schema.sql
--   mysql -u root -p job_tracker_test < src/db/schema.sql

-- ---------------------------------------------------------------------------
-- users: one row per registered account.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- applications: one row per job the user is tracking.
-- Each row belongs to exactly one user via user_id (a foreign key).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED NOT NULL,
  company         VARCHAR(255) NOT NULL,
  role            VARCHAR(255) NOT NULL,
  status          ENUM('applied','interviewing','offer','rejected','accepted')
                    NOT NULL DEFAULT 'applied',
  date_applied    DATE NOT NULL,
  job_description TEXT,
  notes           TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_applications_user_status (user_id, status),
  CONSTRAINT fk_applications_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
