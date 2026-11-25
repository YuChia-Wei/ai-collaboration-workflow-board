CREATE TABLE `portfolio_backlog_items` (
	`owner` text NOT NULL,
	`store_id` text NOT NULL,
	`project_id` text NOT NULL,
	`item_id` text NOT NULL,
	`parent_id` text,
	`position` integer NOT NULL,
	`revision` integer NOT NULL,
	`body` text NOT NULL,
	PRIMARY KEY(`owner`, `store_id`, `project_id`, `item_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_portfolio_backlog_revision` ON `portfolio_backlog_items` (`owner`,`store_id`,`project_id`,`revision`);