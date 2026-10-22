import {command as execute} from '../../Core/Workflows/Application/legacy.mjs';
const command=(repository,owner,c)=>execute(repository,owner,c,{now:()=> '2026-10-07T00:00:00.000Z'});
export async function seed(repository,owner){
 for(const [id,title,goal,next] of [['demo-travel','旅行手冊整理','把合成旅行資訊整理成可交接的手冊。','補上雨天備案並修訂交通文件'],['demo-reading','週末讀書角','試用文件修訂與心得紀錄，不是真實專案進度。','整理第二份閱讀心得'],['demo-cooking','料理筆記整備','示範受控步驟與證據關聯。','核對份量並更新準備步驟']]){
  if(await repository.legacy.load(owner,id))continue;
  let rev=0,n=0;const write=async(type,payload)=>{const r=await command(repository,owner,{type,payload,workflow_id:id,expected_revision:rev,operation_id:`seed-${id}-${++n}`});rev=r.revision};
  await write('create_workflow',{title,goal,next_step:next,next_owner:'示範紀錄者'});
  await write('add_step',{id:'S1',title:'整理資料與初稿',owner_skill:'示範紀錄者'});await write('add_step',{id:'S2',title:'補充例外情況與交接',owner_skill:'示範審閱者'});
  await write('document',{id:'plan',action:'create',name:'工作計畫',content:`# ${title}\n\n這是合成示範資料，不對應任何真實工作。\n\n## 目標\n${goal}\n\n## 下一步\n${next}`,required:true,final:true});
  await write('evidence',{id:'E1',command:'synthetic fixture check','result':'合成初稿檢查通過；不是真實執行結果。',outcome:'passed',source_commit:'synthetic-v1',environment:{mode:'synthetic'}});
  await write('update_step',{id:'S1',status:'active'});await write('update_step',{id:'S1',status:'completed',result:'合成初稿已整理',evidence_ids:['E1']});
  await write('update_workflow',{status:'active'});await write('log',{text:'已保存合成初稿，保留原始文件與檢查紀錄。'});
  await write('handoff',{next_step:next,next_owner:'示範審閱者',blockers:[],failures:[],limitations:['只含合成資料','未接入本機 coding agent','附件上傳與完整遷移尚未提供']});
 }
}
