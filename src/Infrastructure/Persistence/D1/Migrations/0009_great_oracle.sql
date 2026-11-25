CREATE TABLE `portfolio_sprint_settings` (
	`owner` text NOT NULL,
	`store_id` text NOT NULL,
	`project_id` text NOT NULL,
	`duration_weeks` integer NOT NULL,
	`start_weekday` integer NOT NULL,
	`revision` integer NOT NULL,
	PRIMARY KEY(`owner`, `store_id`, `project_id`)
);
--> statement-breakpoint
CREATE TABLE `portfolio_sprints` (
	`owner` text NOT NULL,
	`store_id` text NOT NULL,
	`project_id` text NOT NULL,
	`sprint_id` text NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`revision` integer NOT NULL,
	PRIMARY KEY(`owner`, `store_id`, `project_id`, `sprint_id`)
);
