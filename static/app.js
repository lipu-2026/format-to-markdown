'use strict';
const $ = id => document.getElementById(id);
const state = {items:[], active:null, view:'preview', busy:false, stop:false, chunk:0, chunks:[], nextId:1};
const esc = MarkdownTools.escape;
const successful = () => state.items.filter(item => item.status === 'success');
const current = () => state.items.find(item => item.id === state.active);
const sizeLabel = size => size < 1024 ? size+' B' : size < 1048576 ? (size/1024).toFixed(1)+' KB' : (size/1048576).toFixed(1)+' MB';
function toast(message) { $('toast').textContent=message; $('toast').classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>$('toast').classList.remove('show'),3500); }
function inputMode(mode) {
  $('filePane').classList.toggle('hidden',mode!=='file'); $('pastePane').classList.toggle('hidden',mode!=='paste');
  $('fileMode').setAttribute('aria-selected',String(mode==='file')); $('pasteMode').setAttribute('aria-selected',String(mode==='paste'));
  if(mode==='paste') $('pasteInput').focus();
}
function addFiles(files) {
  if(state.busy) {toast('正在转换，请完成后再添加文件');return [];}
  const added=[], errors=[];
  let total=state.items.reduce((n,item)=>n+item.file.size,0);
  for(const file of Array.from(files)) {
    if(state.items.some(item=>item.file.name===file.name && item.file.size===file.size && item.file.lastModified===file.lastModified)) { errors.push(file.name+' 已在队列中');continue; }
    if(!file.size) {errors.push(file.name+' 是空文件');continue;}
    if(file.size>60*1048576) {errors.push(file.name+' 超过 60 MB');continue;}
    if(state.items.length>=50 || total+file.size>100*1048576) {errors.push('队列上限为 50 个文件、100 MB');break;}
    const item={id:state.nextId++,file,status:'pending',result:null,edited:false}; state.items.push(item); added.push(item);total+=file.size;
  }
  renderQueue(); if(errors.length) toast(errors.join('；')); else if(added.length) toast('已加入 '+added.length+' 份资料');
  return added;
}
function renderQueue() {
  $('queueCount').textContent=state.items.length;
  const pending=state.items.filter(i=>i.status==='pending' || i.status==='error');
  $('convertButton').disabled=state.busy||!pending.length;
  $('convertLabel').textContent=state.busy?'正在整理…':pending.length && pending.every(i=>i.status==='error')?'重试失败文件':'转换为 Markdown';
  $('clearButton').disabled=state.busy||!state.items.length;
  for(const id of ['fileInput','dropzone','sampleButton','metadataOption','imageOption','pasteTitle','pasteFormat','pasteInput']) $(id).disabled=state.busy;
  $('addPasteButton').disabled=state.busy||!$('pasteInput').value.trim();
  $('stopButton').classList.toggle('hidden',!state.busy); $('stopButton').disabled=state.stop;
  const labels={pending:'等待转换',working:'正在转换',success:'已完成',error:'转换失败'};
  $('fileList').innerHTML=state.items.length ? state.items.map(item=>`<div class="file-item ${item.status} ${item.id===state.active?'selected':''}"><button class="file-select" data-action="select" data-id="${item.id}" title="${esc(item.file.name)}" aria-label="查看 ${esc(item.file.name)}"><span class="file-type">${esc(item.file.name.split('.').pop().slice(0,5).toUpperCase())}</span><span class="file-meta"><strong>${esc(item.file.name)}</strong><small>${labels[item.status]} · ${sizeLabel(item.file.size)}${item.edited?' · 已编辑':''}</small></span></button>${item.status==='error'?`<button class="retry-file" data-action="retry" data-id="${item.id}" ${state.busy?'disabled':''}>重试</button>`:''}<button class="remove-file" data-action="remove" data-id="${item.id}" aria-label="移除 ${esc(item.file.name)}" ${state.busy?'disabled':''}>×</button></div>`).join(''):'<p class="queue-empty">可以一次整理多份资料</p>';
  $('resultStatus').textContent=successful().length ? successful().length+' 份资料已就绪' : state.busy?'正在整理':'等待导入';
  $('mergeButton').disabled=state.busy||successful().length<2; $('zipButton').disabled=state.busy||!successful().length;
}
function updateStats(item) {
  const text=item.result?.markdown||'', chars=Array.from(text).length;
  const cjk=(text.match(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g)||[]).length;
  const tokens=Math.ceil(cjk*1.5+(chars-cjk)/4);
  $('resultStats').textContent=chars.toLocaleString()+' 字符 · 约 '+tokens.toLocaleString()+' Token（估算）';
  $('editedLabel').classList.toggle('hidden',!item.edited);
}
function renderResult() {
  const item=current(), has=!!item?.result;
  $('emptyState').classList.toggle('hidden',has); $('resultContent').classList.toggle('hidden',!has);
  if(!has) return;
  const ok=item.status==='success';
  $('resultTitle').textContent=item.result.outputName;
  $('markdownOutput').value=item.result.markdown||'';
  $('markdownOutput').disabled=!ok; $('copyButton').disabled=!ok; $('downloadButton').disabled=!ok;
  $('resultNotice').textContent=item.result.warning||item.result.error||'';
  $('resultNotice').classList.toggle('hidden',!$('resultNotice').textContent);$('resultNotice').classList.toggle('error',!ok);
  document.querySelectorAll('[data-view]').forEach(button=>button.disabled=!ok);
  updateStats(item); showView(ok?state.view:'preview');
}
function showView(view) {
  state.view=view;
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.view===view)));
  $('previewOutput').classList.toggle('hidden',view!=='preview');$('markdownOutput').classList.toggle('hidden',view!=='source');$('chunksPane').classList.toggle('hidden',view!=='chunks');
  const item=current(); if(!item?.result)return;
  if(view==='preview') $('previewOutput').innerHTML=item.status==='error'?'<div class="error-message"><h3>这份资料暂时没有转换成功</h3><p>请检查上方说明，可在左侧重试或重新导出原文件。</p></div>':MarkdownTools.render(item.result.markdown);
  if(view==='chunks') {state.chunks=MarkdownTools.split(item.result.markdown,Number($('chunkSize').value));state.chunk=Math.min(state.chunk,state.chunks.length-1);renderChunk();}
}
function renderChunk() {
  $('chunkCount').textContent='第 '+(state.chunk+1)+' / '+state.chunks.length+' 段';
  $('chunkOutput').textContent=state.chunks[state.chunk]||'';
  $('prevChunk').disabled=state.chunk===0;$('nextChunk').disabled=state.chunk>=state.chunks.length-1;
}
async function convert(targets) {
  if(state.busy)return;
  targets=targets||state.items.filter(i=>i.status==='pending'||i.status==='error');if(!targets.length)return;
  state.busy=true;state.stop=false;renderQueue();
  const options={metadata:$('metadataOption').checked,images:$('imageOption').checked};
  $('progressBar').max=targets.length;$('progressBar').value=0;$('progressBar').classList.remove('hidden');
  let done=0, count=0;
  try {
    for(const item of targets) {
      if(state.stop)break;
      item.status='working';renderQueue();$('progressText').textContent='正在转换 '+(done+1)+' / '+targets.length+'：'+item.file.name;
      try {
        const body=new FormData();body.append('files',item.file,item.file.name);body.append('includeMetadata',String(options.metadata));body.append('embedImages',String(options.images));
        const response=await fetch('/api/convert',{method:'POST',body});
        const payload=await response.json();if(!response.ok)throw new Error(payload.error||'服务暂时无法处理文件');
        const result=payload.results?.[0];if(!result)throw new Error('没有收到转换结果');
        item.result=result;item.status=result.status;item.edited=false;
        if(item.status==='success')count++;
      } catch(error) {
        item.status='error'; item.result={name:item.file.name,outputName:item.file.name.replace(/\.[^.]+$/,'')+'.md',markdown:'',status:'error',error:error instanceof TypeError?'无法连接本地服务，请重新打开应用后重试。':error.message};
      }
      if(!current()?.result || targets.length===1 || state.active===item.id){state.active=item.id;state.chunk=0;renderResult();}
      done++;$('progressBar').value=done;renderQueue();
    }
  } finally {
    state.busy=false;renderQueue();$('progressText').textContent=(state.stop?'已停止后续转换 · ':'')+'本次完成 '+count+' / '+done+' 份，结果可编辑、复制和导出';
    toast(state.stop?'当前文件已处理完，后续转换已停止':'转换完成：'+count+' 成功'+(done-count?'，'+(done-count)+' 失败':''));
  }
}
async function copyText(text) {
  try {await navigator.clipboard.writeText(text);toast('已复制，可以粘贴给 AI 了');}
  catch {
    const helper=document.createElement('textarea');helper.value=text;helper.className='clipboard-helper';document.body.appendChild(helper);helper.select();
    const ok=document.execCommand('copy');helper.remove();toast(ok?'已复制':'复制未成功，请切换到 Markdown 后全选复制');
  }
}
function download(name, content, type='text/markdown;charset=utf-8') {
  const blob=content instanceof Blob?content:new Blob([content],{type});const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
}
function merge() {
  const items=successful();
  const content='# 合并资料\n\n'+items.map((item,index)=>'## 资料 '+(index+1)+' · '+item.file.name.replace(/[\r\n]/g,' ')+'\n\n'+item.result.markdown).join('\n\n---\n\n');
  download('合并资料.md',content);
}
function addPaste() {
  const content=$('pasteInput').value;if(!content.trim())return;
  const ext=$('pasteFormat').value,title=($('pasteTitle').value.trim()||'粘贴资料').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_');
  const name=title.endsWith('.'+ext)?title:title+'.'+ext;
  if(addFiles([new File([content],name,{type:'text/plain'})]).length){$('pasteInput').value='';$('addPasteButton').disabled=true;}
}
$('fileMode').onclick=()=>inputMode('file');$('pasteMode').onclick=()=>inputMode('paste');
$('workspaceNav').onclick=()=>{inputMode('file');$('dropzone').focus();};$('pasteNav').onclick=()=>inputMode('paste');
for(const id of ['formatsButton','limitationsButton'])$(id).onclick=()=>$('helpDialog').showModal();
for(const id of ['closeHelp','helpDone'])$(id).onclick=()=>$('helpDialog').close();
$('dropzone').onclick=()=>$('fileInput').click();
$('fileInput').onchange=event=>{addFiles(event.target.files);event.target.value='';};
for(const name of ['dragenter','dragover'])$('dropzone').addEventListener(name,event=>{event.preventDefault();$('dropzone').classList.add('dragging');});
for(const name of ['dragleave','drop'])$('dropzone').addEventListener(name,event=>{event.preventDefault();$('dropzone').classList.remove('dragging');});
$('dropzone').addEventListener('drop',event=>addFiles(event.dataTransfer.files));
for(const name of ['dragover','drop'])window.addEventListener(name,event=>event.preventDefault());
$('pasteInput').oninput=()=>$('addPasteButton').disabled=state.busy||!$('pasteInput').value.trim();$('addPasteButton').onclick=addPaste;
$('convertButton').onclick=()=>convert();
$('stopButton').onclick=()=>{state.stop=true;$('stopButton').disabled=true;$('progressText').textContent='正在完成当前文件，随后停止…';};
$('clearButton').onclick=()=>{if(state.items.some(i=>i.result)&&!confirm('清空队列会移除当前结果，请先下载需要保留的内容。确定清空吗？'))return;state.items=[];state.active=null;renderQueue();renderResult();$('progressBar').classList.add('hidden');$('progressText').textContent='每批最多 50 个文件 · 总大小 ≤ 100 MB';};
$('fileList').onclick=event=>{
  const button=event.target.closest('button[data-action]');if(!button)return;
  const id=Number(button.dataset.id),item=state.items.find(i=>i.id===id);if(!item)return;
  if(button.dataset.action==='select'){state.active=id;state.chunk=0;renderQueue();renderResult();}
  if(button.dataset.action==='retry'&&!state.busy)convert([item]);
  if(button.dataset.action==='remove'&&!state.busy){
    if(item.edited&&!confirm('移除此文件会丢弃编辑后的内容。确定移除吗？'))return;
    state.items=state.items.filter(i=>i.id!==id);if(state.active===id)state.active=state.items.find(i=>i.result)?.id||null;renderQueue();renderResult();
  }
};
document.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>showView(button.dataset.view));
$('markdownOutput').oninput=()=>{const item=current();if(!item||item.status!=='success')return;item.result.markdown=$('markdownOutput').value;item.edited=true;state.chunk=0;updateStats(item);renderQueue();};
$('copyButton').onclick=()=>{if(current()?.status==='success')copyText(current().result.markdown);};
$('downloadButton').onclick=()=>{if(current()?.status==='success'){const item=MarkdownTools.uniqueNames([{name:current().result.outputName}])[0];download(item.name,current().result.markdown);}};
$('mergeButton').onclick=merge;
$('zipButton').onclick=()=>download('Markdown资料.zip',MarkdownTools.zip(successful().map(item=>({name:item.result.outputName,content:item.result.markdown}))));
$('chunkSize').onchange=()=>{state.chunk=0;showView('chunks');};
$('prevChunk').onclick=()=>{if(state.chunk>0)state.chunk--;renderChunk();};$('nextChunk').onclick=()=>{if(state.chunk<state.chunks.length-1)state.chunk++;renderChunk();};
$('copyChunkButton').onclick=()=>{const item=current();if(!item)return;const header='【资料：'+item.file.name+'｜第 '+(state.chunk+1)+'/'+state.chunks.length+' 段】\n'+(state.chunks.length>1?'请先接收资料，全部段落发送完后再按我的要求处理。\n\n':'\n');copyText(header+state.chunks[state.chunk]);};
$('sampleButton').onclick=()=>{
  const content='# 让下一次 AI 对话，更有准备\n\n一份清晰的资料，能让 AI 更容易找到重点。这里是一份可编辑的示例。\n\n## 本周项目记录\n\n| 事项 | 进展 | 下一步 |\n| --- | --- | --- |\n| 用户调研 | 完成 8 次访谈 | 整理反馈 |\n| 原型设计 | 核心页面已就绪 | 开始试用 |\n| 资料归档 | 文档已收齐 | 转成 Markdown |\n\n## 交给 AI 之前\n\n- 检查标题、段落和表格是否完整\n- 在 Markdown 页签补充背景或问题\n- 长资料使用「分段给 AI」逐段复制\n\n> 这是演示内容。你导入的真实文件只会在本机处理。\n';
  const items=addFiles([new File([content],'开始使用墨转.md',{type:'text/markdown',lastModified:1})]);if(items.length)convert(items);
};
window.addEventListener('beforeunload',event=>{if(state.busy||successful().length||$('pasteInput').value.trim()){event.preventDefault();event.returnValue='';}});
renderQueue();
