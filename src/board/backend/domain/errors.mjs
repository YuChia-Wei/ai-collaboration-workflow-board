/** A domain/application failure. Transport adapters choose status and encoding. */
export class Fault extends Error {
 constructor(error,category='invalid',details={}) {
  super(error);
  Object.assign(this,{error,category,details});
 }
}
export const demand=(value,error,category='invalid',details={})=>{
 if(!value)throw new Fault(error,category,details);
};
