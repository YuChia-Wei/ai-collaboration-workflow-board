export class Fault extends Error {constructor(status,error,details={}) {super(error); Object.assign(this,{status,error,details});}}
export const demand=(value,error,status=422,details={})=>{if(!value) throw new Fault(status,error,details);};
