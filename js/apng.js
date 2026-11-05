/*
  @author: DaiEn
  @Date: 2026-11-05
  @Correction: 11
  蛋殼貓 APNG 工具 — 前端邏輯
  圖片完全在瀏覽器本機處理，不上傳伺服器
*/

// --- PNG CRC32 ---
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();
function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc = crcTable[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function setApngLoops(buffer, loops) {
  const bytes = new Uint8Array(buffer);
  let offset = 8;
  while (offset < bytes.length) {
    const length = (bytes[offset] << 24) | (bytes[offset+1] << 16) | (bytes[offset+2] << 8) | bytes[offset+3];
    const type = String.fromCharCode(bytes[offset+4], bytes[offset+5], bytes[offset+6], bytes[offset+7]);
    if (type === 'acTL') {
      bytes[offset+12] = (loops >>> 24) & 0xFF;
      bytes[offset+13] = (loops >>> 16) & 0xFF;
      bytes[offset+14] = (loops >>> 8) & 0xFF;
      bytes[offset+15] = loops & 0xFF;
      const crc = crc32(bytes.subarray(offset+4, offset+8+length));
      const crcPos = offset + 8 + length;
      bytes[crcPos]   = (crc >>> 24) & 0xFF;
      bytes[crcPos+1] = (crc >>> 16) & 0xFF;
      bytes[crcPos+2] = (crc >>> 8) & 0xFF;
      bytes[crcPos+3] = crc & 0xFF;
      return bytes.buffer;
    }
    offset += 12 + length;
  }
  throw new Error('找不到 acTL chunk');
}

// --- DOM ---
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const makeBtn = document.getElementById('makeBtn');
const clearBtn = document.getElementById('clearBtn');
const previewImg = document.getElementById('previewImg');
const previewInfo = document.getElementById('previewInfo');
const downloadLink = document.getElementById('downloadLink');
const status = document.getElementById('status');
const fileInfo = document.getElementById('fileInfo');
const timeline = document.getElementById('timeline');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const outW = document.getElementById('outW');
const outH = document.getElementById('outH');

let files = [];
let sourceW = 0, sourceH = 0;
let previewUrls = [];
let currentFrame = 0;
let playing = false;
let playTimer = null;
let frameDelays = []; // 每格延遲 ms

// 寬高聯動
outW.addEventListener('input', () => {
  if (sourceW && sourceH && outW.value) outH.value = Math.round(outW.value * sourceH / sourceW);
});
outH.addEventListener('input', () => {
  if (sourceW && sourceH && outH.value) outW.value = Math.round(outH.value * sourceW / sourceH);
});

// 拖曳上傳
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  addFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', e => addFiles(e.target.files));

// 背景切換
const bgToggle = document.getElementById('bgToggle');
const previewStage = document.getElementById('previewStage');
let bgMode = 'checker'; // checker | black
bgToggle.addEventListener('click', () => {
  bgMode = bgMode === 'checker' ? 'black' : 'checker';
  if (bgMode === 'black') {
    previewStage.style.background = '#000';
    bgToggle.textContent = '黑色';
  } else {
    previewStage.style.background = '';
    bgToggle.textContent = '棋盤格';
  }
});

async function addFiles(list) {
  const unsupported = [];
  for (const f of Array.from(list)) {
    try {
      if (f.type !== 'image/png' && f.type !== 'image/gif') {
        unsupported.push(f.name);
        continue;
      }
      const buf = await f.arrayBuffer();
      if (f.type === 'image/gif') {
        console.log('[GIF] 偵測到 GIF，開始解析:', f.name);
        await importGIF(buf, f.name);
      } else if (isAPNG(buf)) {
        console.log('[APNG] 偵測到 APNG，開始解析:', f.name);
        await importAPNG(buf, f.name);
      } else {
        files.push(f);
      }
    } catch (err) {
      console.error('[匯入] 失敗:', f.name, err);
      unsupported.push(f.name + '（解析錯誤）');
    }
  }
  if (unsupported.length > 0) {
    status.textContent = `⚠ 不支援的檔案：${unsupported.join('、')}（只接受 PNG / APNG / GIF）`;
  }
  rebuildPreviews();
}

let currentSort = 'manual';
function sortFrames(mode) {
  currentSort = mode;
  const idx = files.map((_, i) => i);
  if (mode === 'name-asc') {
    idx.sort((a, b) => files[a].name.localeCompare(files[b].name, undefined, {numeric: true}));
  } else if (mode === 'name-desc') {
    idx.sort((a, b) => files[b].name.localeCompare(files[a].name, undefined, {numeric: true}));
  } else if (mode === 'date-new') {
    idx.sort((a, b) => files[b].lastModified - files[a].lastModified);
  } else if (mode === 'date-old') {
    idx.sort((a, b) => files[a].lastModified - files[b].lastModified);
  }
  const newFiles = idx.map(i => files[i]);
  const newUrls = idx.map(i => previewUrls[i]);
  const newDelays = idx.map(i => frameDelays[i]);
  files = newFiles; previewUrls = newUrls; frameDelays = newDelays;
  renderList();
  renderTimeline();
  if (files.length > 0) showFrame(0);
}

document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    sortFrames(btn.dataset.sort);
  });
});

function isAPNG(buf) {
  const bytes = new Uint8Array(buf);
  let offset = 8; // 第一個 chunk 的 length 位置
  while (offset < bytes.length) {
    const len = (bytes[offset]<<24)|(bytes[offset+1]<<16)|(bytes[offset+2]<<8)|bytes[offset+3];
    const type = String.fromCharCode(bytes[offset+4], bytes[offset+5], bytes[offset+6], bytes[offset+7]);
    if (type === 'acTL') return true;
    if (type === 'IEND') return false;
    offset += 12 + len;
  }
  return false;
}

function readAPNGDelays(buf) {
  const bytes = new Uint8Array(buf);
  const delays = [];
  let offset = 8;
  while (offset < bytes.length) {
    const len = (bytes[offset]<<24)|(bytes[offset+1]<<16)|(bytes[offset+2]<<8)|bytes[offset+3];
    const type = String.fromCharCode(bytes[offset+4], bytes[offset+5], bytes[offset+6], bytes[offset+7]);
    if (type === 'fcTL') {
      const ds = offset + 8;
      const dn = (bytes[ds+20]<<8)|bytes[ds+21];
      const dd = (bytes[ds+22]<<8)|bytes[ds+23];
      const den = dd === 0 ? 100 : dd;
      delays.push(Math.round(dn / den * 1000));
    }
    if (type === 'IEND') break;
    offset += 12 + len;
  }
  return delays;
}

async function importAPNG(buf, originalName) {
  const img = UPNG.decode(buf);
  const w = img.width, h = img.height;
  const n = img.frames.length;
  const delays = readAPNGDelays(buf);
  const rgbaResult = UPNG.toRGBA8(img);
  const frameSize = w * h * 4;
  for (let i = 0; i < n; i++) {
    let rgba;
    if (Array.isArray(rgbaResult)) {
      rgba = rgbaResult[i];
    } else {
      rgba = rgbaResult.slice(i * frameSize, (i + 1) * frameSize);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    const imageData = new ImageData(new Uint8ClampedArray(rgba), w, h);
    ctx.putImageData(imageData, 0, 0);
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const fname = originalName.replace(/\.png$/i, '') + '_' + String(i+1).padStart(3,'0') + '.png';
    const file = new File([blob], fname, {type: 'image/png'});
    files.push(file);
    frameDelays.push(Math.max(16, delays[i] || 100));
  }
  status.textContent = `已匯入 APNG：${n} 格`;
}

async function importGIF(buf, originalName) {
  const reader = new GifReader(new Uint8Array(buf));
  const w = reader.width, h = reader.height;
  const n = reader.numFrames();
  console.log('[GIF] 解析成功', w, 'x', h, '格數:', n);
  // 維護一個完整畫布，處理 GIF partial update 和 disposal
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const info = reader.frameInfo(i);
    if (info.disposal === 2) {
      ctx.clearRect(0, 0, w, h);
    }
    const rgba = new Uint8Array(w * h * 4);
    reader.decodeAndBlitFrameRGBA(i, rgba);
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    tmp.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h), 0, 0);
    ctx.drawImage(tmp, 0, 0);
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const fname = originalName.replace(/\.gif$/i, '') + '_' + String(i+1).padStart(3,'0') + '.png';
    const file = new File([blob], fname, {type: 'image/png'});
    files.push(file);
    let delay = info.delay * 10;
    if (delay < 10) delay = 100;
    frameDelays.push(Math.max(16, delay));
  }
  status.textContent = `已匯入 GIF：${n} 格`;
}

function rebuildPreviews() {
  previewUrls.forEach(u => URL.revokeObjectURL(u));
  previewUrls = files.map(f => URL.createObjectURL(f));
  if (frameDelays.length === 0) {
    frameDelays = files.map(() => 100);
  }
  currentFrame = 0;
  renderList();
  renderTimeline();
  if (files.length > 0) {
    showFrame(0);
    detectFirstImageSize();
    document.querySelector('.preview-area').style.display = 'block';
    document.getElementById('fileListGroup').style.display = 'block';
  } else {
    previewImg.style.display = 'none';
    previewInfo.textContent = '';
    document.querySelector('.preview-area').style.display = 'none';
    document.getElementById('fileListGroup').style.display = 'none';
    updatePlaybackInfo();
  }
}

async function detectFirstImageSize() {
  if (files.length === 0) {
    sourceW = sourceH = 0;
    outW.value = '';
    outH.value = '';
    return;
  }
  try {
    const bitmap = await createImageBitmap(files[0]);
    sourceW = bitmap.width;
    sourceH = bitmap.height;
    outW.value = sourceW;
    outH.value = sourceH;
  } catch (e) { console.warn(e); }
}

function renderList() {
  fileList.innerHTML = files.map((f, i) =>
    `<div><span>${i+1}. ${f.name}</span><span>${(f.size/1024).toFixed(1)} KB</span></div>`
  ).join('');
  makeBtn.disabled = files.length < 2;
}

function renderTimeline() {
  timeline.innerHTML = '';
  previewUrls.forEach((url, i) => {
    const div = document.createElement('div');
    div.className = 'timeline-item' + (i === currentFrame ? ' active' : '');
    div.innerHTML = `<img src="${url}"><div class="num">${i+1}</div>`;
    div.addEventListener('click', () => showFrame(i));
    timeline.appendChild(div);
  });

  const grid = document.getElementById('frameGrid');
  if (!grid) return;
  grid.innerHTML = '';
  files.forEach((file, i) => {
    const card = document.createElement('div');
    card.className = 'frame-card' + (i === currentFrame ? ' active' : '');
    card.innerHTML = `
      <div class="frame-num">${i + 1}</div>
      <button class="frame-del" title="移除">✕</button>
      <img class="frame-thumb" src="${previewUrls[i]}">
      <div class="frame-name">${file.name}</div>
      <div class="frame-ms">
        <input type="number" class="frame-delay-input" value="${frameDelays[i] || 100}" min="16" step="1">
        <span>ms</span>
      </div>
      <div class="frame-nav">
        <button class="nav-mini nav-first" title="移到最前"></button>
        <button class="nav-mini nav-prev" title="往前一格"></button>
        <span class="frame-nav-info"></span>
        <button class="nav-mini nav-next" title="往後一格"></button>
        <button class="nav-mini nav-last" title="移到最後"></button>
      </div>
    `;
    const navBtns = card.querySelectorAll('.frame-nav button');
    navBtns[0].addEventListener('click', (e) => {
      e.stopPropagation();
      if (i === 0) return;
      moveFrame(i, 0);
    });
    navBtns[1].addEventListener('click', (e) => {
      e.stopPropagation();
      if (i === 0) return;
      swapFrames(i, i - 1);
    });
    navBtns[2].addEventListener('click', (e) => {
      e.stopPropagation();
      if (i === files.length - 1) return;
      swapFrames(i, i + 1);
    });
    navBtns[3].addEventListener('click', (e) => {
      e.stopPropagation();
      if (i === files.length - 1) return;
      moveFrame(i, files.length - 1);
    });
    const delayInput = card.querySelector('.frame-delay-input');
    delayInput.addEventListener('input', (e) => {
      e.stopPropagation();
      const val = Math.max(16, parseInt(e.target.value) || 100);
      frameDelays[i] = val;
      updatePlaybackInfo();
    });
    delayInput.addEventListener('click', (e) => e.stopPropagation());
    const delBtn = card.querySelector('.frame-del');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteFrame(i);
    });
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('frame-del')) return;
      if (e.target.closest('.frame-nav')) return;
      if (e.target.classList.contains('frame-delay-input')) return;
      showFrame(i);
    });
    grid.appendChild(card);
  });
}

function swapFrames(a, b) {
  [files[a], files[b]] = [files[b], files[a]];
  [previewUrls[a], previewUrls[b]] = [previewUrls[b], previewUrls[a]];
  [frameDelays[a], frameDelays[b]] = [frameDelays[b], frameDelays[a]];
  renderList();
  renderTimeline();
  showFrame(b);
}

function moveFrame(from, to) {
  const f = files.splice(from, 1)[0];
  const u = previewUrls.splice(from, 1)[0];
  const d = frameDelays.splice(from, 1)[0];
  files.splice(to, 0, f);
  previewUrls.splice(to, 0, u);
  frameDelays.splice(to, 0, d);
  renderList();
  renderTimeline();
  showFrame(to);
}

function deleteFrame(i) {
  pause();
  URL.revokeObjectURL(previewUrls[i]);
  files.splice(i, 1);
  previewUrls.splice(i, 1);
  frameDelays.splice(i, 1);
  if (files.length === 0) {
    previewImg.style.display = 'none';
    previewInfo.textContent = '';
    document.getElementById('fileListGroup').style.display = 'none';
    document.querySelector('.preview-area').style.display = 'none';
    makeBtn.disabled = true;
    updatePlaybackInfo();
    return;
  }
  if (currentFrame >= files.length) currentFrame = files.length - 1;
  else if (i < currentFrame) currentFrame--;
  renderList();
  renderTimeline();
  showFrame(currentFrame);
}

function showFrame(i) {
  if (previewUrls.length === 0) return;
  currentFrame = i;
  previewImg.src = previewUrls[i];
  previewImg.style.display = 'block';
  previewInfo.textContent = `Frame: ${i+1} / ${previewUrls.length}`;
  document.querySelectorAll('.frame-card').forEach((el, idx) => {
    el.classList.toggle('active', idx === i);
  });
  document.querySelectorAll('.timeline-item').forEach((el, idx) => {
    el.classList.toggle('active', idx === i);
  });
  updatePlaybackInfo();
}

function updatePlaybackInfo() {
  const posEl = document.getElementById('framePosText');
  const timeEl = document.getElementById('totalTimeText');
  if (!posEl || !timeEl) return;
  const totalMs = frameDelays.reduce((sum, d) => sum + (d || 100), 0);
  const totalSec = totalMs / 1000;
  const fps = totalSec > 0 ? (previewUrls.length / totalSec).toFixed(1) : '0.0';
  posEl.textContent = `FPS: ${fps}`;
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  const ms = Math.round((totalSec % 1) * 100);
  timeEl.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(2,'0')}`;
}

function togglePlay() {
  if (previewUrls.length < 2) return;
  if (playing) {
    pause();
  } else {
    playing = true;
    playBtn.classList.add('playing');
    tick();
  }
}
function tick() {
  if (!playing) return;
  const delay = frameDelays[currentFrame] || 100;
  playTimer = setTimeout(() => {
    showFrame((currentFrame + 1) % previewUrls.length);
    tick();
  }, delay);
}
function pause() {
  playing = false;
  playBtn.classList.remove('playing');
  if (playTimer) clearTimeout(playTimer);
}
playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', () => { pause(); showFrame((currentFrame - 1 + previewUrls.length) % previewUrls.length); });
nextBtn.addEventListener('click', () => { pause(); showFrame((currentFrame + 1) % previewUrls.length); });
document.getElementById('firstBtn').addEventListener('click', () => { pause(); showFrame(0); });
document.getElementById('lastBtn').addEventListener('click', () => { pause(); showFrame(previewUrls.length - 1); });

clearBtn.addEventListener('click', () => {
  pause();
  files = [];
  previewUrls.forEach(u => URL.revokeObjectURL(u));
  previewUrls = [];
  frameDelays = [];
  currentFrame = 0;
  sourceW = sourceH = 0;
  outW.value = '';
  outH.value = '';
  renderList();
  renderTimeline();
  previewImg.style.display = 'none';
  previewInfo.textContent = '尚無圖片';
  downloadLink.style.display = 'none';
  status.textContent = '';
  fileInfo.textContent = '';
  document.querySelector('.preview-area').style.display = 'none';
  document.getElementById('fileListGroup').style.display = 'none';
});

makeBtn.addEventListener('click', async () => {
  pause();
  makeBtn.disabled = true;
  status.textContent = '處理中...';
  try {
    const loops = parseInt(document.getElementById('loops').value) || 0;
    const cnum = parseInt(document.getElementById('cnum').value);

    const frames = [];
    let srcW = 0, srcH = 0;
    for (const f of files) {
      const bitmap = await createImageBitmap(f);
      srcW = bitmap.width; srcH = bitmap.height;
      break;
    }
    sourceW = srcW; sourceH = srcH;

    let targetW = parseInt(outW.value) || srcW;
    let targetH = parseInt(outH.value) || srcH;
    if (outW.value && !outH.value) targetH = Math.round(srcH * targetW / srcW);
    if (outH.value && !outW.value) targetW = Math.round(srcW * targetH / srcH);

    for (const f of files) {
      const bitmap = await createImageBitmap(f);
      if (bitmap.width !== srcW || bitmap.height !== srcH) {
        throw new Error(`「${f.name}」尺寸 ${bitmap.width}x${bitmap.height} 跟第一張 ${srcW}x${srcH} 不同`);
      }
      const canvas = document.createElement('canvas');
      canvas.width = targetW; canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, 0, 0, targetW, targetH);
      const data = ctx.getImageData(0, 0, targetW, targetH).data;
      frames.push(new Uint8Array(data).buffer);
    }
    const w = targetW, h = targetH;

    const dels = frameDelays.slice(0, frames.length);

    status.textContent = '正在編碼 APNG...';
    let buf = UPNG.encode(frames, w, h, cnum, dels);
    if (loops > 0) buf = setApngLoops(buf, loops);

    const blob = new Blob([buf], {type: 'image/apng'});
    const url = URL.createObjectURL(blob);
    previewImg.src = url;
    previewInfo.textContent = `APNG 預覽 · ${frames.length} 格`;
    downloadLink.href = url;
    downloadLink.download = 'animation.png';
    downloadLink.style.display = 'inline-block';

    const loopMs = dels.reduce((a, b) => a + b, 0);
    const loopSec = (loopMs / 1000).toFixed(2);
    let loopInfo = `單次循環 ${loopSec} 秒`;
    if (loops > 0) {
      const totalSec = (loopMs * loops / 1000).toFixed(2);
      loopInfo += ` · 共播 ${loops} 次 = ${totalSec} 秒`;
    } else {
      loopInfo += ` · 無限循環`;
    }
    fileInfo.textContent = `尺寸 ${w}x${h} · ${frames.length} 影格 · ${loopInfo} · 檔案 ${(blob.size/1024).toFixed(1)} KB`;
    status.textContent = `✅ 完成！共 ${frames.length} 影格`;
  } catch (err) {
    status.textContent = `❌ 錯誤：${err.message}`;
    console.error(err);
  } finally {
    makeBtn.disabled = false;
  }
});
