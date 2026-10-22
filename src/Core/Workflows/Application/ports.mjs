/**
 * Outbound ports used by application services. Implementations return domain
 * records; application code does not receive D1 statements or SQL connections.
 *
 * These are the implemented manual/legacy ports, not collaboration/1 storage.
 * Encoding/decoding database JSON and unwrapping driver result envelopes belong
 * to the storage adapter. Query arrays retain the documented repository order.
 *
 * @typedef {Record<string,any>} RecordValue
 * @typedef {{now:()=>string}} Clock UTC timestamp with milliseconds
 * @typedef {{dataset:string,list:(dataset:string|null)=>RecordValue[],find:(dataset:string,id:string)=>RecordValue|null}} SourceProjection
 * @typedef {{load:(owner:string,id:string)=>Promise<RecordValue|null>,document:(owner:string,id:string,documentId:string,revision:number)=>Promise<RecordValue>,revision:(owner:string,id:string)=>Promise<number|undefined>,commit:(change:RecordValue)=>Promise<void>}} BoardRepository
 * @typedef {{load:(owner:string,id:string)=>Promise<RecordValue|null>,revision:(owner:string,id:string)=>Promise<number|undefined>,commit:(change:RecordValue)=>Promise<void>}} LegacyRepository
 * @typedef {{active:()=>Promise<string|null>,exists:(id:string)=>Promise<boolean>,record:(id:string)=>Promise<{dataset:string,workflow:RecordValue}|null>,document:(id:string,documentId:string)=>Promise<RecordValue|null>,detail:(id:string)=>Promise<RecordValue|null>,manifests:(dataset:string|null)=>Promise<{records:RecordValue[],documents:RecordValue[]}>}} SourceRepository
 * @typedef {{find:(key:string)=>Promise<{digest:string,receipt:RecordValue}|null>,byOwner:(owner:string,id:string)=>Promise<RecordValue|null>}} OperationRepository
 * @typedef {{board:BoardRepository,legacy:LegacyRepository,source:SourceRepository,operations:OperationRepository,listRecords:(owner:string)=>Promise<{board:RecordValue[],legacy:RecordValue[],taskCounts:RecordValue[],documentCounts:RecordValue[]}>}} Repositories
 * @typedef {{q?:string,status?:string|null,kind?:string|null,owner_skill?:string|null,mode?:string|null,offset?:number,limit?:number}} ListQuery
 *
 * commit must atomically write the aggregate, all child changes, event, and
 * receipt, guarded by expected revision. A zero-row CAS must roll back all
 * writes. The receipt is checked before CAS and again after a commit error.
 * An absent receipt is not proof that a timed-out remote write never occurred.
 * The existing receipt/hash algorithm and owner-scoped operation keys remain
 * unchanged; new collaboration/1 ports and wire rules are specified separately
 * in src/Contracts/CollaborationV1/README.md.
 */
export {};
