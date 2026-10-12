import {createBoardRepository} from './board-repository.mjs';
import {createLegacyRepository} from './legacy-repository.mjs';
import {createSourceRepository} from './source-repository.mjs';

// D1-specific SQL and guarded atomic batches are contained in outbound adapters.
export function createD1Repositories(db){
 return {
  board:createBoardRepository(db),legacy:createLegacyRepository(db),source:createSourceRepository(db),
  operations:{find:key=>db.prepare('SELECT hash,receipt FROM operations WHERE key=?').bind(key).first(),byOwner:(owner,id)=>db.prepare('SELECT receipt FROM operations WHERE owner=? AND id=?').bind(owner,id).first()},
  async listRows(owner){return Promise.all([
   db.prepare('SELECT body FROM board_workflows WHERE owner=? ORDER BY updated_at DESC LIMIT 5000').bind(owner).all(),
   db.prepare('SELECT body FROM workflows WHERE owner=? ORDER BY rowid DESC LIMIT 5000').bind(owner).all(),
   db.prepare('SELECT workflow_id,status,COUNT(*) AS count FROM board_tasks WHERE owner=? GROUP BY workflow_id,status').bind(owner).all(),
   db.prepare('SELECT workflow_id,COUNT(*) AS count FROM board_documents WHERE owner=? GROUP BY workflow_id').bind(owner).all()
  ]);}
 };
}
