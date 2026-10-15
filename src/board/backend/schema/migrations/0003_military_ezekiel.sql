CREATE TABLE `collaboration_chunks` (
	`owner` text NOT NULL,
	`store_id` text NOT NULL,
	`workflow_id` text NOT NULL,
	`revision` integer NOT NULL,
	`position` integer NOT NULL,
	`body` text NOT NULL,
	PRIMARY KEY(`owner`, `store_id`, `workflow_id`, `revision`, `position`)
);
--> statement-breakpoint
CREATE TABLE `collaboration_cursors` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`body` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `collaboration_facts` (
	`owner` text NOT NULL,
	`store_id` text NOT NULL,
	`workflow_id` text NOT NULL,
	`revision` integer NOT NULL,
	`kind` text NOT NULL,
	`position` integer NOT NULL,
	`body` text NOT NULL,
	PRIMARY KEY(`owner`, `store_id`, `workflow_id`, `revision`, `kind`, `position`)
);
--> statement-breakpoint
CREATE TABLE `collaboration_heads` (
	`owner` text NOT NULL,
	`store_id` text NOT NULL,
	`workflow_id` text NOT NULL,
	`revision` integer NOT NULL,
	`last_attempt` text NOT NULL,
	PRIMARY KEY(`owner`, `store_id`, `workflow_id`)
);
--> statement-breakpoint
CREATE TABLE `collaboration_operations` (
	`key` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`store_id` text NOT NULL,
	`workflow_id` text NOT NULL,
	`operation_id` text NOT NULL,
	`digest` text NOT NULL,
	`attempt` text NOT NULL,
	`outcome` text NOT NULL,
	`receipt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_collaboration_operation_scope` ON `collaboration_operations` (`owner`,`store_id`,`operation_id`);--> statement-breakpoint
CREATE TABLE `collaboration_snapshots` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner` text NOT NULL,
	`store_id` text NOT NULL,
	`workflow_id` text NOT NULL,
	`revision` integer NOT NULL,
	`summary` text NOT NULL,
	`chunk_count` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_collaboration_snapshot` ON `collaboration_snapshots` (`owner`,`store_id`,`workflow_id`,`revision`);