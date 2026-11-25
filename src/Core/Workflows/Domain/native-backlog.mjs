import {demand} from './errors.mjs';
import {initialHistory,legacyHistory,transitionItem} from './pbi-lifecycle.mjs';

const parentKind={epic:null,feature:'epic',user_story:'feature',task:'user_story',bug:null};

// Each sibling list is independently ordered. A move keeps the item's parent.
export function changeBacklog(backlog,command,time,actor,flows){
 const byId=new Map(backlog.items.map(item=>[item.item_id,item]));
 const previous=byId.get(command.item_id);
 const create=command.command==='backlog.create';
 if(create)demand(!previous,'item_exists','conflict');
 else demand(previous,'item_not_found','not_found');

 const parentId=create?command.parent_id:previous.parent_id;
 const siblings=backlog.items.filter(item=>item.parent_id===parentId);
 const from=siblings.findIndex(item=>item.item_id===command.item_id);
 const itemVersion={source_version:String(backlog.revision+1),updated_at:time};
 if(command.command==='backlog.transition'){
  const history=transitionItem(previous,command,flows[previous.kind],byId,time,actor,backlog.revision+1);
  return {item:{...previous,...itemVersion,status:history.to.category,state_id:history.to.id},position:from,from,history};
 }
 if(command.command==='backlog.move'){
  let position=siblings.length-1;
  if(command.before_id!==null){
   const target=byId.get(command.before_id);
   demand(target,'item_not_found','not_found');
   demand(target.parent_id===parentId,'different_parent','conflict');
   const before=siblings.findIndex(item=>item.item_id===command.before_id);
   position=before>from?before-1:before;
  }
  return {item:{...previous,...itemVersion},position,from};
 }
 const kind=create?command.kind:previous.kind;
 if(create){
  const required=parentKind[kind];
  if(required===null)demand(parentId===null,'invalid_parent');
  else demand(parentId!==null&&byId.get(parentId)?.kind===required,'invalid_parent');
 }
 if(kind==='bug'){
  demand(command.expected_behavior.trim()&&command.actual_behavior.trim(),'bug_behavior_required');
  demand(command.related_story_id===null||byId.get(command.related_story_id)?.kind==='user_story','invalid_related_story');
 }else demand(command.expected_behavior===''&&command.actual_behavior===''&&command.related_story_id===null,'unexpected_bug_fields');
 let history=null;
 if(create)history=initialHistory(flows[kind],time,actor,backlog.revision+1);
 else if(previous.status!==command.status){
  demand(!previous.state_id,'lifecycle_transition_required','conflict');
  history=legacyHistory(previous.status,command.status,time,actor,backlog.revision+1);
 }
 const item={source:'native',item_id:command.item_id,kind,parent_id:parentId,title:command.title,description:command.description,
  related_story_id:command.related_story_id,expected_behavior:command.expected_behavior,actual_behavior:command.actual_behavior,
  status:create?'open':command.status,state_id:create?history.to.id:previous.state_id??null,...itemVersion};
 return {item,position:create?siblings.length:from,from,history};
}
