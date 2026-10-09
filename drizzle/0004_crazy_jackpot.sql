CREATE TABLE `quick_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text DEFAULT '未命名笔记' NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`owner_key` text DEFAULT 'mty' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_quick_notes_owner_updated` ON `quick_notes` (`owner_key`,`updated_at`);
--> statement-breakpoint
PRAGMA optimize;
