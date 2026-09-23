const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const tools=require('../static/markdown.js');
async function main(){
  const text=('中文资料 😀\n\n'+ 'some code\n').repeat(1800);
  const chunks=tools.split(text,4000);
  assert.equal(chunks.join(''),text);
  assert.ok(chunks.every(c=>c.length<=4000));
  assert.ok(chunks.every(c=>!/[\uD800-\uDBFF]$/.test(c)));
  const rendered=tools.render('# 标题\n\n| 甲 | 乙 |\n| --- | --- |\n| A | B |\n\n<script>alert(1)</script>\n\n![图](https://example.com/a.png)\n\n[坏链接](javascript:alert)');
  assert.ok(rendered.includes('<h1>标题</h1>'));
  assert.ok(rendered.includes('<table>'));
  assert.ok(!rendered.includes('<script>'));
  assert.ok(!rendered.includes('<img'));
  assert.ok(!rendered.includes('href="javascript:'));
  const code=tools.render('````md\n```\n# inside code\n```\n````');
  assert.ok(code.includes('<pre><code>'));
  assert.ok(!code.includes('<h1>'));
  const names=tools.uniqueNames([{name:'同名.md'},{name:'同名.md'},{name:'CON.md'},{name:'../../x.md'}]);
  assert.equal(names[1].name,'同名 (2).md');assert.equal(names[2].name,'_CON.md');assert.ok(!names[3].name.includes('/'));
  const out=path.resolve(__dirname,'../verification');fs.mkdirSync(out,{recursive:true});
  const blob=tools.zip([{name:'中文.md',content:'# 内容😀'},{name:'中文.md',content:'第二份'}]);
  fs.writeFileSync(path.join(out,'test-export.zip'),Buffer.from(await blob.arrayBuffer()));
  console.log('Frontend logic: chunk integrity, preview escaping, duplicate names, ZIP generation passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
