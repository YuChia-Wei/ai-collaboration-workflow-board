import {sqliteTable,text,integer,uniqueIndex,check,primaryKey,index} from 'drizzle-orm/sqlite-core';
import {sql} from 'drizzle-orm';
export const workflows=sqliteTable('workflows',{id:text('id').primaryKey(),owner:text('owner').notNull(),revision:integer('revision').notNull(),lastOperation:text('last_operation').notNull(),body:text('body').notNull()},t=>[uniqueIndex('idx_workflows_owner_id').on(t.owner,t.id)]);
export const operations=sqliteTable('operations',{key:text('key').primaryKey(),owner:text('owner').notNull(),id:text('id').notNull(),workflowId:text('workflow_id').notNull(),hash:text('hash').notNull(),receipt:text('receipt').notNull()},t=>[uniqueIndex('idx_operations_owner_id').on(t.owner,t.id)]);
export const events=sqliteTable('events',{id:integer('id').primaryKey({autoIncrement:true}),owner:text('owner').notNull(),workflowId:text('workflow_id').notNull(),revision:integer('revision').notNull(),body:text('body').notNull()},t=>[uniqueIndex('idx_events_workflow_revision').on(t.owner,t.workflowId,t.revision)]);
export const mutationGuard=sqliteTable('mutation_guard',{id:text('id').primaryKey(),ok:integer('ok').notNull()},t=>[check('require_operation_receipt',sql`${t.ok}=1`)]);
export const sourceRecords=sqliteTable('source_records',{key:text('key').primaryKey(),dataset:text('dataset').notNull(),workflowId:text('workflow_id').notNull(),body:text('body').notNull(),hash:text('hash').notNull()},t=>[uniqueIndex('idx_source_records_dataset_workflow').on(t.dataset,t.workflowId)]);
export const sourceDocuments=sqliteTable('source_documents',{key:text('key').primaryKey(),dataset:text('dataset').notNull(),workflowId:text('workflow_id').notNull(),documentId:text('document_id').notNull(),body:text('body').notNull(),hash:text('hash').notNull()},t=>[uniqueIndex('idx_source_documents_dataset_workflow_document').on(t.dataset,t.workflowId,t.documentId)]);
export const sourceState=sqliteTable('source_state',{key:text('key').primaryKey(),value:text('value').notNull()});
// Append-only schema upgrade. Imported Git rows and legacy aggregates stay intact.
export const boardWorkflows=sqliteTable('board_workflows',{
 owner:text('owner').notNull(),id:text('id').notNull(),kind:text('kind').notNull(),title:text('title').notNull(),status:text('status').notNull(),ownerSkill:text('owner_skill').notNull(),updatedAt:text('updated_at').notNull(),revision:integer('revision').notNull(),lastOperation:text('last_operation').notNull(),body:text('body').notNull()
},t=>[primaryKey({columns:[t.owner,t.id]}),index('idx_board_workflows_filter').on(t.owner,t.status,t.kind,t.updatedAt)]);
export const boardTasks=sqliteTable('board_tasks',{
 owner:text('owner').notNull(),workflowId:text('workflow_id').notNull(),id:text('id').notNull(),status:text('status').notNull(),ownerSkill:text('owner_skill').notNull(),body:text('body').notNull()
},t=>[primaryKey({columns:[t.owner,t.workflowId,t.id]}),index('idx_board_tasks_status').on(t.owner,t.workflowId,t.status)]);
export const boardDocuments=sqliteTable('board_documents',{
 owner:text('owner').notNull(),workflowId:text('workflow_id').notNull(),id:text('id').notNull(),name:text('name').notNull(),body:text('body').notNull()
},t=>[primaryKey({columns:[t.owner,t.workflowId,t.id]})]);
export const boardRevisions=sqliteTable('board_revisions',{
 owner:text('owner').notNull(),workflowId:text('workflow_id').notNull(),documentId:text('document_id').notNull(),revision:integer('revision').notNull(),content:text('content').notNull(),hash:text('hash').notNull(),final:integer('final').notNull(),relation:text('relation'),createdAt:text('created_at').notNull()
},t=>[primaryKey({columns:[t.owner,t.workflowId,t.documentId,t.revision]})]);
export const boardEntries=sqliteTable('board_entries',{
 owner:text('owner').notNull(),workflowId:text('workflow_id').notNull(),id:text('id').notNull(),kind:text('kind').notNull(),createdAt:text('created_at').notNull(),body:text('body').notNull()
},t=>[primaryKey({columns:[t.owner,t.workflowId,t.id]}),index('idx_board_entries_kind').on(t.owner,t.workflowId,t.kind)]);

// collaboration/1 has separate operation keys, immutable snapshots and facts.
const collaborationScope=()=>({owner:text('owner').notNull(),storeId:text('store_id').notNull(),workflowId:text('workflow_id').notNull()});
export const collaborationHeads=sqliteTable('collaboration_heads',{
 ...collaborationScope(),revision:integer('revision').notNull(),lastAttempt:text('last_attempt').notNull()
},t=>[primaryKey({columns:[t.owner,t.storeId,t.workflowId]})]);
export const collaborationOperations=sqliteTable('collaboration_operations',{
 key:text('key').primaryKey(),...collaborationScope(),operationId:text('operation_id').notNull(),digest:text('digest').notNull(),attempt:text('attempt').notNull(),outcome:text('outcome').notNull(),receipt:text('receipt').notNull()
},t=>[uniqueIndex('idx_collaboration_operation_scope').on(t.owner,t.storeId,t.operationId)]);
export const collaborationSnapshots=sqliteTable('collaboration_snapshots',{
 seq:integer('seq').primaryKey({autoIncrement:true}),...collaborationScope(),revision:integer('revision').notNull(),summary:text('summary').notNull(),chunkCount:integer('chunk_count').notNull()
},t=>[uniqueIndex('idx_collaboration_snapshot').on(t.owner,t.storeId,t.workflowId,t.revision)]);
export const collaborationChunks=sqliteTable('collaboration_chunks',{
 ...collaborationScope(),revision:integer('revision').notNull(),position:integer('position').notNull(),body:text('body').notNull()
},t=>[primaryKey({columns:[t.owner,t.storeId,t.workflowId,t.revision,t.position]})]);
export const collaborationFacts=sqliteTable('collaboration_facts',{
 ...collaborationScope(),revision:integer('revision').notNull(),kind:text('kind').notNull(),position:integer('position').notNull(),body:text('body').notNull()
},t=>[primaryKey({columns:[t.owner,t.storeId,t.workflowId,t.revision,t.kind,t.position]})]);
export const collaborationCursors=sqliteTable('collaboration_cursors',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),body:text('body').notNull()
});
