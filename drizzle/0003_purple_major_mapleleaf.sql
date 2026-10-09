CREATE INDEX `idx_contacts_owner_key` ON `contacts` (`owner_key`);--> statement-breakpoint
CREATE INDEX `idx_foundations_owner_key` ON `foundation_topics` (`owner_key`);--> statement-breakpoint
CREATE INDEX `idx_internships_owner_key` ON `internships` (`owner_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_leetcode_owner_order` ON `leetcode_problems` (`owner_key`,`order_no`);--> statement-breakpoint
PRAGMA optimize;
