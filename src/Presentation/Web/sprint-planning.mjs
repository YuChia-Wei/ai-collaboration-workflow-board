import {escapeContent as esc} from './content-view.mjs';

const weekdays=['星期一','星期二','星期三','星期四','星期五','星期六','星期日'];
const range = sprint => sprint.start_date+' ～ '+sprint.end_date;
export const sprintLabel = sprint => sprint.name+'（'+range(sprint)+'）';

// Date inputs carry civil dates. Perform calendar arithmetic in UTC so the
// interval stays the same across timezones and daylight-saving changes.
function day(date,offset=0) {
  const value=new Date(date+'T00:00:00Z');
  value.setUTCDate(value.getUTCDate()+offset);
  return value;
}
function localToday() {
  const now=new Date();
  return [String(now.getFullYear()).padStart(4,'0'),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
}
const isoDate=value=>value.getUTCFullYear()<=9999 ? value.toISOString().slice(0,10) : '';
function nextStart(sprints,weekday) {
  const lastEnd=sprints.reduce((end,sprint)=>sprint.end_date>end?sprint.end_date:end,'');
  const base=lastEnd ? day(lastEnd,1) : day(localToday());
  const shift=(weekday-(base.getUTCDay()||7)+7)%7;
  base.setUTCDate(base.getUTCDate()+shift);
  return isoDate(base);
}
function endDate(start,weeks) {
  return isoDate(day(start,weeks*7-1));
}

export function sprintField(sprints,selected) {
  const choices=sprints.map(sprint=>`<option value="${esc(sprint.sprint_id)}"${selected===sprint.sprint_id?' selected':''}>${esc(sprintLabel(sprint))}</option>`).join('');
  return `<label>Sprint<select name="sprint_id"><option value="">尚未排入 Sprint</option>${choices}</select></label>`;
}

export function sprintPlanning(data) {
  const {sprint_settings:settings,sprints}=data.backlog;
  const {duration_weeks:weeks,start_weekday:weekday}=settings;
  const current=esc(weeks+' 週，'+weekdays[weekday-1]+'開始');
  const periods=sprints.length ? '<ul>'+sprints.map(s=>`<li>${esc(sprintLabel(s))}</li>`).join('')+'</ul>' : '<p class="hint">尚未建立 Sprint。</p>';
  let body=`<p>目前週期：${current}</p>${periods}`;
  if(data.can_plan){
    const weekOptions=[1,2,3,4].map(w=>`<option value="${w}"${w===weeks?' selected':''}>${w} 週</option>`).join('');
    const days=weekdays.map((name,i)=>`<option value="${i+1}"${i+1===weekday?' selected':''}>${name}</option>`).join('');
    const latest=isoDate(day('9999-12-31',1-weeks*7));
    const suggestion=nextStart(sprints,weekday);
    const start=suggestion<=latest?suggestion:'';
    body+=`<details class="item-editor" data-sprint-settings><summary>Sprint 週期設定</summary>
      <form class="edit-form" data-command="backlog.configure_sprints">
        <label>每個 Sprint 的週數<select name="duration_weeks">${weekOptions}</select></label>
        <label>起始星期<select name="start_weekday">${days}</select></label>
        <p class="hint">新設定適用於之後建立的 Sprint。</p><button>儲存週期</button>
      </form></details>
      <details class="item-editor" data-new-sprint><summary>建立 Sprint</summary>
      <form class="edit-form" data-command="backlog.create_sprint" data-weeks="${weeks}" data-weekday="${weekday}">
        <label>Sprint 名稱<input name="name" required maxlength="160"></label>
        <label>開始日期<input name="start_date" type="date" min="0001-01-01" max="${latest}" required value="${start}"></label>
        <p class="hint">結束日期 <output data-sprint-end>${start?endDate(start,weeks):'—'}</output>（含當日）</p>
        <button>建立 Sprint</button>
      </form></details>`;
  }
  return `<details class="item-editor panel" data-sprint-planning><summary>Sprint 規劃</summary>${body}</details>`;
}

export function updateSprintDates(input) {
  const form=input.form;
  const {weeks,weekday}=form.dataset;
  const validDate=/^\d{4}-\d{2}-\d{2}$/.test(input.value);
  const wrongWeekday=validDate && (day(input.value).getUTCDay()||7)!==Number(weekday);
  input.setCustomValidity(wrongWeekday?'請選擇'+weekdays[Number(weekday)-1]+'作為開始日期。':'');
  form.querySelector('[data-sprint-end]').textContent=validDate && input.value<=input.max?endDate(input.value,Number(weeks)):'—';
}
