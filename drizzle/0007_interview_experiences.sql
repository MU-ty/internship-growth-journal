CREATE TABLE `interview_experiences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`company` text DEFAULT '' NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`round` text DEFAULT '' NOT NULL,
	`interview_date` text DEFAULT '' NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`owner_key` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_interview_experiences_owner_updated` ON `interview_experiences` (`owner_key`,`updated_at`);