/* © 2026 Ali AKDAĞLI — Sürüm 1.0 */
(function(){
 if(!window.Lab)return;
 Lab.downloadCSV=function(name,header,rows){
   const text='\uFEFF'+[header,...rows].map(r=>r.map(x=>typeof x==='number'?String(x).replace('.',','):x).join(';')).join('\r\n');
   const blob=new Blob([text],{type:'text/csv;charset=utf-8'});
   const file=new File([blob],name,{type:'text/csv'});
   const fallback=()=>{const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);};
   if(navigator.canShare && navigator.canShare({files:[file]})){
     navigator.share({files:[file],title:name}).catch(error=>{if(error.name!=='AbortError')fallback();});
   }else fallback();
 };
})();
