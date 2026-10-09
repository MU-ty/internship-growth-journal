import { env } from 'cloudflare:workers';

let ready: Promise<void> | undefined;

export function ensureDatabase() {
  ready ??= env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS internships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      period TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL,
      highlights TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      relationship TEXT NOT NULL,
      value TEXT NOT NULL,
      direction TEXT NOT NULL,
      closeness INTEGER NOT NULL DEFAULT 2,
      created_at INTEGER NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS leetcode_problems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT '未开始',
      confidence INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      updated_at INTEGER NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS foundation_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      area TEXT NOT NULL,
      topic TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT '待学习',
      confidence INTEGER NOT NULL DEFAULT 0,
      last_reviewed TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    )`),
  ]).then(() => undefined);
  return ready;
}
