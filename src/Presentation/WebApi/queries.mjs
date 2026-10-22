/** Preserve the existing HTTP query coercions at the transport boundary. */
export function listQuery(params){
 return {
  q:params.get('q')||'',status:params.get('status'),kind:params.get('kind'),
  owner_skill:params.get('owner_skill'),mode:params.get('mode'),
  offset:Math.max(0,Number.parseInt(params.get('offset')||'0',10)||0),
  limit:Math.min(50,Math.max(1,Number.parseInt(params.get('limit')||'30',10)||30))
 };
}
