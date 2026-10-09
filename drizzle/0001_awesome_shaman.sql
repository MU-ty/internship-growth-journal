CREATE TABLE `foundation_topics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`area` text NOT NULL,
	`topic` text NOT NULL,
	`status` text DEFAULT '待学习' NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`last_reviewed` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `leetcode_problems` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_no` integer NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`difficulty` text NOT NULL,
	`status` text DEFAULT '未开始' NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `contacts` ADD `closeness` integer DEFAULT 2 NOT NULL;