import {demand} from './errors.mjs';

export const defaultSprintSettings=Object.freeze({duration_weeks:2,start_weekday:1});

export function createSprint(backlog,command){
 const {sprint_id,name,start_date}=command;
 const {duration_weeks,start_weekday}=backlog.sprint_settings;
 demand(/^\d{4}-\d{2}-\d{2}$/.test(start_date),'invalid_sprint_date');
 const [year,month,day]=start_date.split('-').map(Number);
 const leap=year%4===0&&(year%100!==0||year%400===0);
 const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
 demand(year>0&&month>=1&&month<=12&&day>=1&&day<=days[month-1],'invalid_sprint_date');
 // 0001-01-01 was a Monday in the proleptic Gregorian calendar.
 const years=year-1;
 const daysBeforeYear=365*years+Math.floor(years/4)-Math.floor(years/100)+Math.floor(years/400);
 const daysBeforeMonth=days.slice(0,month-1).reduce((total,length)=>total+length,0);
 demand((daysBeforeYear+daysBeforeMonth+day-1)%7+1===start_weekday,'sprint_weekday_mismatch');
 // A maximum of four weeks adds at most 27 days, crossing at most one month.
 let endDay=day+duration_weeks*7-1,endMonth=month,endYear=year;
 if(endDay>days[month-1]){
  endDay-=days[month-1];
  if(month===12){endMonth=1;endYear++;}else endMonth++;
 }
 demand(endYear<=9999,'invalid_sprint_date');
 const end_date=[String(endYear).padStart(4,'0'),String(endMonth).padStart(2,'0'),String(endDay).padStart(2,'0')].join('-');
 demand(!backlog.sprints.some(sprint=>sprint.sprint_id===sprint_id),'sprint_exists','conflict');
 demand(!backlog.sprints.some(sprint=>start_date<=sprint.end_date&&sprint.start_date<=end_date),'sprint_overlap','conflict');
 return {sprint_id,name,start_date,end_date};
}
