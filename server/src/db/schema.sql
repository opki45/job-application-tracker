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

-- Phase 2: Gmail auto-import (see docs/PHASE2.md for the full design). This
-- ALTER and the three CREATE TABLEs below are new relative to Phase 1. Unlike
-- the CREATE TABLEs above, ADD COLUMN isn't guarded with IF NOT EXISTS — I only
-- expect to run this once per database, same as I already had to do by hand
-- for anything schema.sql adds after a database already exists.
ALTER TABLE applications
  ADD COLUMN source ENUM('manual','email') NOT NULL DEFAULT 'manual';

-- ---------------------------------------------------------------------------
-- oauth_accounts: one row per (user, provider) the user has connected. I only
-- support 'google' for now but keep the column instead of hardcoding it, in
-- case another provider shows up later. Tokens are encrypted at rest by the
-- application layer (AES, TOKEN_ENC_KEY) before they're ever written here —
-- this table just sees ciphertext, never a usable token.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED NOT NULL,
  provider       VARCHAR(32) NOT NULL,
  access_token   TEXT NOT NULL,
  refresh_token  TEXT NOT NULL,
  expires_at     DATETIME NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_oauth_user_provider (user_id, provider),
  CONSTRAINT fk_oauth_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- processed_emails: a seen-it-already marker per (user, gmail message). This
-- is the whole dedupe mechanism for the sync pipeline — before I do anything
-- with a message I check this table, and after I do (whether or not it turned
-- into a candidate) I insert into it. No email content lives here, just the id.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS processed_emails (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           INT UNSIGNED NOT NULL,
  gmail_message_id  VARCHAR(255) NOT NULL,
  processed_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_processed (user_id, gmail_message_id),
  CONSTRAINT fk_processed_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- candidates: an LLM-proposed application or status update, sitting in the
-- review queue until a user accepts or dismisses it. Nothing here ever gets
-- copied into applications automatically — accepting a candidate is what
-- writes to applications, through the same model/controller path a manual
-- entry would use. matched_application_id is set when this looks like a
-- status update on an application the user already has, rather than a new one.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS candidates (
  id                      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id                 INT UNSIGNED NOT NULL,
  source_message_id       VARCHAR(255) NOT NULL,
  company                 VARCHAR(255),
  role                    VARCHAR(255),
  status                  ENUM('applied','interviewing','offer','rejected','accepted'),
  confidence              DECIMAL(3,2),
  matched_application_id  INT UNSIGNED,
  state                   ENUM('pending','accepted','dismissed') NOT NULL DEFAULT 'pending',
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_candidates_user_state (user_id, state),
  CONSTRAINT fk_candidates_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Post-launch addition, same pattern as applications.source above: not part
-- of the CREATE TABLE so this file still works against a database that
-- already has the table. The date the SOURCE EMAIL was sent (parsed from
-- Gmail's Date header), not the date the sync happened to run -- used as
-- the default date_applied on accept, since "when I got the confirmation
-- email" is a much better proxy for "when I applied" than "whenever I next
-- hit Sync Gmail now". Nullable: falls back to created_at if a header is
-- ever missing or unparseable.
ALTER TABLE candidates
  ADD COLUMN email_date DATE NULL;
