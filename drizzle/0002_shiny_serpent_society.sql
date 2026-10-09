ALTER TABLE `contacts` ADD `owner_key` text DEFAULT 'mty' NOT NULL;--> statement-breakpoint
ALTER TABLE `foundation_topics` ADD `owner_key` text DEFAULT 'mty' NOT NULL;--> statement-breakpoint
ALTER TABLE `internships` ADD `owner_key` text DEFAULT 'mty' NOT NULL;--> statement-breakpoint
ALTER TABLE `leetcode_problems` ADD `language` text DEFAULT 'JavaScript' NOT NULL;--> statement-breakpoint
ALTER TABLE `leetcode_problems` ADD `code` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `leetcode_problems` ADD `owner_key` text DEFAULT 'mty' NOT NULL;