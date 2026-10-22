import catalog from './source-catalog.json' with {type:'json'};

/** A replaceable, immutable projection of one source dataset, not live state. */
export const sourceProjection=Object.freeze({
 dataset:catalog.source_commit,
 list(dataset){return dataset===catalog.source_commit?structuredClone(Object.values(catalog.workflows)).sort((a,b)=>b.id.localeCompare(a.id)):[];},
 find(dataset,id){return dataset===catalog.source_commit&&Object.hasOwn(catalog.workflows,id)?structuredClone(catalog.workflows[id]):null;}
});
