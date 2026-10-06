CREATE TABLE `board_documents` (
	`owner` text NOT NULL,
	`workflow_id` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`body` text NOT NULL,
	PRIMARY KEY(`owner`, `workflow_id`, `id`)
);
--> statement-breakpoint
CREATE TABLE `board_entries` (
	`owner` text NOT NULL,
	`workflow_id` text NOT NULL,
	`id` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` text NOT NULL,
	`body` text NOT NULL,
	PRIMARY KEY(`owner`, `workflow_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `idx_board_entries_kind` ON `board_entries` (`owner`,`workflow_id`,`kind`);--> statement-breakpoint
CREATE TABLE `board_revisions` (
	`owner` text NOT NULL,
	`workflow_id` text NOT NULL,
	`document_id` text NOT NULL,
	`revision` integer NOT NULL,
	`content` text NOT NULL,
	`hash` text NOT NULL,
	`final` integer NOT NULL,
	`relation` text,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner`, `workflow_id`, `document_id`, `revision`)
);
--> statement-breakpoint
CREATE TABLE `board_tasks` (
	`owner` text NOT NULL,
	`workflow_id` text NOT NULL,
	`id` text NOT NULL,
	`status` text NOT NULL,
	`owner_skill` text NOT NULL,
	`body` text NOT NULL,
	PRIMARY KEY(`owner`, `workflow_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `idx_board_tasks_status` ON `board_tasks` (`owner`,`workflow_id`,`status`);--> statement-breakpoint
CREATE TABLE `board_workflows` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`owner_skill` text NOT NULL,
	`updated_at` text NOT NULL,
	`revision` integer NOT NULL,
	`last_operation` text NOT NULL,
	`body` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE INDEX `idx_board_workflows_filter` ON `board_workflows` (`owner`,`status`,`kind`,`updated_at`);