/* Small offline preview renderer. Raw HTML is always displayed as text; no remote images. */
const MarkdownTools = (() => {
  const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function inline(text) {
    const pattern = /(`+)([\s\S]*?)\1|!\[([^\]]*)\]\(([^)]*)\)|\[([^\]]+)\]\(([^)]*)\)|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*/g;
    let out = '', cursor = 0, match;
    while ((match = pattern.exec(text))) {
      out += escape(text.slice(cursor, match.index));
      if (match[1]) out += '<code>' + escape(match[2]) + '</code>';
      else if (match[3] !== undefined) out += '<span class="image-placeholder">图片：' + escape(match[3] || '原图') + '（请对照原文件）</span>';
      else if (match[5] !== undefined) {
        const url = match[6].trim();
        out += /^https?:\/\//i.test(url) ? '<a href="' + escape(url) + '" target="_blank" rel="noopener noreferrer">' + escape(match[5]) + '</a>' : escape(match[5]);
      } else if (match[7] || match[8]) out += '<strong>' + escape(match[7] || match[8]) + '</strong>';
      else out += '<em>' + escape(match[9]) + '</em>';
      cursor = pattern.lastIndex;
    }
    return out + escape(text.slice(cursor));
  }
  function cells(line) {
    return line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));
  }
  function render(source) {
    const limited = source.length > 160000;
    const lines = source.slice(0, 160000).replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let i = 0;
    if (lines[0] === '---') {
      const end = lines.indexOf('---', 1);
      if (end > 0 && lines.slice(1, end).some(l => l.startsWith('source_file:'))) {
        out.push('<details class="metadata-block"><summary>来源信息</summary><pre>' + escape(lines.slice(1, end).join('\n')) + '</pre></details>');
        i = end + 1;
      }
    }
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      const fence = /^\s{0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      if (fence) {
        const code = []; i++;
        const close = new RegExp('^\\s{0,3}' + fence[1][0] + '{' + fence[1].length + ',}\\s*$');
        while (i < lines.length && !close.test(lines[i])) code.push(lines[i++]);
        i++;
        out.push('<pre><code>' + escape(code.join('\n')) + '</code></pre>'); continue;
      }
      const heading = /^(#{1,6})\s+(.+)$/.exec(line);
      if (heading) { const h = heading[1].length; out.push('<h'+h+'>'+inline(heading[2])+'</h'+h+'>'); i++; continue; }
      if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
      if (line.includes('|') && i+1 < lines.length && cells(lines[i+1]).every(c => /^:?-{3,}:?$/.test(c))) {
        const header = cells(line), rows = []; i += 2;
        while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(cells(lines[i++]));
        const value = c => inline(c).replace(/&lt;br\s*\/?&gt;/gi, '<br>');
        out.push('<div class="table-wrap"><table><thead><tr>'+header.map(c=>'<th>'+value(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+value(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'); continue;
      }
      const list = /^\s*(?:([-+*])|(\d+)[.)])\s+(.+)$/.exec(line);
      if (list) {
        const ordered = !!list[2], tag = ordered ? 'ol' : 'ul', items = [];
        while (i < lines.length) {
          const item = /^\s*(?:([-+*])|(\d+)[.)])\s+(.+)$/.exec(lines[i]);
          if (!item || !!item[2] !== ordered) break;
          items.push('<li>'+inline(item[3])+'</li>'); i++;
        }
        out.push('<'+tag+'>'+items.join('')+'</'+tag+'>'); continue;
      }
      if (/^>\s?/.test(line)) {
        const quote=[]; while(i<lines.length && /^>\s?/.test(lines[i])) quote.push(inline(lines[i++].replace(/^>\s?/,'')));
        out.push('<blockquote>'+quote.join('<br>')+'</blockquote>'); continue;
      }
      out.push('<p>'+inline(line)+'</p>'); i++;
    }
    if (limited) out.push('<p class="preview-limit">为保持流畅，仅预览前 16 万字符。复制、编辑和下载保留完整内容。</p>');
    return out.join('\n');
  }
  function split(source, limit) {
    const chunks = []; let start = 0;
    while (start < source.length) {
      let end = Math.min(start + limit, source.length);
      if (end < source.length) {
        const cut = source.lastIndexOf('\n\n', end - 2);
        const line = source.lastIndexOf('\n', end - 1);
        if (cut >= start + limit * 0.5) end = cut + 2;
        else if (line >= start + limit * 0.5) end = line + 1;
        // Do not split a UTF-16 surrogate pair (emoji or supplementary character).
        if (/[\uD800-\uDBFF]/.test(source[end-1]) && /[\uDC00-\uDFFF]/.test(source[end])) end--;
      }
      chunks.push(source.slice(start, end)); start = end;
    }
    return chunks.length ? chunks : [''];
  }
  function uniqueNames(items) {
    const used = new Set();
    return items.map(item => {
      let name = item.name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[ .]+$/, '').slice(0,160) || '资料.md';
      if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name)) name = '_' + name;
      const stem = name.replace(/\.md$/i, ''); let candidate = name, n = 2;
      while (used.has(candidate.toLowerCase())) candidate = stem + ' (' + n++ + ').md';
      used.add(candidate.toLowerCase()); return {...item, name:candidate};
    });
  }
  // Uncompressed ZIP, UTF-8 names; avoids fetching third-party libraries at runtime.
  function zip(items) {
    const encoder = new TextEncoder(), parts = [], central = []; let offset = 0, centralSize = 0;
    const table = Array.from({length:256}, (_, n) => { for(let k=0;k<8;k++) n=(n&1)?0xedb88320^(n>>>1):n>>>1; return n>>>0; });
    const header = size => { const data=new Uint8Array(size); return [data,new DataView(data.buffer)]; };
    for (const item of uniqueNames(items)) {
      const name=encoder.encode(item.name), data=encoder.encode(item.content); let crc=0xffffffff;
      for(const byte of data) crc=table[(crc^byte)&255]^(crc>>>8);
      crc=(crc^0xffffffff)>>>0;
      const [h,v]=header(30); v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);
      parts.push(h,name,data);
      const [c,w]=header(46);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(8,0x800,true);w.setUint16(14,33,true);w.setUint32(16,crc,true);w.setUint32(20,data.length,true);w.setUint32(24,data.length,true);w.setUint16(28,name.length,true);w.setUint32(42,offset,true);
      central.push(c,name);centralSize+=46+name.length;offset+=30+name.length+data.length;
    }
    const [end,v]=header(22);v.setUint32(0,0x06054b50,true);v.setUint16(8,items.length,true);v.setUint16(10,items.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
    return new Blob([...parts,...central,end], {type:'application/zip'});
  }
  return {escape,render,split,zip,uniqueNames};
})();
if (typeof module !== 'undefined') module.exports = MarkdownTools;
