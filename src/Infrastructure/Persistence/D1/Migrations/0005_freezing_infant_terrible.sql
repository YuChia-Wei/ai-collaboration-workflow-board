CREATE TABLE `source_replica_chunks` (
	`version_key` text NOT NULL,
	`path` text NOT NULL,
	`position` integer NOT NULL,
	`content_base64` text NOT NULL,
	`chunk_hash` text NOT NULL,
	PRIMARY KEY(`version_key`, `path`, `position`)
);
--> statement-breakpoint
CREATE TABLE `source_replica_cursors` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`body` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_replica_heads` (
	`key` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`store_id` text NOT NULL,
	`project_id` text NOT NULL,
	`source_id` text NOT NULL,
	`workflow_id` text NOT NULL,
	`source_revision` text NOT NULL,
	`revision` integer NOT NULL,
	`version_key` text NOT NULL,
	`last_attempt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_source_replica_scope` ON `source_replica_heads` (`owner`,`store_id`,`project_id`,`key`);--> statement-breakpoint
CREATE TABLE `source_replica_operations` (
	`key` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`store_id` text NOT NULL,
	`project_id` text NOT NULL,
	`operation_id` text NOT NULL,
	`digest` text NOT NULL,
	`attempt` text NOT NULL,
	`accepted` integer NOT NULL,
	`receipt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_replica_versions` (
	`key` text PRIMARY KEY NOT NULL,
	`manifest_hash` text NOT NULL,
	`manifest` text NOT NULL,
	`published_revision` integer
);
