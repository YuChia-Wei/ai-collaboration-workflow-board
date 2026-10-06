CREATE TABLE `source_documents` (
	`key` text PRIMARY KEY NOT NULL,
	`dataset` text NOT NULL,
	`workflow_id` text NOT NULL,
	`document_id` text NOT NULL,
	`body` text NOT NULL,
	`hash` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_source_documents_dataset_workflow_document` ON `source_documents` (`dataset`,`workflow_id`,`document_id`);--> statement-breakpoint
CREATE TABLE `source_records` (
	`key` text PRIMARY KEY NOT NULL,
	`dataset` text NOT NULL,
	`workflow_id` text NOT NULL,
	`body` text NOT NULL,
	`hash` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_source_records_dataset_workflow` ON `source_records` (`dataset`,`workflow_id`);--> statement-breakpoint
CREATE TABLE `source_state` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
