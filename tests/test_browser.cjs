const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'), output=path.join(root,'verification');
const appRoot=process.env.MARKDOWN_TEST_APP||root;
const python=process.env.MARKDOWN_TEST_PYTHON||path.join(root,'release/Format-to-Markdown-Windows/runtime/python.exe');
const port=18765,base='http://127.0.0.1:'+port;
async function main(){
  fs.mkdirSync(output,{recursive:true});
  const server=spawn(python,['-E','-s','-B',path.join(appRoot,'app.py'),'--no-browser','--port',String(port)],{cwd:appRoot,windowsHide:true,stdio:['ignore','pipe','pipe']});
  let logs='';server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);
  let browser;
  try{
    for(let i=0;i<100;i++){try{const r=await fetch(base+'/api/health');if(r.ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
    browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
    const context=await browser.newContext({viewport:{width:1440,height:1050},permissions:['clipboard-read','clipboard-write'],acceptDownloads:true});
    const page=await context.newPage(),errors=[],external=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    page.on('request',request=>{if(!request.url().startsWith(base))external.push(request.url());});
    page.on('dialog',dialog=>dialog.accept());
    await page.goto(base,{waitUntil:'networkidle'});
    await page.screenshot({path:path.join(output,'v2-home.png'),fullPage:true});
    await page.getByRole('button',{name:'用示例试一下'}).click();
    await page.locator('#previewOutput table').waitFor();
    assert.equal(await page.locator('#fileList .success').count(),1);
    await page.screenshot({path:path.join(output,'v2-preview.png'),fullPage:true});
    await page.locator('[data-view="source"]').click();
    const edited='# 编辑后的资料\n\n'+('中文长资料 😀\n\n'.repeat(1800));
    await page.locator('#markdownOutput').fill(edited);
    await page.locator('[data-view="chunks"]').click();
    assert.ok((await page.locator('#chunkCount').innerText()).includes('/ 3'));
    await page.locator('#copyChunkButton').click();
    const clip=await page.evaluate(()=>navigator.clipboard.readText());assert.ok(clip.startsWith('【资料：'));assert.ok(clip.includes('第 1/3 段'));
    await page.locator('#nextChunk').click();assert.ok((await page.locator('#chunkCount').innerText()).startsWith('第 2'));
    await page.locator('#copyButton').click();assert.ok((await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n')===edited,'Clipboard preserves edited content (Windows line endings normalized)');
    await page.locator('#pasteMode').click();await page.locator('#pasteFormat').selectOption('html');
    await page.locator('#pasteTitle').fill('网页摘录');await page.locator('#pasteInput').fill('<h1>粘贴测试</h1><p>正文</p><script>throw new Error("bad")</script>');await page.locator('#addPasteButton').click();
    await page.locator('#fileMode').click();
    await page.locator('#fileInput').setInputFiles([
      {name:'同名.txt',mimeType:'text/plain',buffer:Buffer.from('第一份资料')},
      {name:'同名.md',mimeType:'text/markdown',buffer:Buffer.from('# 第二份资料')},
      {name:'损坏.pdf',mimeType:'application/pdf',buffer:Buffer.from('this is a corrupt PDF')}
    ]);
    await page.locator('#convertButton').click();await page.locator('#convertButton').waitFor({state:'visible'});
    await page.waitForFunction(()=>document.querySelector('#stopButton').classList.contains('hidden'));
    assert.equal(await page.locator('#fileList .success').count(),4);assert.equal(await page.locator('#fileList .error').count(),1);
    await page.getByRole('button',{name:'查看 网页摘录.html',exact:true}).click();await page.locator('[data-view="preview"]').click();
    assert.equal(await page.locator('#previewOutput h1').innerText(),'粘贴测试');
    await page.getByRole('button',{name:'查看 损坏.pdf',exact:true}).click();assert.ok(await page.locator('#resultNotice').isVisible());
    await page.locator('.retry-file').click();await page.waitForFunction(()=>document.querySelector('#stopButton').classList.contains('hidden'));assert.equal(await page.locator('#fileList .error').count(),1);
    await page.getByRole('button',{name:'查看 同名.md',exact:true}).click();
    const zipWait=page.waitForEvent('download');await page.locator('#zipButton').click();const zip=await zipWait;await zip.saveAs(path.join(output,'browser-export.zip'));
    const mergeWait=page.waitForEvent('download');await page.locator('#mergeButton').click();const merged=await mergeWait;await merged.saveAs(path.join(output,'browser-merged.md'));
    assert.ok(fs.readFileSync(path.join(output,'browser-merged.md'),'utf8').includes('编辑后的资料'));
    const downloadWait=page.waitForEvent('download');await page.locator('#downloadButton').click();await(await downloadWait).saveAs(path.join(output,'browser-single.md'));
    await page.locator('#limitationsButton').click();assert.ok(await page.locator('#helpDialog').isVisible());await page.locator('#helpDone').click();
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'v2-mobile.png'),fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    const securityPage=await context.newPage();await securityPage.goto(base);
    await securityPage.locator('#fileInput').setInputFiles({name:'安全预览.md',mimeType:'text/plain',buffer:Buffer.from('# Preview\n\n<img src=x onerror=alert(1)>\n\n![remote](https://example.com/a.png)\n\n[bad](javascript:alert)')});
    await securityPage.locator('#convertButton').click();await securityPage.locator('#resultContent').waitFor({state:'visible'});
    assert.equal(await securityPage.locator('#previewOutput img').count(),0);assert.equal(await securityPage.locator('#previewOutput script').count(),0);assert.equal(await securityPage.locator('#previewOutput a').count(),0);
    const stopPage=await context.newPage();await stopPage.goto(base);
    await stopPage.route('**/api/convert',async route=>{await new Promise(resolve=>setTimeout(resolve,600));await route.continue();});
    await stopPage.locator('#fileInput').setInputFiles([
      {name:'first.txt',mimeType:'text/plain',buffer:Buffer.from('first content')},
      {name:'second.txt',mimeType:'text/plain',buffer:Buffer.from('second content')}
    ]);
    await stopPage.locator('#convertButton').click();await stopPage.locator('#stopButton').click();
    await stopPage.waitForFunction(()=>document.querySelector('#stopButton').classList.contains('hidden'));
    assert.equal(await stopPage.locator('#fileList .success').count(),1);assert.equal(await stopPage.locator('#fileList .pending').count(),1);
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    console.log(JSON.stringify({browser:'passed',checks:'preview/edit/paste/chunks/copy/batch/retry/download/merge/ZIP/mobile/safe-preview',consoleErrors:errors,externalRequests:external},null,2));
  }finally{if(browser)await browser.close();server.kill();}
}
main().catch(error=>{console.error(String(error).slice(0,2500));process.exitCode=1;});
