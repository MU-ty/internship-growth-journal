CREATE TABLE `login_attempts` (
	`bucket_key` text PRIMARY KEY NOT NULL,
	`hits` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_login_attempts_expiry` ON `login_attempts` (`expires_at`);--> statement-breakpoint
CREATE TABLE `login_credentials` (
	`owner_key` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`version` text NOT NULL,
	`account_name` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_login_credentials_username` ON `login_credentials` (`username`);--> statement-breakpoint
CREATE TABLE `login_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`owner_key` text NOT NULL,
	`credential_version` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_login_sessions_owner` ON `login_sessions` (`owner_key`);--> statement-breakpoint
CREATE INDEX `idx_login_sessions_expiry` ON `login_sessions` (`expires_at`);