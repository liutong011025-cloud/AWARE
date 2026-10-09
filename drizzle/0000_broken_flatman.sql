CREATE TABLE `auth_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`username` text NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `writing_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `events_session` ON `events` (`session_id`);--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`since` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `writing_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`html` text DEFAULT '' NOT NULL,
	`plain_text` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`elapsed` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sessions_user` ON `writing_sessions` (`username`);