import replicaSchema from '../../Contracts/SourceReplicaV1/schema.json' with {type:'json'};
import Ajv2020 from 'ajv/dist/2020.js';
import schemaV2 from '../../Contracts/CollaborationV2/schema.json' with {type:'json'};
import schema from '../../Contracts/CollaborationV1/schema.json' with {type:'json'};

// Node uses this validator directly. The Worker build replaces this module with
// Ajv standalone code so deployment requires neither eval nor runtime codegen.
const ajv=new Ajv2020({strict:true,allErrors:false});
ajv.addFormat('date-time',value=>{const time=new Date(value);return Number.isFinite(time.valueOf())&&Number(value.slice(0,4))>=1&&time.toISOString()===value;});
ajv.addSchema(schema);ajv.addSchema(schemaV2);ajv.addSchema(replicaSchema);
export const validateCommand=ajv.getSchema(schema.$id+'#/$defs/command');
export const validateQuery=ajv.getSchema(schema.$id+'#/$defs/query');

export const validateCommandV2=ajv.getSchema(schemaV2.$id+'#/$defs/command');
export const validateQueryV2=ajv.getSchema(schemaV2.$id+'#/$defs/query');

export const validateReplicaCommand=ajv.getSchema(replicaSchema.$id+'#/$defs/command');
export const validateReplicaQuery=ajv.getSchema(replicaSchema.$id+'#/$defs/query');
