import {sqliteTable,text,integer,uniqueIndex,check} from 'drizzle-orm/sqlite-core';
import {sql} from 'drizzle-orm';
export const workflows=sqliteTable('workflows',{id:text('id').primaryKey(),owner:text('owner').notNull(),revision:integer('revision').notNull(),lastOperation:text('last_operation').notNull(),body:text('body').notNull()},t=>[uniqueIndex('idx_workflows_owner_id').on(t.owner,t.id)]);
export const operations=sqliteTable('operations',{key:text('key').primaryKey(),owner:text('owner').notNull(),id:text('id').notNull(),workflowId:text('workflow_id').notNull(),hash:text('hash').notNull(),receipt:text('receipt').notNull()},t=>[uniqueIndex('idx_operations_owner_id').on(t.owner,t.id)]);
export const events=sqliteTable('events',{id:integer('id').primaryKey({autoIncrement:true}),owner:text('owner').notNull(),workflowId:text('workflow_id').notNull(),revision:integer('revision').notNull(),body:text('body').notNull()},t=>[uniqueIndex('idx_events_workflow_revision').on(t.owner,t.workflowId,t.revision)]);
export const mutationGuard=sqliteTable('mutation_guard',{id:text('id').primaryKey(),ok:integer('ok').notNull()},t=>[check('require_operation_receipt',sql`${t.ok}=1`)]);
