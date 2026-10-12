/**
 * Outbound ports used by application services. Implementations return domain
 * records; application code does not receive D1 statements or SQL connections.
 *
 * @typedef {{load:Function, document:Function, revision:Function, commit:Function}} BoardRepository
 * @typedef {{load:Function, revision:Function, commit:Function}} LegacyRepository
 * @typedef {{active:Function, exists:Function, record:Function, document:Function, detail:Function, rows:Function}} SourceRepository
 * @typedef {{find:Function, byOwner:Function}} OperationRepository
 * @typedef {{board:BoardRepository, legacy:LegacyRepository, source:SourceRepository, operations:OperationRepository, listRows:Function}} Repositories
 *
 * commit must atomically write the aggregate, all child changes, event, and
 * receipt, guarded by expected revision. A zero-row CAS must roll back all
 * writes. The receipt is checked before CAS and again after a commit error.
 */
export {};
