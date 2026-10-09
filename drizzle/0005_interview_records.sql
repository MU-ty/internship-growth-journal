CREATE TABLE `interviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company` text NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`status` text DEFAULT '已投递' NOT NULL,
	`interview_date` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`owner_key` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_interviews_owner_updated` ON `interviews` (`owner_key`,`updated_at`);