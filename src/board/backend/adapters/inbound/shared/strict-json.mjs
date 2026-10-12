import {Fault} from '../../../domain/errors.mjs';
import {unicodeScalarString} from '../../../domain/collaboration-values.mjs';

/** Preserve duplicate-key and numeric-token evidence before normal JSON parsing. */
export function parseContractJson(source){
 if(typeof source!=='string'||new TextEncoder().encode(source).length>300000)throw new Fault('request_too_large','limit_exceeded');
 let offset=0;
 const fail=()=>{throw new Fault('invalid_json');};
 const ws=()=>{while(/[ \t\r\n]/.test(source[offset]??'!'))offset++;};
 function string(){
  const start=offset++;
  while(offset<source.length){
   const ch=source[offset++];
   if(ch==='"'){
    try{return unicodeScalarString(JSON.parse(source.slice(start,offset)));}catch{fail();}
   }
   if(ch==='\\')offset++;
  }
  fail();
 }
 function value(depth){
  if(depth>64)fail();ws();
  const ch=source[offset];
  if(ch==='"')return string();
  if(ch==='{'||ch==='['){
   const array=ch==='[',end=array?']':'}',out=array?[]:Object.create(null),keys=new Set();offset++;ws();
   if(source[offset]===end){offset++;return out;}
   for(;;){
    if(array)out.push(value(depth+1));
    else{
     ws();if(source[offset]!=='"')fail();const key=string();if(keys.has(key))fail();keys.add(key);
     ws();if(source[offset++]!==':')fail();out[key]=value(depth+1);
    }
    ws();const separator=source[offset++];if(separator===end)return out;if(separator!==',')fail();
   }
  }
  for(const [token,result] of [['true',true],['false',false],['null',null]])if(source.startsWith(token,offset)){offset+=token.length;return result;}
  const match=source.slice(offset).match(/^-?(?:0|[1-9][0-9]*)/);
  if(!match)fail();offset+=match[0].length;
  const number=Number(match[0]);if(!Number.isSafeInteger(number)||Object.is(number,-0))fail();return number;
 }
 const result=value(0);ws();if(offset!==source.length)fail();return result;
}
