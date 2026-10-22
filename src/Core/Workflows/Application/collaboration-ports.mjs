/**
 * Collaboration/1 ports. Command/query use cases and D1/HTTP/MCP adapters have
 * local integration coverage; hosted deployment and client acceptance are separate.
 * Normative DTOs and state/transaction rules: src/Contracts/CollaborationV1/.
 * SQL rows, HTTP requests, response status and secrets are not port values.
 *
 * @typedef {{subject_id:string,kind:'human'|'agent',binding_id:string}} ActorRef
 * @typedef {{owner_id:string,actor:ActorRef,capabilities:readonly string[]}} AccessContext
 * @typedef {{store_id:string,namespace:'personal',record_kind:'collaboration',workflow_id:string}} WorkflowRef
 * @typedef {{now:()=>string}} Clock
 * @typedef {{next:(kind:'assignment'|'handoff'|'checkpoint')=>string}} IdFactory Returns a fresh, collision-resistant ID, never a reused history ID
 * @typedef {Record<string,any>} CommandState Domain-owned, complete invariant state, never a truncated read projection
 * @typedef {Record<string,any>} WireMessage Validated against the named schema.json definition
 * @typedef {{state:CommandState,invariants_complete:true}} LoadedWorkflow
 * @typedef {{owner_id:string,ref:WorkflowRef,expected_revision:number,operation_key:string,digest:string,actor:ActorRef,next_state:CommandState,facts:{documents:WireMessage[],task_definitions:WireMessage[],decision_revisions:WireMessage[],assignments:WireMessage[],handoffs:WireMessage[],checkpoints:WireMessage[],evidence:WireMessage[]},events:WireMessage[],receipt:WireMessage}} AtomicAcceptance
 * @typedef {{outcome:'accepted'|'rejected',receipt:WireMessage}|{outcome:'unknown'}} OperationOutcome
 *
 * @typedef {object} CollaborationRepository
 * @property {(owner:string,ref:WorkflowRef,command:WireMessage)=>Promise<(LoadedWorkflow & {document_refs:WireMessage[],evidence:WireMessage[]})|null>} loadForCommand
 * @property {(owner:string,storeId:string,operationId:string)=>Promise<OperationOutcome>} operation
 * @property {(change:AtomicAcceptance)=>Promise<OperationOutcome>} accept
 * @property {(owner:string,ref:WorkflowRef,operationKey:string,digest:string,receipt:WireMessage)=>Promise<OperationOutcome>} reject
 *
 * accept serializes with competing accept/reject for the owner/store/operation
 * key. It checks any prior digest first, then CAS, and commits all accepted
 * effects + receipt or none. reject durably records only a definitive rejection,
 * never a domain event/state change. Both must recheck the operation binding;
 * concurrent attempts cannot produce contradictory outcomes or overwrite one.
 * Assignment facts are immutable lifecycle snapshots identified by assignment
 * ref plus workflow_revision; closing appends a fact instead of overwriting
 * the original claim. History is loaded only as needed for reference validation.
 * A driver exception may mean an unknown outcome. Application looks up the
 * original operation; absence must never be interpreted as a safe new attempt.
 *
 * @typedef {object} CollaborationQueries
 * @property {(access:AccessContext,query:WireMessage)=>Promise<WireMessage>} find
 * @property {(access:AccessContext,ref:WorkflowRef,limit:number)=>Promise<WireMessage>} context
 * @property {(access:AccessContext,ref:WorkflowRef,section:string,cursor:string)=>Promise<WireMessage>} contextPage
 * @property {(access:AccessContext,ref:WorkflowRef,taskId:string,definitionRevision:number,atRevision:number)=>Promise<WireMessage>} task
 * @property {(access:AccessContext,ref:WorkflowRef,decisionId:string,decisionRevision:number,atRevision:number)=>Promise<WireMessage>} decision
 * @property {(access:AccessContext,ref:WorkflowRef,documentRef:WireMessage)=>Promise<WireMessage>} document
 *
 * The query application implements that public behavior through an immutable
 * read repository. These values remain decoded, independent of SQL or transport:
 * @typedef {object} CollaborationReadRepository
 * @property {(owner:string,ref:WorkflowRef,revision?:number)=>Promise<CommandState|null>} snapshot Latest committed snapshot if revision is omitted; exact immutable revision otherwise
 * @property {(owner:string,ref:WorkflowRef,revision:number,kind:string)=>Promise<WireMessage[]>} facts Facts at or before the pinned revision, ordered by acceptance revision and position
 * @property {(owner:string,ref:WorkflowRef,revision:number)=>Promise<WireMessage[]>} documentRefs Exact document reference metadata at the pinned revision, excluding content
 * @property {(owner:string,ref:WorkflowRef,documentRef:WireMessage)=>Promise<WireMessage|null>} document Exact document version; application verifies requested and actual hash
 * @property {(owner:string,value:WireMessage)=>Promise<string>} saveCursor Persist an opaque cursor bound to owner and immutable query position; repeated equivalent cursors can be reused
 * @property {(owner:string,id:string)=>Promise<WireMessage|null>} cursor Never resolve another owner's cursor
 * @property {(owner:string,storeId:string)=>Promise<number>} baseline Find enumeration baseline
 * @property {(owner:string,storeId:string,q:string,baseline:number,after:string,limit:number)=>Promise<WireMessage[]>} find Latest summary per workflow at baseline; workflow ID ascending, title substring match (ASCII case-insensitive)
 *
 * Context pages/point reads pin one revision. An adapter unable to preserve that
 * snapshot returns snapshot_expired and never substitutes a newer page/version.
 * Operation lookup authenticates owner/store and checks the requested target.
 * Identity resolution, credential lifecycle and concrete cursor signing are
 * inbound/storage concerns assigned to #5/#6, not a client-supplied owner field.
 */
export {};
