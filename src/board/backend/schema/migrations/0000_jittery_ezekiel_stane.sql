CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner` text NOT NULL,
	`workflow_id` text NOT NULL,
	`revision` integer NOT NULL,
	`body` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_events_workflow_revision` ON `events` (`owner`,`workflow_id`,`revision`);--> statement-breakpoint
CREATE TABLE `mutation_guard` (
	`id` text PRIMARY KEY NOT NULL,
	`ok` integer NOT NULL,
	CONSTRAINT "require_operation_receipt" CHECK("mutation_guard"."ok"=1)
);
--> statement-breakpoint
CREATE TABLE `operations` (
	`key` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`workflow_id` text NOT NULL,
	`hash` text NOT NULL,
	`receipt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_operations_owner_id` ON `operations` (`owner`,`id`);--> statement-breakpoint
CREATE TABLE `workflows` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`revision` integer NOT NULL,
	`last_operation` text NOT NULL,
	`body` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workflows_owner_id` ON `workflows` (`owner`,`id`);