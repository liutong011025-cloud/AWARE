CREATE TABLE `source_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `study_assignments` (
	`username` text PRIMARY KEY NOT NULL,
	`condition` text NOT NULL,
	`source_set_id` text NOT NULL,
	`updated` integer NOT NULL,
	FOREIGN KEY (`source_set_id`) REFERENCES `source_sets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `writing_sessions` ADD `condition` text;--> statement-breakpoint
ALTER TABLE `writing_sessions` ADD `source_set_id` text;--> statement-breakpoint
ALTER TABLE `writing_sessions` ADD `source_data` text;--> statement-breakpoint
ALTER TABLE `writing_sessions` ADD `task_title` text;