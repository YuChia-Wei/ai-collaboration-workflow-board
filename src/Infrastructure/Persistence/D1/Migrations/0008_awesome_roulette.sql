CREATE TABLE `portfolio_delivery_records` (
	`owner` text NOT NULL,
	`store_id` text NOT NULL,
	`project_id` text NOT NULL,
	`kind` text NOT NULL,
	`id` text NOT NULL,
	`revision` integer NOT NULL,
	`body` text NOT NULL,
	PRIMARY KEY(`owner`, `store_id`, `project_id`, `kind`, `id`)
);
--> statement-breakpoint
CREATE TABLE `portfolio_item_transitions` (
	`owner` text NOT NULL,
	`store_id` text NOT NULL,
	`project_id` text NOT NULL,
	`item_id` text NOT NULL,
	`revision` integer NOT NULL,
	`body` text NOT NULL,
	PRIMARY KEY(`owner`, `store_id`, `project_id`, `item_id`, `revision`)
);
--> statement-breakpoint
CREATE TABLE `portfolio_lifecycles` (
	`owner` text NOT NULL,
	`store_id` text NOT NULL,
	`project_id` text NOT NULL,
	`revision` integer NOT NULL,
	`body` text NOT NULL,
	PRIMARY KEY(`owner`, `store_id`, `project_id`)
);
