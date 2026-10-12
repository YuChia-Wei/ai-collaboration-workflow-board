import {Fault} from '../../domain/errors.mjs';
import {canonicalJson} from '../../domain/collaboration-values.mjs';

const clone=value=>structuredClone(value);
/** Synthetic atomic port implementation. It makes no D1/provider guarantee. */
export function memoryCollaborationRepository(){
 const states=new Map(),operations=new Map(),facts=new Map(),events=[];
 const key=(owner,ref)=>canonicalJson([owner,ref.store_id,ref.namespace,ref.workflow_id]);
 const operation=(owner,store,id)=>canonicalJson([owner,store,id]);
 const history=k=>facts.get(k)??{documents:[],task_definitions:[],decision_revisions:[],assignments:[],handoffs:[],checkpoints:[],evidence:[]};
 const replay=(k,digest)=>{const prior=operations.get(k);if(prior&&prior.receipt.request_digest!==digest)throw new Fault('operation_payload_conflict','conflict');return prior?clone(prior):null;};
 const api={
  failBeforeCommit:false,loseResponse:false,incomplete:false,acceptCalls:0,
  state:(owner,ref)=>clone(states.get(key(owner,ref))??null),
  history:(owner,ref)=>clone(history(key(owner,ref))),
  domainSnapshot:()=>canonicalJson({states:[...states],facts:[...facts],events}),
  async operation(owner,store,id){return clone(operations.get(operation(owner,store,id))??{outcome:'unknown'});},
  async loadForCommand(owner,ref){
   const k=key(owner,ref),state=states.get(k);if(!state)return null;
   return {state:clone(state),invariants_complete:!api.incomplete,document_refs:history(k).documents.map(document=>clone(document.ref)),evidence:clone(history(k).evidence)};
  },
  async reject(owner,ref,k,digest,receipt){
   const prior=replay(k,digest);if(prior)return prior;
   if(api.failBeforeCommit)throw Error('storage unavailable before rejection');
   const result={outcome:'rejected',receipt:clone(receipt)};operations.set(k,result);return clone(result);
  },
  async accept(change){
   api.acceptCalls++;
   const prior=replay(change.operation_key,change.digest);if(prior)return prior;
   if(api.failBeforeCommit)throw Error('storage unavailable before accept');
   const k=key(change.owner_id,change.ref),current=states.get(k);
   if((current?.revision??0)!==change.expected_revision){
    const {accepted,before_revision,revision,accepted_at,effects,...base}=change.receipt;
    return api.reject(change.owner_id,change.ref,change.operation_key,change.digest,{...base,accepted:false,expected_revision:change.expected_revision,current_revision:current?.revision??null,recorded_at:accepted_at,failure:{error:'revision_conflict',category:'conflict',details:{current_revision:current?.revision??null}}});
   }
   const appended=clone(history(k));
   for(const [kind,items] of Object.entries(change.facts))appended[kind].push(...clone(items));
   // A single synchronous commit point in this test double.
   states.set(k,clone(change.next_state));facts.set(k,appended);events.push(...clone(change.events));
   const result={outcome:'accepted',receipt:clone(change.receipt)};operations.set(change.operation_key,result);
   if(api.loseResponse)throw Error('response lost after acceptance');
   return clone(result);
  }
 };
 return api;
}
