CREATE TABLE `portfolio_catalogs` (
	`owner` text NOT NULL,
	`store_id` text NOT NULL,
	`project_id` text NOT NULL,
	`revision` integer NOT NULL,
	`body` text NOT NULL,
	PRIMARY KEY(`owner`, `store_id`, `project_id`)
);
