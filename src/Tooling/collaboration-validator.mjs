import replicaSchema from '../Contracts/SourceReplicaV1/schema.json' with {type:'json'};
import Ajv2020 from 'ajv/dist/2020.js';
import standalone from 'ajv/dist/standalone/index.js';
import {_} from 'ajv/dist/compile/codegen/index.js';
import schemaV2 from '../Contracts/CollaborationV2/schema.json' with {type:'json'};
import schema from '../Contracts/CollaborationV1/schema.json' with {type:'json'};

export function standaloneCollaborationValidator(){
 const ajv=new Ajv2020({strict:true,allErrors:false,code:{source:true,esm:true,formats:_`{"date-time":value=>{const time=new Date(value);return Number.isFinite(time.valueOf())&&Number(value.slice(0,4))>=1&&time.toISOString()===value;}}`}});
 ajv.addFormat('date-time',value=>{const time=new Date(value);return Number.isFinite(time.valueOf())&&Number(value.slice(0,4))>=1&&time.toISOString()===value;});
 ajv.addSchema(schema);ajv.addSchema(schemaV2);ajv.addSchema(replicaSchema);
 return standalone(ajv,{validateReplicaCommand:replicaSchema.$id+'#/$defs/command',validateReplicaQuery:replicaSchema.$id+'#/$defs/query',validateCommandV2:schemaV2.$id+'#/$defs/command',validateQueryV2:schemaV2.$id+'#/$defs/query',validateCommand:schema.$id+'#/$defs/command',validateQuery:schema.$id+'#/$defs/query'});
}
