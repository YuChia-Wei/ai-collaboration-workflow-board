import {deliveryChange} from '../Domain/delivery.mjs';
import {demand,Fault} from '../Domain/errors.mjs';

// Portfolio owns authorization and digest replay. This model has its own
// concurrency boundary and never writes PBI or workflow lifecycle state.
export async function executeDelivery({owner,c,digest,portfolio,clock}) {
  const data=await portfolio.delivery(owner,c.store_id,c.project_id);
  let change=null, failure=null;
  try {
    demand(data.revision===c.expected_revision,'revision_conflict','conflict',{current_revision:data.revision});
    const ids=c.scope?.map(entry=>entry.item_id) ?? (c.item_id ? [c.item_id] : []);
    const items=await portfolio.selectedBacklogItems(owner,c.store_id,c.project_id,ids);
    change=deliveryChange(data,c,items,clock.now());
  } catch(error) {
    if(!(error instanceof Fault) || error.category==='unavailable') throw error;
    failure={error:error.error, category:error.category, details:error.details};
  }
  await portfolio.saveDelivery(owner,c,digest,change,failure);
}
