import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const internships = sqliteTable(
  'internships',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    company: text('company').notNull(),
    role: text('role').notNull(),
    period: text('period').notNull().default(''),
    summary: text('summary').notNull(),
    highlights: text('highlights').notNull().default(''),
    createdAt: integer('created_at').notNull(),
    ownerKey: text('owner_key').notNull().default('mty'),
  },
  (table) => [index('idx_internships_owner_key').on(table.ownerKey)],
);

export const contacts = sqliteTable(
  'contacts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    relationship: text('relationship').notNull(),
    value: text('value').notNull(),
    direction: text('direction').notNull(),
    closeness: integer('closeness').notNull().default(2),
    createdAt: integer('created_at').notNull(),
    ownerKey: text('owner_key').notNull().default('mty'),
  },
  (table) => [index('idx_contacts_owner_key').on(table.ownerKey)],
);

export const leetcodeProblems = sqliteTable(
  'leetcode_problems',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderNo: integer('order_no').notNull(),
    title: text('title').notNull(),
    category: text('category').notNull(),
    difficulty: text('difficulty').notNull(),
    status: text('status').notNull().default('未开始'),
    confidence: integer('confidence').notNull().default(0),
    notes: text('notes').notNull().default(''),
    language: text('language').notNull().default('JavaScript'),
    code: text('code').notNull().default(''),
    updatedAt: integer('updated_at').notNull(),
    ownerKey: text('owner_key').notNull().default('mty'),
  },
  (table) => [
    uniqueIndex('idx_leetcode_owner_order').on(table.ownerKey, table.orderNo),
  ],
);

export const foundationTopics = sqliteTable(
  'foundation_topics',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    area: text('area').notNull(),
    topic: text('topic').notNull(),
    status: text('status').notNull().default('待学习'),
    confidence: integer('confidence').notNull().default(0),
    lastReviewed: text('last_reviewed').notNull().default(''),
    notes: text('notes').notNull().default(''),
    createdAt: integer('created_at').notNull(),
    ownerKey: text('owner_key').notNull().default('mty'),
  },
  (table) => [index('idx_foundations_owner_key').on(table.ownerKey)],
);

export const quickNotes = sqliteTable(
  'quick_notes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull().default('未命名笔记'),
    content: text('content').notNull().default(''),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    ownerKey: text('owner_key').notNull().default('mty'),
  },
  (table) => [
    index('idx_quick_notes_owner_updated').on(table.ownerKey, table.updatedAt),
  ],
);

export const interviews = sqliteTable(
  'interviews',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    company: text('company').notNull(),
    role: text('role').notNull().default(''),
    status: text('status').notNull().default('已投递'),
    interviewDate: text('interview_date').notNull().default(''),
    notes: text('notes').notNull().default(''),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    ownerKey: text('owner_key').notNull(),
  },
  (table) => [
    index('idx_interviews_owner_updated').on(table.ownerKey, table.updatedAt),
  ],
);

export const loginCredentials = sqliteTable(
  'login_credentials',
  {
    ownerKey: text('owner_key').primaryKey(),
    username: text('username').notNull(),
    passwordHash: text('password_hash').notNull(),
    version: text('version').notNull(),
    accountName: text('account_name').notNull(),
    updatedAt: integer('updated_at').notNull(),
    createdAt: integer('created_at'),
    lastLoginAt: integer('last_login_at'),
  },
  (table) => [uniqueIndex('idx_login_credentials_username').on(table.username)],
);

export const loginSessions = sqliteTable(
  'login_sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    ownerKey: text('owner_key').notNull(),
    credentialVersion: text('credential_version').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (table) => [
    index('idx_login_sessions_owner').on(table.ownerKey),
    index('idx_login_sessions_expiry').on(table.expiresAt),
  ],
);

export const registrationSettings = sqliteTable('registration_settings', {
  id: integer('id').primaryKey(),
  enabled: integer('enabled').notNull().default(1),
  updatedAt: integer('updated_at'),
});

export const loginAttempts = sqliteTable(
  'login_attempts',
  {
    bucketKey: text('bucket_key').primaryKey(),
    hits: integer('hits').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (table) => [index('idx_login_attempts_expiry').on(table.expiresAt)],
);

export const interviewExperiences = sqliteTable(
  'interview_experiences',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    company: text('company').notNull().default(''),
    role: text('role').notNull().default(''),
    round: text('round').notNull().default(''),
    interviewDate: text('interview_date').notNull().default(''),
    sourceUrl: text('source_url').notNull().default(''),
    content: text('content').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    ownerKey: text('owner_key').notNull(),
  },
  (table) => [
    index('idx_interview_experiences_owner_updated').on(
      table.ownerKey,
      table.updatedAt,
    ),
  ],
);
