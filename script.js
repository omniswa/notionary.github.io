// ─────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────
const S = {
  folders: [],
  notes: [],
  folderId: null, // null = All Notes
  noteId: null,
  query: '',
  mobView: 'list', // 'list' | 'editor'
  _renFid: null,
  _delFid: null,
  _saveT: null,
};

// ─────────────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────────────
const LS_F = 'nota_f2',
  LS_N = 'nota_n2';

function persist() {
  try {
    localStorage.setItem(LS_F, JSON.stringify(S.folders));
    localStorage.setItem(LS_N, JSON.stringify(S.notes));
  } catch { toast('Storage full — old notes may be lost', 'err'); }
}

function hydrate() {
  try {
    const f = localStorage.getItem(LS_F),
      n = localStorage.getItem(LS_N);
    if (f) S.folders = JSON.parse(f);
    if (n) S.notes = JSON.parse(n);
  } catch {
    S.folders = [];
    S.notes = [];
  }

  if (!S.folders.length) {
    const fid = uid();
    S.folders.push({ id: fid, name: 'Personal', ts: now() });
    S.notes.push({
      id: uid(),
      fid,
      title: 'Welcome to Nota 👋',
      body: 'Your notes live right here in this browser — no account needed.\n\n• Create folders to stay organised\n• Use ⌘N / Ctrl+N to write a new note instantly\n• Hit Export to save any folder as a .zip file\n• Search across all your notes from the sidebar',
      ct: now(),
      ut: now(),
    });
    persist();
  }
}

// ─────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function now() { return Date.now(); }

function relTime(ts) {
  const d = now() - ts;
  if (d < 60e3) return 'just now';
  if (d < 3600e3) return Math.floor(d / 60e3) + 'm ago';
  if (d < 86400e3) return Math.floor(d / 3600e3) + 'h ago';
  if (d < 604800e3) return Math.floor(d / 86400e3) + 'd ago';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function hilite(text, q) {
  if (!q) return esc(text);
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return esc(text).replace(rx, m => `<mark>${m}</mark>`);
}

function wc(s) { return s.trim() ? s.trim().split(/\s+/).length : 0; }

// ─────────────────────────────────────────────────────────────
// DERIVED
// ─────────────────────────────────────────────────────────────
function visibleNotes() {
  let notes = S.notes;
  if (S.folderId) notes = notes.filter(n => n.fid === S.folderId);
  if (S.query) {
    const q = S.query.toLowerCase();
    notes = notes.filter(n =>
      n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
  }
  return notes.slice().sort((a, b) => b.ut - a.ut);
}

function folderCount(fid) { return S.notes.filter(n => n.fid === fid).length; }

function folderName(fid) { return (S.folders.find(f => f.id === fid) || {}).name || ''; }

// ─────────────────────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────────────────────
function render() {
  rFolders();
  rNotes();
  rEditor();
  rMobile();
}

function rFolders() {
  // All-notes button
  const aBtn = document.getElementById('all-notes-btn');
  aBtn.classList.toggle('on', S.folderId === null);
  document.getElementById('all-cnt').textContent = S.notes.length;

  // Folder list
  document.getElementById('folder-list').innerHTML = S.folders.map(f => {
    const on = S.folderId === f.id;
    return `
    <li class="fi${on?' on':''}" onclick="selectFolder('${f.id}')">
      <span class="fi-ico">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="${on?'currentColor':'none'}"
          stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
      </span>
      <span class="fi-name">${esc(f.name)}</span>
      <span class="fi-cnt">${folderCount(f.id)}</span>
      <span class="fi-acts" onclick="event.stopPropagation()">
        <button class="fi-act" title="Rename" onclick="startRename('${f.id}')">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="fi-act del" title="Delete folder" onclick="startDelFolder('${f.id}')">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </span>
    </li>`;
  }).join('');

  // Panel title
  const label = S.folderId ? folderName(S.folderId) :
    S.query ? 'Search Results' :
    'All Notes';
  document.getElementById('np-title').textContent = label;
  document.getElementById('mob-title').textContent = label;
}

function rNotes() {
  const list = document.getElementById('notes-list');
  const notes = visibleNotes();
  const q = S.query;

  if (!notes.length) {
    list.innerHTML = `
      <div class="note-empty">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <p>${q ? 'No notes match your search.' : 'This folder is empty.'}</p>
        <p class="hint">${q ? 'Try different keywords.' : 'Click + to write your first note.'}</p>
      </div>`;
    return;
  }

  list.innerHTML = notes.map(n => {
    const preview = n.body.replace(/\n+/g, ' ').slice(0, 90);
    const on = n.id === S.noteId;
    const showFolder = S.folderId === null && !S.query;
    return `
    <div class="ni${on?' on':''}" onclick="selectNote('${n.id}')">
      <div class="ni-title">${hilite(n.title||'Untitled', q)}</div>
      <div class="ni-preview">${hilite(preview, q)}</div>
      <div class="ni-meta">
        ${showFolder ? `<span class="ni-folder">${esc(folderName(n.fid))}</span>` : ''}
        <span class="ni-date">${relTime(n.ut)}</span>
      </div>
    </div>`;
  }).join('');
}

function rEditor() {
  const note = S.notes.find(n => n.id === S.noteId);
  const noSel = document.getElementById('no-sel');
  const active = document.getElementById('active-editor');

  if (!note) {
    noSel.style.display = 'flex';
    active.style.display = 'none';
    return;
  }
  noSel.style.display = 'none';
  active.style.display = 'flex';

  // Folder selector
  const sel = document.getElementById('note-folder-sel');
  sel.innerHTML = S.folders.map(f =>
    `<option value="${f.id}"${f.id===note.fid?' selected':''}>${esc(f.name)}</option>`
  ).join('');

  // Inputs — only update if not focused
  const titleEl = document.getElementById('note-title');
  const bodyEl = document.getElementById('note-body');
  if (document.activeElement !== titleEl) titleEl.value = note.title;
  if (document.activeElement !== bodyEl) bodyEl.value = note.body;

  // Meta bar
  const words = wc(note.body),
    chars = note.body.length;
  document.getElementById('ed-meta').innerHTML =
    `<span>${words} word${words!==1?'s':''}</span>` +
    `<span>${chars} char${chars!==1?'s':''}</span>` +
    `<span>Saved ${relTime(note.ut)}</span>`;
}

function rMobile() {
  const mobile = window.innerWidth <= 768;
  const np = document.getElementById('notes-panel');
  const ep = document.getElementById('editor-panel');
  if (!mobile) {
    np.classList.remove('hide');
    ep.classList.remove('hide');
    return;
  }
  if (S.mobView === 'list') {
    np.classList.remove('hide');
    ep.classList.add('hide');
  }
  else {
    np.classList.add('hide');
    ep.classList.remove('hide');
  }
}

// ─────────────────────────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────────────────────────
function selectFolder(id) {
  S.folderId = id;
  S.noteId = null;
  S.query = '';
  S.mobView = 'list';
  document.getElementById('search-input').value = '';
  closeSidebar();
  render();
}

function selectNote(id) {
  S.noteId = id;
  S.mobView = 'editor';
  render();
}

function newNote() {
  const fid = S.folderId || (S.folders[0] || {}).id;
  if (!fid) { toast('Create a folder first', 'err'); return; }
  const note = { id: uid(), fid, title: '', body: '', ct: now(), ut: now() };
  S.notes.unshift(note);
  S.noteId = note.id;
  S.mobView = 'editor';
  persist();
  render();
  setTimeout(() => document.getElementById('note-title')?.focus(), 60);
}

function autoSave() {
  clearTimeout(S._saveT);
  S._saveT = setTimeout(() => {
    const note = S.notes.find(n => n.id === S.noteId);
    if (!note) return;
    note.title = document.getElementById('note-title').value;
    note.body = document.getElementById('note-body').value;
    note.ut = now();
    persist();
    rNotes();
    rEditor();
  }, 350);
}

// ─────────────────────────────────────────────────────────────
// FOLDER CRUD
// ─────────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('on'); }

function closeModal(id) { document.getElementById(id).classList.remove('on'); }

function startNewFolder() {
  document.getElementById('m-folder-name').value = '';
  openModal('m-new-folder');
  setTimeout(() => document.getElementById('m-folder-name').focus(), 60);
}

function confirmNewFolder() {
  const name = document.getElementById('m-folder-name').value.trim();
  if (!name) return;
  S.folders.push({ id: uid(), name, ts: now() });
  persist();
  closeModal('m-new-folder');
  render();
  toast(`"${name}" created`);
}

function startRename(id) {
  S._renFid = id;
  const f = S.folders.find(f => f.id === id);
  document.getElementById('m-rename-val').value = f.name;
  openModal('m-rename-folder');
  setTimeout(() => {
    const el = document.getElementById('m-rename-val');
    el.focus();
    el.select();
  }, 60);
}

function confirmRename() {
  const name = document.getElementById('m-rename-val').value.trim();
  if (!name) return;
  const f = S.folders.find(f => f.id === S._renFid);
  if (f) {
    f.name = name;
    persist();
    render();
    toast('Folder renamed');
  }
  closeModal('m-rename-folder');
}

function startDelFolder(id) {
  S._delFid = id;
  const f = S.folders.find(f => f.id === id);
  const cnt = folderCount(id);
  document.getElementById('m-del-folder-msg').textContent = cnt ?
    `Delete "${f.name}"? This will also permanently delete its ${cnt} note${cnt>1?'s':''}.` :
    `Delete "${f.name}"? This cannot be undone.`;
  openModal('m-del-folder');
}

function confirmDelFolder() {
  S.folders = S.folders.filter(f => f.id !== S._delFid);
  S.notes = S.notes.filter(n => n.fid !== S._delFid);
  if (S.folderId === S._delFid) {
    S.folderId = null;
    S.noteId = null;
  }
  persist();
  closeModal('m-del-folder');
  render();
  toast('Folder deleted');
}

// ─────────────────────────────────────────────────────────────
// NOTE DELETE
// ─────────────────────────────────────────────────────────────
function confirmDelNote() {
  S.notes = S.notes.filter(n => n.id !== S.noteId);
  S.noteId = null;
  S.mobView = 'list';
  persist();
  closeModal('m-del-note');
  render();
  toast('Note deleted');
}

// ─────────────────────────────────────────────────────────────
// EXPORT ZIP
// ─────────────────────────────────────────────────────────────
async function exportZip() {
  const zip = new JSZip();
  const all = S.folderId === null;
  const notes = all ? S.notes : S.notes.filter(n => n.fid === S.folderId);
  const zipName = all ? 'all_notes' : folderName(S.folderId).replace(/[^\w\s-]/g, '').trim();

  if (!notes.length) { toast('No notes to export', 'err'); return; }

  const addNote = (folder_zip, note, idx) => {
    const safe = (note.title || `Note_${idx+1}`).replace(/[^\w\s-]/g, ' ').trim() || `Note_${idx+1}`;
    const body =
      `${note.title || 'Untitled'}\n${'─'.repeat(Math.min((note.title||'Untitled').length, 50))}\n\n` +
      `${note.body}\n\n` +
      `Created : ${new Date(note.ct).toLocaleString()}\n` +
      `Modified: ${new Date(note.ut).toLocaleString()}`;
    folder_zip.file(`${safe}.txt`, body);
  };

  if (all) {
    S.folders.forEach(f => {
      const fn = S.notes.filter(n => n.fid === f.id);
      if (!fn.length) return;
      const fz = zip.folder(f.name);
      fn.forEach((n, i) => addNote(fz, n, i));
    });
  } else {
    const fz = zip.folder(folderName(S.folderId));
    notes.forEach((n, i) => addNote(fz, n, i));
  }

  const btn = document.getElementById('export-btn');
  const orig = btn.innerHTML;
  btn.innerHTML = `<svg class="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Exporting…`;
  btn.disabled = true;

  try {
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `${zipName}_${new Date().toISOString().slice(0,10)}.zip`,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    toast(`Exported ${notes.length} note${notes.length>1?'s':''}`, 'ok');
  } catch { toast('Export failed', 'err'); }
  finally {
    btn.innerHTML = orig;
    btn.disabled = false;
  }
}

// ─────────────────────────────────────────────────────────────
// SIDEBAR (MOBILE)
// ─────────────────────────────────────────────────────────────
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').classList.add('on');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('on');
}

// ─────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────
function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = `toast${type?' '+type:''}`;
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

// ─────────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────────
function bindEvents() {
  // Search
  document.getElementById('search-input').addEventListener('input', e => {
    S.query = e.target.value.trim();
    if (S.query) S.folderId = null;
    rFolders();
    rNotes();
  });

  // Folder buttons
  document.getElementById('new-folder-btn').onclick = startNewFolder;
  document.getElementById('m-folder-confirm').onclick = confirmNewFolder;
  document.getElementById('m-folder-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmNewFolder();
    if (e.key === 'Escape') closeModal('m-new-folder');
  });
  document.getElementById('m-rename-confirm').onclick = confirmRename;
  document.getElementById('m-rename-val').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmRename();
    if (e.key === 'Escape') closeModal('m-rename-folder');
  });
  document.getElementById('m-del-folder-confirm').onclick = confirmDelFolder;
  document.getElementById('m-del-note-confirm').onclick = confirmDelNote;

  // New note
  ['desk-new', 'mob-new'].forEach(id =>
    document.getElementById(id).onclick = newNote);

  // Editor inputs
  document.getElementById('note-title').addEventListener('input', autoSave);
  document.getElementById('note-body').addEventListener('input', autoSave);

  // Move-to-folder
  document.getElementById('note-folder-sel').addEventListener('change', e => {
    const note = S.notes.find(n => n.id === S.noteId);
    if (!note) return;
    note.fid = e.target.value;
    note.ut = now();
    persist();
    render();
  });

  // Delete note
  document.getElementById('del-note-btn').onclick = () => {
    if (S.noteId) openModal('m-del-note');
  };

  // Export
  document.getElementById('export-btn').onclick = exportZip;

  // Mobile
  document.getElementById('mob-menu').onclick = openSidebar;
  document.getElementById('overlay').onclick = closeSidebar;
  document.getElementById('back-btn').onclick = () => {
    S.mobView = 'list';
    S.noteId = null;
    rNotes();
    rEditor();
    rMobile();
  };

  // Modal backdrop click-outside
  ['m-new-folder', 'm-rename-folder', 'm-del-folder', 'm-del-note'].forEach(id => {
    document.getElementById(id).addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModal(id);
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      newNote();
    }
    if (e.key === 'Escape') {
      ['m-new-folder', 'm-rename-folder', 'm-del-folder', 'm-del-note'].forEach(closeModal);
      if (window.innerWidth <= 768) closeSidebar();
    }
  });

  window.addEventListener('resize', rMobile);
}

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────
hydrate();
bindEvents();
render();