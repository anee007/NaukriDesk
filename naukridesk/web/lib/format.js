export const TYPES={job:["Jobs","💼"],result:["Results","🏆"],admit:["Admit Cards","🎫"],key:["Answer Keys","🔑"],syl:["Syllabus","📘"],adm:["Admission","🎓"]};
export const STATES=["Andhra Pradesh","Bihar","Chhattisgarh","Delhi","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Odisha","Punjab","Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh","Uttarakhand","West Bengal"];
export const QUALS=["10th","12th","Diploma/ITI","Graduate","Post Graduate"];
const ist=()=>new Date(Date.now()+19800000).toISOString().slice(0,10);
export const daysLeft=d=>d?Math.round((Date.parse(d)-Date.parse(ist()))/864e5):null;
export function deadline(d){const n=daysLeft(d);if(n==null)return null;if(n<0)return{t:"Closed",c:"bad"};if(n===0)return{t:"Last date today",c:"bad"};if(n<=5)return{t:`Closing soon · ${n} days left`,c:"warn"};return{t:`${n} days left`,c:"ok"}}
export const fmtDate=d=>d?new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}):"";
