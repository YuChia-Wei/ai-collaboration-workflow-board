import Ajv2020 from 'ajv/dist/2020.js';
import standalone from 'ajv/dist/standalone/index.js';
import {_} from 'ajv/dist/compile/codegen/index.js';
import schema from '../contracts/collaboration-v1/schema.json' with {type:'json'};

export function standaloneCollaborationValidator(){
 const ajv=new Ajv2020({strict:true,allErrors:false,code:{source:true,esm:true,formats:_`{"date-time":value=>{const time=new Date(value);return Number.isFinite(time.valueOf())&&Number(value.slice(0,4))>=1&&time.toISOString()===value;}}`}});
 ajv.addFormat('date-time',value=>{const time=new Date(value);return Number.isFinite(time.valueOf())&&Number(value.slice(0,4))>=1&&time.toISOString()===value;});
 ajv.addSchema(schema);
 return standalone(ajv,{validateCommand:schema.$id+'#/$defs/command',validateQuery:schema.$id+'#/$defs/query'});
}
