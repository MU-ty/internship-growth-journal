CREATE TABLE `contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`relationship` text NOT NULL,
	`value` text NOT NULL,
	`direction` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `internships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company` text NOT NULL,
	`role` text NOT NULL,
	`period` text DEFAULT '' NOT NULL,
	`summary` text NOT NULL,
	`highlights` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
