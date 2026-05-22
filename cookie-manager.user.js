// ==UserScript==
// @name         Cookie Manager
// @name:zh-CN   Cookie 管理器
// @namespace    https://github.com/Minis233/cookie-manager
// @version      0.5.1
// @description  A modern cookie manager userscript: dual-engine read/write, batch CRUD, multi-select, paste-to-import, JSON export/import, multiple copy formats, trash bin, dark mode, sort/filter/group, bilingual UI.
// @description:zh-CN  现代化 Cookie 管理油猴脚本：双核引擎读写、批量增删改查、多选、粘贴解析、JSON 导入导出、多种复制格式、回收站、暗色模式、排序/筛选/分组、中英双语 UI
// @author       Minis
// @license      MIT
// @homepageURL  https://github.com/Minis233/cookie-manager
// @supportURL   https://github.com/Minis233/cookie-manager/issues
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    const POS_KEY = 'cm_iconPos_v1';
    const HAS_CS = typeof window.cookieStore !== 'undefined';

    /* ---------- 通用工具 ---------- */
    const safeDecode = s => { try { return decodeURIComponent(s == null ? '' : s); } catch { return String(s == null ? '' : s); } };
    // 跨脚本管理器兼容：Tampermonkey/Violentmonkey 提供 sync GM_*；Greasemonkey 4 只有 async GM.*；
    // 都不支持时退化为 localStorage（功能不丢失，但跨域不共享，对本脚本场景无影响）
    const _GM_get = typeof GM_getValue === 'function' ? GM_getValue : null;
    const _GM_set = typeof GM_setValue === 'function' ? GM_setValue : null;
    const gmGet = (k, d) => {
        try {
            let v;
            if (_GM_get) v = _GM_get(k);
            else if (typeof localStorage !== 'undefined') v = localStorage.getItem(k);
            if (v == null) return d;
            return typeof v === 'string' && (v[0] === '{' || v[0] === '[') ? JSON.parse(v) : v;
        } catch { return d; }
    };
    const gmSet = (k, v) => {
        try {
            const s = typeof v === 'string' ? v : JSON.stringify(v);
            if (_GM_set) _GM_set(k, s);
            else if (typeof localStorage !== 'undefined') localStorage.setItem(k, s);
        } catch {}
    };
    const escHtml = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    /* ---------- i18n ---------- */
    const LANG_KEY = 'cm_lang_v1';
    const I18N = {
        zh: {
            title: 'Cookie 管理器', titleCompat: ' (兼容模式)',
            badd: '批量添加', sadd: '单个添加', copyall: '复制所有', delall: '一键删除',
            phKey: '按 key 搜索', phVal: '按 value 搜索',
            empty: '没有匹配的 Cookie',
            modify: '修改', copyKey: '复制 Key', copyVal: '复制值', copyKv: '复制 KV', del: '删除',
            details: '详情', expand: '展开', collapse: '收起',
            sel: '多选', selExit: '退出多选', selAll: '全选', selAllPlus: n => `全选(+${n})`, selNone: '取消全选',
            cancel: '取消', ok: '确定', save: '保存',
            copyN: n => `复制(${n})`, delN: n => `删除(${n})`,
            confirmDelOne: k => `删除 "${k}"？`, confirmDelN: n => `删除选中的 ${n} 条 Cookie？`,
            confirmDelAllTitle: '一键删除', confirmDelAll: n => `删除当前网站全部 ${n} 条 Cookie？此操作不可逆。`,
            tNoCookie: '当前没有 Cookie', tCopiedN: n => `已复制 ${n} 条`, tCopyFail: '复制失败', tCopied: '已复制',
            tDeleted: '已删除', tNotSelected: '未选中', tEmptyList: '当前列表为空',
            tAdded: '已新增', tModified: '已修改', tNeedKey: 'Key 不能为空', tNeedRow: '请至少填一条',
            tBatchOk: (ok, total) => `成功 ${ok} / ${total}`,
            tDomainMismatch: h => `设置失败：domain 与当前网站不匹配 (${h})`,
            tSetFail: msg => `设置失败：${msg}`,
            tInvalidJson: '无效的 JSON 格式',
            tImportedN: n => `已导入 ${n} 条`,
            tUndo: '撤销', tRestoredN: n => `已撤销 ${n} 条删除`,
            addNew: '新增 Cookie', edit: '修改 Cookie', batch: '批量添加 Cookie',
            lblKey: 'Key', lblValue: 'Value', lblDomain: 'Domain', lblPath: 'Path', lblDays: '有效期 (天)',
            phEmptyDomain: '留空使用当前域名',
            lblParse: '粘贴解析（支持 a=b; c=d 或多行 key=value）',
            phParse: 'key1=value1; key2=value2\nkey3=value3',
            addRow: '+ 添加一行', batchSave: '全部添加',
            delConfirm: '删除',
            menu: '更多', exp: '导出 JSON', expSel: '导出选中', impJson: '导入 JSON',
            trash: '回收站', trashEmpty: '回收站为空', trashCount: n => `回收站 (${n})`,
            trashRestore: '恢复', trashPurge: '永久删除', trashClear: '清空回收站',
            trashRestoreN: n => `恢复(${n})`, trashPurgeN: n => `永久删除(${n})`,
            trashConfirmClear: '永久清空回收站？此操作不可逆。',
            trashConfirmPurgeN: n => `永久删除选中的 ${n} 条？此操作不可逆。`,
            trashRestoredN: n => `已恢复 ${n} 条`, trashPurgedN: n => `已永久删除 ${n} 条`,
            trashRestored: '已恢复', trashPurged: '已永久删除', trashCleared: '回收站已清空',
            trashTime: ts => new Date(ts).toLocaleString(),
            copyAs: '复制为...', cfHeader: 'Cookie Header', cfCurl: 'cURL --cookie', cfJson: 'JSON', cfKv: 'KV (key=value)',
            impTitle: '导入 Cookie',
            impHint: '支持以下格式：\n• JSON 数组（本工具或 EditThisCookie 导出）\n• 每行 key=value\n• Cookie header 字符串',
            secure: 'Secure', http: 'HttpOnly', sameSite: 'SameSite',
            sizeBytes: n => `${n} B`,
            sizeWarn: '体积过大（>4KB 可能被截断）',
            theme: '主题', themeAuto: '跟随系统', themeLight: '浅色', themeDark: '深色',
            sort: '排序', sortKey: 'Key', sortSize: '体积', sortExpires: '过期时间',
            sortAsc: '↑ 升序', sortDesc: '↓ 降序',
            group: '分组', groupNone: '不分组', groupDomain: '按域名', groupRoot: '按主域',
            filterSecure: '仅 Secure', filterHttp: '仅 HttpOnly',
            statsN: (n, total) => total > n ? `${n} / ${total}` : `${n}`,
        },
        en: {
            title: 'Cookie Manager', titleCompat: ' (Compat)',
            badd: 'Batch Add', sadd: 'Add One', copyall: 'Copy All', delall: 'Delete All',
            phKey: 'Search by key', phVal: 'Search by value',
            empty: 'No matching cookies',
            modify: 'Edit', copyKey: 'Copy Key', copyVal: 'Copy Value', copyKv: 'Copy KV', del: 'Delete',
            details: 'Details', expand: 'Expand', collapse: 'Collapse',
            sel: 'Select', selExit: 'Exit Select', selAll: 'Select All', selAllPlus: n => `Select All (+${n})`, selNone: 'Deselect All',
            cancel: 'Cancel', ok: 'OK', save: 'Save',
            copyN: n => `Copy (${n})`, delN: n => `Delete (${n})`,
            confirmDelOne: k => `Delete "${k}"?`, confirmDelN: n => `Delete ${n} selected cookies?`,
            confirmDelAllTitle: 'Delete All', confirmDelAll: n => `Delete all ${n} cookies for this site? This cannot be undone.`,
            tNoCookie: 'No cookies on this site', tCopiedN: n => `Copied ${n} item${n === 1 ? '' : 's'}`, tCopyFail: 'Copy failed', tCopied: 'Copied',
            tDeleted: 'Deleted', tNotSelected: 'Nothing selected', tEmptyList: 'List is empty',
            tAdded: 'Added', tModified: 'Updated', tNeedKey: 'Key is required', tNeedRow: 'Add at least one row',
            tBatchOk: (ok, total) => `Done ${ok} / ${total}`,
            tDomainMismatch: h => `Failed: domain mismatch (current: ${h})`,
            tSetFail: msg => `Failed: ${msg}`,
            tInvalidJson: 'Invalid JSON',
            tImportedN: n => `Imported ${n} item${n === 1 ? '' : 's'}`,
            tUndo: 'Undo', tRestoredN: n => `Restored ${n} cookie${n === 1 ? '' : 's'}`,
            addNew: 'Add Cookie', edit: 'Edit Cookie', batch: 'Batch Add Cookies',
            lblKey: 'Key', lblValue: 'Value', lblDomain: 'Domain', lblPath: 'Path', lblDays: 'Max Age (days)',
            phEmptyDomain: 'Leave blank to use current host',
            lblParse: 'Paste to parse (supports a=b; c=d or multi-line key=value)',
            phParse: 'key1=value1; key2=value2\nkey3=value3',
            addRow: '+ Add Row', batchSave: 'Add All',
            delConfirm: 'Delete',
            menu: 'More', exp: 'Export JSON', expSel: 'Export Selected', impJson: 'Import JSON',
            trash: 'Trash', trashEmpty: 'Trash is empty', trashCount: n => `Trash (${n})`,
            trashRestore: 'Restore', trashPurge: 'Delete forever', trashClear: 'Empty trash',
            trashRestoreN: n => `Restore (${n})`, trashPurgeN: n => `Delete forever (${n})`,
            trashConfirmClear: 'Permanently empty the trash? This cannot be undone.',
            trashConfirmPurgeN: n => `Permanently delete ${n} selected? This cannot be undone.`,
            trashRestoredN: n => `Restored ${n} item${n === 1 ? '' : 's'}`, trashPurgedN: n => `Permanently deleted ${n}`,
            trashRestored: 'Restored', trashPurged: 'Deleted forever', trashCleared: 'Trash emptied',
            trashTime: ts => new Date(ts).toLocaleString(),
            copyAs: 'Copy As...', cfHeader: 'Cookie Header', cfCurl: 'cURL --cookie', cfJson: 'JSON', cfKv: 'KV (key=value)',
            impTitle: 'Import Cookies',
            impHint: 'Supported formats:\n• JSON array (from this tool or EditThisCookie)\n• key=value per line\n• Cookie header string',
            secure: 'Secure', http: 'HttpOnly', sameSite: 'SameSite',
            sizeBytes: n => `${n} B`,
            sizeWarn: 'Too large (>4KB may be truncated)',
            theme: 'Theme', themeAuto: 'Auto', themeLight: 'Light', themeDark: 'Dark',
            sort: 'Sort', sortKey: 'Key', sortSize: 'Size', sortExpires: 'Expires',
            sortAsc: '↑ Asc', sortDesc: '↓ Desc',
            group: 'Group', groupNone: 'No group', groupDomain: 'By domain', groupRoot: 'By root domain',
            filterSecure: 'Secure only', filterHttp: 'HttpOnly only',
            statsN: (n, total) => total > n ? `${n} / ${total}` : `${n}`,
        }
    };
    const detectLang = () => {
        const saved = gmGet(LANG_KEY, null);
        if (saved && I18N[saved]) return saved;
        const nav = (navigator.language || 'en').toLowerCase();
        return nav.startsWith('zh') ? 'zh' : 'en';
    };
    let lang = detectLang();
    const t = (key, ...args) => {
        const v = I18N[lang][key];
        return typeof v === 'function' ? v(...args) : (v == null ? key : v);
    };
    const setLang = (l) => { lang = l; gmSet(LANG_KEY, l); };

    /* ---------- 偏好（主题 / 排序 / 分组 / 筛选） ---------- */
    const PREFS_KEY = 'cm_prefs_v1';
    const defaultPrefs = { theme: 'auto', sort: 'key', sortDir: 'asc', group: 'none', secureOnly: false, httpOnly: false, collapsed: {} };
    let prefs = Object.assign({}, defaultPrefs, gmGet(PREFS_KEY, {}));
    const savePrefs = () => gmSet(PREFS_KEY, prefs);
    const setPref = (k, v) => { prefs[k] = v; savePrefs(); };

    let mql = null;
    function applyTheme() {
        if (!host) return;
        let dark = false;
        if (prefs.theme === 'dark') dark = true;
        else if (prefs.theme === 'auto') {
            try { dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; } catch {}
        }
        host.classList.toggle('dark', dark);
    }
    function watchTheme() {
        if (mql || !window.matchMedia) return;
        try {
            mql = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = () => { if (prefs.theme === 'auto') applyTheme(); };
            if (mql.addEventListener) mql.addEventListener('change', handler);
            else if (mql.addListener) mql.addListener(handler);
        } catch {}
    }

    /* ---------- 样式 ---------- */
    const STYLE = `
:host{all:initial;
  --bg:#fff;--fg:#222;--fg-soft:#444;--fg-mute:#666;--fg-faint:#888;
  --border:#ececec;--border-strong:#d4d8de;--surface:#fafbfc;--surface-2:#f3f5f8;--surface-3:#f6f8fb;--surface-pop:#fff;
  --primary:#2f6ce6;--primary-fg:#fff;--primary-soft:rgba(47,108,230,.15);
  --warn:#dc3545;--warn-soft:#fde0e0;--warn-text:#a02020;
  --flag-bg:#dfe9fa;--flag-fg:#1a4baf;
  --pop-shadow:0 8px 24px rgba(0,0,0,.18);
  --panel-shadow:0 12px 40px rgba(0,0,0,.35);
  --overlay:rgba(0,0,0,.5);
  --hover:#eef2f7;
  --size-bg:#eef0f3;--size-fg:#888;
  --kd-fg:#666;
  --toast-bg:rgba(20,20,20,.92);--toast-ok:rgba(40,140,80,.95);--toast-err:rgba(190,40,40,.95);
}
:host(.dark){
  --bg:#1f2127;--fg:#e6e7ea;--fg-soft:#c0c2c8;--fg-mute:#9aa0aa;--fg-faint:#7a8088;
  --border:#34373f;--border-strong:#454853;--surface:#262931;--surface-2:#2c2f37;--surface-3:#2a2d35;--surface-pop:#262931;
  --primary:#5b8def;--primary-fg:#fff;--primary-soft:rgba(91,141,239,.22);
  --warn:#ef5260;--warn-soft:#3a2225;--warn-text:#ff9aa3;
  --flag-bg:#22324a;--flag-fg:#9bbcff;
  --pop-shadow:0 8px 24px rgba(0,0,0,.55);
  --panel-shadow:0 12px 40px rgba(0,0,0,.6);
  --overlay:rgba(0,0,0,.65);
  --hover:#2f333d;
  --size-bg:#2c2f37;--size-fg:#9aa0aa;
  --kd-fg:#a0a4ad;
}
*{box-sizing:border-box}
button{font-family:inherit}
#fab{position:fixed;width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#4f8cff,#3358c4);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;box-shadow:0 4px 14px rgba(0,0,0,.28);z-index:2147483646;cursor:grab;user-select:none;touch-action:none}
#fab:active{cursor:grabbing}
.ov{position:fixed;inset:0;background:var(--overlay);z-index:2147483647;display:none;align-items:center;justify-content:center;padding:12px;-webkit-tap-highlight-color:transparent}
.ov.show{display:flex}
.panel{background:var(--bg);color:var(--fg);border-radius:12px;width:100%;max-width:460px;max-height:86vh;display:flex;flex-direction:column;font:14px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;box-shadow:var(--panel-shadow);overflow:hidden}
.head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--primary);color:var(--primary-fg);flex-shrink:0}
.head h3{margin:0;font-size:15px;font-weight:600}
.x{cursor:pointer;font-size:22px;line-height:1;padding:0 4px}
.body{flex:1;overflow-y:auto;padding:12px 14px}
.foot{display:flex;gap:8px;padding:10px 14px;border-top:1px solid var(--border);background:var(--surface);flex-shrink:0;flex-wrap:wrap}
.row{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}
.row label{font-size:12px;color:var(--fg-mute);font-weight:600}
.row input[type=text],.row input[type=number],.row textarea,.row input[type=search]{width:100%;padding:8px 10px;border:1px solid var(--border-strong);border-radius:6px;font-size:14px;background:var(--bg);color:var(--fg);font-family:inherit}
.row textarea{min-height:80px;resize:vertical}
.row input:focus,.row textarea:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 2px var(--primary-soft)}
.btn{padding:7px 12px;border-radius:6px;border:1px solid var(--border-strong);background:var(--bg);color:var(--fg);cursor:pointer;font-size:13px}
.btn:active{transform:scale(.97)}
.btn.pri{background:var(--primary);color:var(--primary-fg);border-color:var(--primary)}
.btn.warn{background:var(--warn);color:#fff;border-color:var(--warn)}
.btn.sm{padding:4px 8px;font-size:12px}
.btn.ghost{background:transparent;border-color:var(--border-strong);color:var(--fg-soft)}
.btn.chip{padding:3px 9px;font-size:12px;border-radius:14px;background:var(--surface-2);border-color:var(--border-strong);color:var(--fg-soft)}
.btn.chip.on{background:var(--primary);color:var(--primary-fg);border-color:var(--primary)}
.search{display:flex;gap:6px;margin-bottom:10px}
.search input{flex:1}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
.grid .btn{width:100%}
.toolbar{display:flex;gap:6px;align-items:center;margin-bottom:8px;flex-wrap:wrap}
.toolbar .label{font-size:11px;color:var(--fg-mute);margin-right:2px}
.ck{border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px;background:var(--bg)}
.ck-h{display:flex;align-items:center;gap:8px}
.ck-k{font-weight:600;color:var(--fg);word-break:break-all;flex:1}
.ck-v{margin:6px 0;color:var(--fg-soft);word-break:break-all;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.ck-p{font-size:11px;color:var(--fg-faint);background:var(--surface-2);padding:3px 6px;border-radius:4px;display:inline-block}
.ck-a{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
.cb{display:none;width:18px;height:18px;border:1.5px solid var(--fg-faint);border-radius:4px;align-items:center;justify-content:center;color:#fff;font-size:12px;cursor:pointer;flex-shrink:0}
.sel .cb{display:inline-flex}
.cb.on{background:var(--primary);border-color:var(--primary)}
.empty{text-align:center;color:var(--fg-faint);padding:24px 0}
.br{display:flex;gap:6px;align-items:center;margin-bottom:6px}
.br input{flex:1;padding:6px 8px;border:1px solid var(--border-strong);border-radius:4px;font-size:13px;background:var(--bg);color:var(--fg)}
.br .rm{width:28px;height:28px;border-radius:50%;border:none;background:var(--warn);color:#fff;font-weight:700;cursor:pointer;flex-shrink:0}
#toast{position:fixed;left:50%;top:24px;transform:translateX(-50%);z-index:2147483647;display:flex;flex-direction:column;gap:6px;pointer-events:none}
.t{background:var(--toast-bg);color:#fff;padding:8px 14px;border-radius:18px;font-size:13px;max-width:80vw;box-shadow:0 4px 14px rgba(0,0,0,.3)}
.t.ok{background:var(--toast-ok)}
.t.err{background:var(--toast-err)}
.dlg{background:var(--bg);border-radius:10px;padding:16px;width:100%;max-width:360px;color:var(--fg)}
.dlg .m{margin-bottom:12px;line-height:1.5;word-break:break-word}
.dlg .a{display:flex;justify-content:flex-end;gap:8px}
.dlg input{width:100%;padding:8px 10px;border:1px solid var(--border-strong);border-radius:6px;font-size:14px;margin-bottom:12px;background:var(--bg);color:var(--fg)}
.dlg textarea{width:100%;min-height:140px;padding:8px 10px;border:1px solid var(--border-strong);border-radius:6px;font-size:13px;font-family:ui-monospace,Menlo,Consolas,monospace;margin-bottom:12px;resize:vertical;background:var(--bg);color:var(--fg)}
.ck-detail{margin-top:8px;padding:8px;background:var(--surface-3);border-radius:6px;font-size:12px;display:none}
.ck.open .ck-detail{display:block}
.ck.open .ck-v{-webkit-line-clamp:initial;display:block}
.ck-detail .row-d{display:flex;gap:8px;margin-bottom:4px;word-break:break-all}
.ck-detail .k-d{color:var(--kd-fg);flex:0 0 70px;font-weight:600}
.ck-detail .v-d{color:var(--fg);flex:1}
.ck-size{font-size:10px;color:var(--size-fg);background:var(--size-bg);padding:1px 5px;border-radius:3px;margin-left:6px}
.ck-size.warn{background:var(--warn-soft);color:var(--warn-text)}
.ck-flag{display:inline-block;padding:1px 5px;border-radius:3px;font-size:10px;margin-left:4px;background:var(--flag-bg);color:var(--flag-fg)}
.group-h{display:flex;align-items:center;gap:6px;padding:6px 10px;margin:8px 0 4px;background:var(--surface);border-radius:6px;cursor:pointer;font-size:12px;color:var(--fg-mute);font-weight:600;user-select:none}
.group-h .arrow{font-size:10px;transition:transform .15s}
.group.collapsed .group-h .arrow{transform:rotate(-90deg)}
.group.collapsed .group-body{display:none}
.group-h .count{margin-left:auto;font-weight:400;color:var(--fg-faint)}
.popm{position:fixed;background:var(--surface-pop);border:1px solid var(--border);border-radius:8px;box-shadow:var(--pop-shadow);padding:4px;z-index:2147483647;min-width:160px}
.popm .it{padding:8px 12px;cursor:pointer;border-radius:4px;font-size:13px;color:var(--fg);white-space:nowrap}
.popm .it.active{background:var(--primary-soft);color:var(--primary)}
.popm .it:hover,.popm .it:active{background:var(--hover)}
.popm .it.dv{height:1px;background:var(--border);padding:0;margin:4px 0}
.t .undo{background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;cursor:pointer;margin-left:10px;pointer-events:auto}
`;

    /* ---------- Shadow DOM 容器 ---------- */
    let host, sr, toastBox, fab, mainOv;

    function ensureHost() {
        if (host && document.documentElement.contains(host)) return;
        if (!document.body) return;
        host = document.createElement('div');
        host.id = 'cm-host';
        host.style.cssText = 'all:initial;position:fixed;width:0;height:0;z-index:2147483646';
        document.documentElement.appendChild(host);
        sr = host.attachShadow({ mode: 'open' });
        const st = document.createElement('style'); st.textContent = STYLE; sr.appendChild(st);
        toastBox = document.createElement('div'); toastBox.id = 'toast'; sr.appendChild(toastBox);
        buildFab();
        buildPanel();
        applyTheme();
        watchTheme();
    }

    function startGuardian() {
        try {
            new MutationObserver(() => {
                if (document.body && (!host || !document.documentElement.contains(host))) ensureHost();
            }).observe(document.documentElement, { childList: true });
        } catch {}
    }

    /* ---------- toast / dialog（替换 alert/confirm，Via 中更稳） ---------- */
    function toast(msg, type, action) {
        if (!toastBox) return;
        const el = document.createElement('div');
        el.className = 't' + (type ? ' ' + type : '');
        el.textContent = msg;
        let timer1 = null, timer2 = null;
        if (action) {
            const btn = document.createElement('button');
            btn.className = 'undo';
            btn.textContent = action.label;
            btn.addEventListener('click', () => {
                clearTimeout(timer1); clearTimeout(timer2);
                el.remove();
                action.fn();
            });
            el.appendChild(btn);
        }
        toastBox.appendChild(el);
        const ttl = action ? 5000 : 1800;
        timer1 = setTimeout(() => { el.style.transition = 'opacity .25s'; el.style.opacity = '0'; }, ttl);
        timer2 = setTimeout(() => el.remove(), ttl + 400);
    }

    function dialog({ title = '', message = '', input = null, ok, cancel, danger = false } = {}) {
        if (ok == null) ok = t('ok');
        if (cancel == null) cancel = t('cancel');
        return new Promise(resolve => {
            const ov = document.createElement('div');
            ov.className = 'ov show';
            const html = (title ? `<h3 style="margin:0 0 8px;font-size:15px">${escHtml(title)}</h3>` : '')
                + `<div class="m">${escHtml(message).replace(/\n/g, '<br>')}</div>`
                + (input != null ? `<input type="text" value="${escHtml(input)}">` : '')
                + `<div class="a"><button class="btn cancel">${escHtml(cancel)}</button><button class="btn ${danger ? 'warn' : 'pri'} ok">${escHtml(ok)}</button></div>`;
            const box = document.createElement('div');
            box.className = 'dlg';
            box.innerHTML = html;
            ov.appendChild(box);
            sr.appendChild(ov);
            const inp = box.querySelector('input');
            if (inp) setTimeout(() => inp.focus(), 30);
            const close = v => { ov.remove(); resolve(v); };
            box.querySelector('.cancel').addEventListener('click', () => close(null));
            box.querySelector('.ok').addEventListener('click', () => close(input != null ? (inp.value || '') : true));
        });
    }

    /* ---------- Cookie 双核引擎 ---------- */
    const ckMgr = {
        async get() {
            if (HAS_CS) {
                try {
                    const list = await window.cookieStore.getAll();
                    return list.map(c => ({
                        key: c.name, value: c.value || '',
                        // domain 保留原值（host-only cookie 的 c.domain 在 Chromium 里等于 location.hostname；
                        // Firefox 实现可能为 null）。我们记一个 _hostOnly 标志，便于 set/del 时判断
                        domain: c.domain || location.hostname,
                        _hostOnly: !c.domain,
                        path: c.path || '/',
                        secure: !!c.secure,
                        httpOnly: !!c.httpOnly,
                        sameSite: c.sameSite || '',
                        expires: c.expires || null
                    }));
                } catch {}
            }
            if (!document.cookie) return [];
            return document.cookie.split(';').map(s => {
                const i = s.indexOf('=');
                if (i < 0) return null;
                return { key: s.slice(0, i).trim(), value: s.slice(i + 1).trim(), domain: location.hostname, path: '/', _legacy: true, _hostOnly: true };
            }).filter(Boolean);
        },
        async set(key, value, opt = {}) {
            const days = typeof opt.days === 'number' && !isNaN(opt.days) ? opt.days : 365;
            const path = opt.path || '/';
            // 如果 opt.hostOnly 显式为 true，则不发送 domain；否则按 opt.domain 处理
            const wantHostOnly = !!opt.hostOnly;
            const domain = (!wantHostOnly && opt.domain && opt.domain !== 'N/A') ? opt.domain : '';
            try {
                if (HAS_CS) {
                    const p = {
                        name: key,
                        value: value || '',
                        path,
                        expires: Date.now() + days * 86400000
                    };
                    if (domain) p.domain = domain;
                    if (opt.sameSite) p.sameSite = opt.sameSite;
                    if (opt.secure) p.secure = true;
                    await window.cookieStore.set(p);
                    return true;
                }
                let c = `${encodeURIComponent(key)}=${encodeURIComponent(value || '')}`;
                if (days > 0) c += `; expires=${new Date(Date.now() + days * 86400000).toUTCString()}`;
                c += `; path=${path}`;
                if (domain) c += `; domain=${domain}`;
                if (opt.secure) c += '; secure';
                if (opt.sameSite) c += `; samesite=${opt.sameSite}`;
                document.cookie = c;
                return true;
            } catch (e) {
                if (e && /domain/i.test(e.message || '')) toast(t('tDomainMismatch', location.hostname), 'err');
                else toast(t('tSetFail', e.message || e), 'err');
                return false;
            }
        },
        async del(c) {
            // 精确删除：用 cookieStore 的话只调一次 delete
            // host-only cookie 不传 domain 字段；Domain-attr cookie 传 c.domain
            if (HAS_CS && !c._legacy) {
                try {
                    const p = { name: c.key };
                    if (!c._hostOnly && c.domain && c.domain !== 'N/A') p.domain = c.domain;
                    if (c.path) p.path = c.path;
                    await window.cookieStore.delete(p);
                    return true;
                } catch (e) {
                    // cookieStore 失败再走 document.cookie 兜底
                }
            }
            // document.cookie fallback：只用原 cookie 的 path/domain
            try {
                const exp = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
                const path = c.path || '/';
                let s = `${encodeURIComponent(c.key)}=; ${exp}; path=${path}`;
                if (!c._hostOnly && c.domain && c.domain !== 'N/A') s += `; domain=${c.domain}`;
                document.cookie = s;
                return true;
            } catch { return false; }
        }
    };

    async function copy(text) {
        try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; } } catch {}
        try {
            const ta = document.createElement('textarea');
            ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px;top:0';
            document.body.appendChild(ta); ta.focus(); ta.select();
            const ok = document.execCommand('copy'); ta.remove();
            return ok;
        } catch { return false; }
    }

    /* ---------- Popup menu ---------- */
    function popMenu(anchor, items) {
        const old = sr.querySelector('.popm');
        if (old) {
            const same = old.__a === anchor;
            old.__close && old.__close();
            if (same) return null;
        }
        const m = document.createElement('div');
        m.className = 'popm'; m.__a = anchor;
        for (const it of items) {
            const el = document.createElement('div');
            el.className = it.divider ? 'it dv' : 'it' + (it.active ? ' active' : '');
            if (!it.divider) {
                el.textContent = (it.active ? '✓ ' : '') + it.label;
                el.addEventListener('click', () => { m.__close(); it.fn?.(); });
            }
            m.appendChild(el);
        }
        sr.appendChild(m);
        const r = anchor.getBoundingClientRect();
        m.style.left = Math.max(8, Math.min(window.innerWidth - 180, r.right - 160)) + 'px';
        const mh = m.offsetHeight;
        m.style.top = (r.bottom + mh + 8 > window.innerHeight ? Math.max(8, r.top - mh - 4) : r.bottom + 4) + 'px';
        const onDoc = e => {
            const path = e.composedPath?.() || [e.target];
            if (path.includes(m) || path.includes(anchor)) return;
            m.__close();
        };
        m.__close = () => { document.removeEventListener('click', onDoc, true); m.remove(); };
        setTimeout(() => document.addEventListener('click', onDoc, true), 0);
        return m;
    }

    /* ---------- 复制为多种格式 ---------- */
    const FMT = {
        header: cs => cs.map(c => `${c.key}=${c.value}`).join('; '),
        curl: cs => `--cookie '${FMT.header(cs).replace(/'/g, "'\\''")}'`,
        json: cs => JSON.stringify(cs.map(c => ({ name: c.key, value: c.value, domain: c.domain || location.hostname, path: c.path || '/', secure: !!c.secure, sameSite: c.sameSite || '' })), null, 2),
        kv: cs => cs.map(c => `${c.key}=${c.value}`).join('\n')
    };

    async function copyAs(cookies, fmt) {
        if (!cookies?.length) return toast(t('tNotSelected'), 'err');
        const ok = await copy(FMT[fmt](cookies));
        toast(ok ? t('tCopiedN', cookies.length) : t('tCopyFail'), ok ? 'ok' : 'err');
    }

    function showCopyAsMenu(anchor, cookies) {
        popMenu(anchor, [['cfHeader','header'],['cfCurl','curl'],['cfJson','json'],['cfKv','kv']]
            .map(([k, f]) => ({ label: t(k), fn: () => copyAs(cookies, f) })));
    }

    /* ---------- 导出 / 导入 JSON ---------- */
    async function exportJson(cookies) {
        if (!cookies?.length) return toast(t('tNoCookie'), 'err');
        const ok = await copy(FMT.json(cookies));
        toast(ok ? t('tCopiedN', cookies.length) : t('tCopyFail'), ok ? 'ok' : 'err');
    }

    async function restoreCookies(snapshot) {
        if (!snapshot?.length) return;
        await Promise.all(snapshot.map(c => {
            const days = c.expires ? Math.max(1, Math.round((c.expires - Date.now()) / 86400000)) : 365;
            return ckMgr.set(c.key, c.value, {
                domain: c.domain, path: c.path, days,
                hostOnly: !!c._hostOnly,
                secure: !!c.secure,
                sameSite: c.sameSite || ''
            });
        }));
        toast(t('tRestoredN', snapshot.length), 'ok');
        render();
    }

    /* ---------- 回收站（持久化） ---------- */
    const TRASH_KEY = 'cm_trash_v1';
    const TRASH_TTL = 30 * 86400000;          // 30 天后自动清掉
    const TRASH_MAX = 200;                    // 单个 host 最多 200 条
    function trashHostKey() {
        // 按 host 分仓，避免不同站点串扰
        return location.hostname || 'global';
    }
    function trashLoadAll() {
        const all = gmGet(TRASH_KEY, {}) || {};
        return typeof all === 'object' && all ? all : {};
    }
    function trashSaveAll(all) { gmSet(TRASH_KEY, all); }
    function trashList() {
        const all = trashLoadAll();
        const items = all[trashHostKey()] || [];
        // 顺手清掉过期的
        const now = Date.now();
        const fresh = items.filter(it => now - (it.deletedAt || 0) < TRASH_TTL);
        if (fresh.length !== items.length) {
            all[trashHostKey()] = fresh;
            trashSaveAll(all);
        }
        return fresh;
    }
    function trashAdd(cookies) {
        if (!cookies?.length) return;
        const all = trashLoadAll();
        const hk = trashHostKey();
        let bucket = all[hk] || [];
        const now = Date.now();
        for (const c of cookies) {
            bucket.unshift({
                id: 'tr_' + now.toString(36) + '_' + Math.random().toString(36).slice(2, 8),
                deletedAt: now,
                cookie: {
                    key: c.key, value: c.value,
                    domain: c.domain, path: c.path,
                    secure: !!c.secure, httpOnly: !!c.httpOnly,
                    sameSite: c.sameSite || '', expires: c.expires || null,
                    _hostOnly: !!c._hostOnly, _legacy: !!c._legacy
                }
            });
        }
        // 截断
        if (bucket.length > TRASH_MAX) bucket = bucket.slice(0, TRASH_MAX);
        all[hk] = bucket;
        trashSaveAll(all);
    }
    async function trashRestoreOne(id) {
        const all = trashLoadAll();
        const hk = trashHostKey();
        const bucket = all[hk] || [];
        const idx = bucket.findIndex(it => it.id === id);
        if (idx < 0) return false;
        const item = bucket[idx];
        await restoreCookies([item.cookie]);
        bucket.splice(idx, 1);
        all[hk] = bucket;
        trashSaveAll(all);
        return true;
    }
    async function trashRestoreMany(ids) {
        if (!ids?.length) return 0;
        const all = trashLoadAll();
        const hk = trashHostKey();
        const bucket = all[hk] || [];
        const idSet = new Set(ids);
        const toRestore = bucket.filter(it => idSet.has(it.id)).map(it => it.cookie);
        if (!toRestore.length) return 0;
        // 直接调 ckMgr.set，不通过 restoreCookies（会触发 toast + render，循环性能差）
        await Promise.all(toRestore.map(c => {
            const days = c.expires ? Math.max(1, Math.round((c.expires - Date.now()) / 86400000)) : 365;
            return ckMgr.set(c.key, c.value, {
                domain: c.domain, path: c.path, days,
                hostOnly: !!c._hostOnly, secure: !!c.secure, sameSite: c.sameSite || ''
            });
        }));
        all[hk] = bucket.filter(it => !idSet.has(it.id));
        trashSaveAll(all);
        return toRestore.length;
    }
    function trashRemoveOne(id) {
        const all = trashLoadAll();
        const hk = trashHostKey();
        all[hk] = (all[hk] || []).filter(it => it.id !== id);
        trashSaveAll(all);
    }
    function trashRemoveMany(ids) {
        if (!ids?.length) return 0;
        const all = trashLoadAll();
        const hk = trashHostKey();
        const bucket = all[hk] || [];
        const idSet = new Set(ids);
        all[hk] = bucket.filter(it => !idSet.has(it.id));
        trashSaveAll(all);
        return bucket.length - all[hk].length;
    }
    function trashClearHost() {
        const all = trashLoadAll();
        delete all[trashHostKey()];
        trashSaveAll(all);
    }

    function parseImport(text) {
        text = (text || '').trim();
        if (!text) return [];
        if (text[0] === '[') {
            try {
                const arr = JSON.parse(text);
                if (Array.isArray(arr)) return arr.map(o => ({
                    key: o.name || o.key, value: o.value == null ? '' : String(o.value),
                    domain: o.domain || '', path: o.path || '/'
                })).filter(x => x.key);
            } catch {}
            throw new Error('json');
        }
        const out = [];
        for (const line of text.split(/\r?\n/)) {
            const segs = (line.indexOf(';') >= 0 && line.split('=').length > 2) ? line.split(';') : [line];
            for (const seg of segs) {
                const tt = seg.trim(); if (!tt) continue;
                const i = tt.indexOf('=');
                if (i < 1) continue;
                out.push({ key: tt.slice(0, i).trim(), value: tt.slice(i + 1).trim(), domain: '', path: '/' });
            }
        }
        return out;
    }

    async function showImport() {
        const { p, close } = makeOv();
        p.innerHTML = `
            <div class="head"><h3>${escHtml(t('impTitle'))}</h3><span class="x">×</span></div>
            <div class="body">
                <div style="font-size:12px;color:#666;margin-bottom:8px;white-space:pre-line">${escHtml(t('impHint'))}</div>
                <textarea id="imp-text" style="width:100%;min-height:180px;padding:8px 10px;border:1px solid #d4d8de;border-radius:6px;font-size:13px;font-family:ui-monospace,Menlo,Consolas,monospace;resize:vertical"></textarea>
            </div>
            <div class="foot">
                <button class="btn cancel">${escHtml(t('cancel'))}</button>
                <button class="btn pri save" style="margin-left:auto">${escHtml(t('batchSave'))}</button>
            </div>`;
        p.querySelector('.x').addEventListener('click', close);
        p.querySelector('.cancel').addEventListener('click', close);
        p.querySelector('.save').addEventListener('click', async () => {
            let items;
            try { items = parseImport(p.querySelector('#imp-text').value); }
            catch { return toast(t('tInvalidJson'), 'err'); }
            if (!items.length) return toast(t('tNeedRow'), 'err');
            const results = await Promise.all(items.map(it => ckMgr.set(it.key, it.value, { domain: it.domain, path: it.path })));
            const ok = results.filter(Boolean).length;
            toast(t('tImportedN', ok), ok ? 'ok' : 'err');
            if (ok > 0) { close(); render(); }
        });
    }

    /* ---------- 回收站面板 ---------- */
    function showTrash() {
        const { p, ov, close } = makeOv();
        // 局部状态：与主面板独立，不互相干扰
        const trashState = { sel: false, pool: new Set() };
        function rebuild() {
            const items = trashList();
            // 清掉无效的选中项（被恢复或永久删除的 id）
            const validIds = new Set(items.map(it => it.id));
            for (const id of [...trashState.pool]) if (!validIds.has(id)) trashState.pool.delete(id);
            if (!items.length && trashState.sel) trashState.sel = false;

            p.innerHTML = `
                <div class="head"><h3></h3><span class="x">×</span></div>
                <div class="body"><div id="trash-list"></div></div>
                <div class="foot"></div>`;
            p.querySelector('.head h3').textContent = items.length ? t('trashCount', items.length) : t('trash');
            p.querySelector('.x').addEventListener('click', close);

            const list = p.querySelector('#trash-list');
            const wrap = el('div', trashState.sel ? 'sel' : '');
            list.appendChild(wrap);
            if (!items.length) {
                wrap.appendChild(el('div', 'empty', t('trashEmpty')));
            } else {
                for (const it of items) wrap.appendChild(renderTrashItem(it, rebuild, trashState));
            }

            renderTrashFoot(p, items, trashState, rebuild, close);
        }
        rebuild();
    }

    function renderTrashFoot(p, items, ts, rebuild, close) {
        const foot = p.querySelector('.foot');
        foot.innerHTML = '';
        if (!items.length) {
            foot.appendChild(mkBtn(t('cancel'), '', close));
            return;
        }
        // 多选切换
        foot.appendChild(mkBtn(ts.sel ? t('selExit') : t('sel'), '', () => {
            ts.sel = !ts.sel;
            if (!ts.sel) ts.pool.clear();
            rebuild();
        }));
        if (ts.sel) {
            const ids = items.map(it => it.id);
            const inPool = ids.filter(id => ts.pool.has(id)).length;
            const allSelected = inPool === ids.length;
            const someSelected = inPool > 0 && !allSelected;
            const selAllLabel = allSelected ? t('selNone') : (someSelected ? t('selAllPlus', ids.length - inPool) : t('selAll'));
            const selAllBtn = mkBtn(selAllLabel, '', () => {
                if (allSelected) ts.pool.clear();
                else for (const id of ids) ts.pool.add(id);
                rebuild();
            });
            foot.appendChild(selAllBtn);

            const n = ts.pool.size;
            foot.appendChild(mkBtn(t('trashRestoreN', n), 'pri', async () => {
                if (!n) return toast(t('tNotSelected'), 'err');
                const restored = await trashRestoreMany([...ts.pool]);
                ts.pool.clear();
                toast(t('trashRestoredN', restored), 'ok');
                rebuild();
                render();
            }));
            foot.appendChild(mkBtn(t('trashPurgeN', n), 'warn', async () => {
                if (!n) return toast(t('tNotSelected'), 'err');
                const yes = await dialog({ message: t('trashConfirmPurgeN', n), ok: t('trashPurge'), danger: true });
                if (!yes) return;
                const removed = trashRemoveMany([...ts.pool]);
                ts.pool.clear();
                toast(t('trashPurgedN', removed), 'ok');
                rebuild();
            }));
        } else {
            foot.appendChild(mkBtn(t('cancel'), '', close));
            foot.appendChild(mkBtn(t('trashClear'), 'warn', async () => {
                const yes = await dialog({ message: t('trashConfirmClear'), ok: t('trashPurge'), danger: true });
                if (!yes) return;
                trashClearHost();
                toast(t('trashCleared'), 'ok');
                rebuild();
            }));
        }
    }

    function renderTrashItem(it, refresh, ts) {
        const c = it.cookie;
        const w = el('div', 'ck');
        const head = el('div', 'ck-h');

        // 复选框（多选模式下显示）
        const cb = el('span', 'cb');
        if (ts.pool.has(it.id)) { cb.classList.add('on'); cb.textContent = '✓'; }
        cb.addEventListener('click', e => {
            e.stopPropagation();
            if (cb.classList.toggle('on')) { cb.textContent = '✓'; ts.pool.add(it.id); }
            else { cb.textContent = ''; ts.pool.delete(it.id); }
            // 仅刷新 footer，避免重新渲染整个 list 导致 checkbox 抖动
            const foot = w.closest('.panel')?.querySelector('.foot');
            if (foot) {
                const items = trashList();
                renderTrashFoot(w.closest('.panel'), items, ts, refresh, () => w.closest('.ov').remove());
            }
        });
        head.appendChild(cb);

        head.append(el('span', 'ck-k', safeDecode(c.key)));
        const tsEl = el('span', 'ck-size', t('trashTime', it.deletedAt));
        head.appendChild(tsEl);
        if (c.secure) head.appendChild(el('span', 'ck-flag', t('secure')));
        if (c.httpOnly) head.appendChild(el('span', 'ck-flag', t('http')));
        if (c.sameSite) head.appendChild(el('span', 'ck-flag', `${t('sameSite')}=${c.sameSite}`));
        w.append(head, el('div', 'ck-v', safeDecode(c.value)));
        const meta = el('div', 'ck-p');
        meta.textContent = `${c.domain || location.hostname}  |  ${c.path || '/'}`;
        w.appendChild(meta);
        const a = el('div', 'ck-a');
        a.append(
            mkBtn(t('trashRestore'), 'pri sm', async () => {
                await trashRestoreOne(it.id);
                toast(t('trashRestored'), 'ok');
                refresh();
                render();
            }),
            mkBtn(t('trashPurge'), 'warn sm', () => {
                trashRemoveOne(it.id);
                toast(t('trashPurged'), 'ok');
                refresh();
            })
        );
        w.appendChild(a);
        return w;
    }

    /* ---------- 主面板 ---------- */
    let state = { all: [], filtered: [], sel: false, pool: new Map() };

    function buildPanel() {
        mainOv = document.createElement('div');
        mainOv.className = 'ov';
        const p = document.createElement('div');
        p.className = 'panel';
        p.innerHTML = `
            <div class="head">
                <h3 class="title"></h3>
                <span style="display:flex;align-items:center;gap:10px;">
                    <span class="lang" style="cursor:pointer;font-size:12px;font-weight:600;padding:3px 8px;border:1px solid rgba(255,255,255,.55);border-radius:10px;line-height:1;letter-spacing:.5px"></span>
                    <span class="x">×</span>
                </span>
            </div>
            <div class="body"></div>
            <div class="foot"></div>`;
        mainOv.appendChild(p);
        sr.appendChild(mainOv);
        p.querySelector('.x').addEventListener('click', closePanel);
        mainOv.addEventListener('click', e => { if (e.target === mainOv) closePanel(); });
        p.querySelector('.lang').addEventListener('click', () => {
            setLang(lang === 'zh' ? 'en' : 'zh');
            applyTitleAndLangBtn();
            render();
        });
        applyTitleAndLangBtn();
    }

    function applyTitleAndLangBtn() {
        if (!mainOv) return;
        const titleEl = mainOv.querySelector('.title');
        const langEl = mainOv.querySelector('.lang');
        if (titleEl) titleEl.textContent = t('title') + (HAS_CS ? '' : t('titleCompat'));
        if (langEl) langEl.textContent = lang === 'zh' ? 'EN' : '中';
    }

    function openPanel() { mainOv.classList.add('show'); render(); }
    function closePanel() { mainOv.classList.remove('show'); }

    function mkBtn(text, cls, fn) {
        const b = document.createElement('button');
        b.className = 'btn ' + (cls || '');
        b.textContent = text;
        b.addEventListener('click', fn);
        return b;
    }

    async function render() {
        const body = mainOv.querySelector('.body');
        const foot = mainOv.querySelector('.foot');
        body.innerHTML = `
            <div class="grid">
                <button class="btn pri" data-a="badd"></button>
                <button class="btn pri" data-a="sadd"></button>
                <button class="btn" data-a="copyall"></button>
                <button class="btn" data-a="more"></button>
                <button class="btn warn" data-a="delall" style="grid-column:1 / span 2"></button>
            </div>
            <div class="search">
                <input type="search" id="qk">
                <input type="search" id="qv">
            </div>
            <div class="toolbar">
                <button class="btn chip sm" data-a="sort"></button>
                <button class="btn chip sm" data-a="group"></button>
                <button class="btn chip sm" data-a="fsec"></button>
                <button class="btn chip sm" data-a="fhttp"></button>
                <span class="label" data-a="stats" style="margin-left:auto"></span>
            </div>
            <div id="list"></div>`;
        body.querySelector('[data-a=badd]').textContent = t('badd');
        body.querySelector('[data-a=sadd]').textContent = t('sadd');
        body.querySelector('[data-a=copyall]').textContent = t('copyall');
        body.querySelector('[data-a=more]').textContent = t('menu') + ' ▾';
        body.querySelector('[data-a=delall]').textContent = t('delall');
        body.querySelector('#qk').placeholder = t('phKey');
        body.querySelector('#qv').placeholder = t('phVal');
        foot.innerHTML = '';

        state.all = await ckMgr.get();
        applyFiltersAndSort();
        state.sel = false;
        state.pool.clear();
        renderList();
        renderToolbar();

        body.querySelector('[data-a=badd]').addEventListener('click', showBatch);
        body.querySelector('[data-a=sadd]').addEventListener('click', () => showEdit({ mode: 'add' }));
        body.querySelector('[data-a=copyall]').addEventListener('click', e => {
            if (!state.all.length) return toast(t('tNoCookie'), 'err');
            showCopyAsMenu(e.currentTarget, state.all);
        });
        body.querySelector('[data-a=more]').addEventListener('click', e => {
            const trashCount = trashList().length;
            popMenu(e.currentTarget, [
                { label: t('exp'), fn: () => exportJson(state.all) },
                { label: t('impJson'), fn: () => showImport() },
                { divider: true },
                { label: trashCount > 0 ? t('trashCount', trashCount) : t('trash'), fn: () => showTrash() },
                { divider: true },
                { label: t('theme') + ': ' + t('themeAuto'), active: prefs.theme === 'auto', fn: () => { setPref('theme','auto'); applyTheme(); } },
                { label: t('theme') + ': ' + t('themeLight'), active: prefs.theme === 'light', fn: () => { setPref('theme','light'); applyTheme(); } },
                { label: t('theme') + ': ' + t('themeDark'), active: prefs.theme === 'dark', fn: () => { setPref('theme','dark'); applyTheme(); } },
            ]);
        });
        body.querySelector('[data-a=delall]').addEventListener('click', async () => {
            if (!state.all.length) return toast(t('tNoCookie'), 'err');
            const yes = await dialog({ title: t('confirmDelAllTitle'), message: t('confirmDelAll', state.all.length), ok: t('delConfirm'), danger: true });
            if (!yes) return;
            const snapshot = state.all.slice();
            trashAdd(snapshot);
            await Promise.all(snapshot.map(c => ckMgr.del(c)));
            await render();
            toast(t('tDeleted'), 'ok', { label: t('tUndo'), fn: () => restoreCookies(snapshot) });
        });
        body.querySelector('[data-a=sort]').addEventListener('click', e => {
            const cur = prefs.sort, dir = prefs.sortDir;
            popMenu(e.currentTarget, [
                { label: t('sortKey'),     active: cur === 'key',     fn: () => { setPref('sort','key');     applyFiltersAndSort(); renderList(); renderToolbar(); } },
                { label: t('sortSize'),    active: cur === 'size',    fn: () => { setPref('sort','size');    applyFiltersAndSort(); renderList(); renderToolbar(); } },
                { label: t('sortExpires'), active: cur === 'expires', fn: () => { setPref('sort','expires'); applyFiltersAndSort(); renderList(); renderToolbar(); } },
                { divider: true },
                { label: t('sortAsc'),  active: dir === 'asc',  fn: () => { setPref('sortDir','asc');  applyFiltersAndSort(); renderList(); renderToolbar(); } },
                { label: t('sortDesc'), active: dir === 'desc', fn: () => { setPref('sortDir','desc'); applyFiltersAndSort(); renderList(); renderToolbar(); } },
            ]);
        });
        body.querySelector('[data-a=group]').addEventListener('click', e => {
            popMenu(e.currentTarget, [
                { label: t('groupNone'),   active: prefs.group === 'none',   fn: () => { setPref('group','none');   renderList(); renderToolbar(); } },
                { label: t('groupDomain'), active: prefs.group === 'domain', fn: () => { setPref('group','domain'); renderList(); renderToolbar(); } },
                { label: t('groupRoot'),   active: prefs.group === 'root',   fn: () => { setPref('group','root');   renderList(); renderToolbar(); } },
            ]);
        });
        body.querySelector('[data-a=fsec]').addEventListener('click', () => {
            setPref('secureOnly', !prefs.secureOnly);
            applyFiltersAndSort(); renderList(); renderToolbar();
        });
        body.querySelector('[data-a=fhttp]').addEventListener('click', () => {
            setPref('httpOnly', !prefs.httpOnly);
            applyFiltersAndSort(); renderList(); renderToolbar();
        });
        const qk = body.querySelector('#qk'), qv = body.querySelector('#qv');
        const onSearch = () => { applyFiltersAndSort(); renderList(); renderToolbar(); };
        state.qk = qk; state.qv = qv;
        qk.addEventListener('input', onSearch);
        qv.addEventListener('input', onSearch);
    }

    function applyFiltersAndSort() {
        const qk = (state.qk?.value || '').trim().toLowerCase();
        const qv = (state.qv?.value || '').trim().toLowerCase();
        let arr = state.all.filter(c =>
            safeDecode(c.key).toLowerCase().includes(qk) &&
            safeDecode(c.value).toLowerCase().includes(qv)
        );
        if (prefs.secureOnly) arr = arr.filter(c => c.secure);
        if (prefs.httpOnly) arr = arr.filter(c => c.httpOnly);
        const dir = prefs.sortDir === 'desc' ? -1 : 1;
        const key = prefs.sort;
        arr.sort((a, b) => {
            let av, bv;
            if (key === 'size') { av = cookieSize(a); bv = cookieSize(b); }
            else if (key === 'expires') { av = a.expires || Infinity; bv = b.expires || Infinity; }
            else { av = safeDecode(a.key).toLowerCase(); bv = safeDecode(b.key).toLowerCase(); }
            return av < bv ? -dir : av > bv ? dir : 0;
        });
        state.filtered = arr;
    }

    function renderToolbar() {
        const body = mainOv.querySelector('.body');
        if (!body) return;
        const sortBtn = body.querySelector('[data-a=sort]');
        if (sortBtn) {
            const sortLabel = { key: t('sortKey'), size: t('sortSize'), expires: t('sortExpires') }[prefs.sort] || t('sortKey');
            const arrow = prefs.sortDir === 'desc' ? '↓' : '↑';
            sortBtn.textContent = `${t('sort')}: ${sortLabel} ${arrow}`;
        }
        const groupBtn = body.querySelector('[data-a=group]');
        if (groupBtn) {
            const groupLabel = { none: t('groupNone'), domain: t('groupDomain'), root: t('groupRoot') }[prefs.group] || t('groupNone');
            groupBtn.textContent = `${t('group')}: ${groupLabel}`;
        }
        const fsec = body.querySelector('[data-a=fsec]');
        const fhttp = body.querySelector('[data-a=fhttp]');
        if (fsec) { fsec.textContent = t('filterSecure'); fsec.classList.toggle('on', !!prefs.secureOnly); }
        if (fhttp) { fhttp.textContent = t('filterHttp'); fhttp.classList.toggle('on', !!prefs.httpOnly); }
        const stats = body.querySelector('[data-a=stats]');
        if (stats) stats.textContent = t('statsN', state.filtered.length, state.all.length);
    }

    function ckId(c) { return `${c.key}||${c.domain}||${c.path}`; }

    function rootDomain(d) {
        if (!d) return location.hostname;
        const h = d.replace(/^\./, '');
        // crude: take last two labels (works for most public domains; doesn't handle co.uk etc but good enough)
        const parts = h.split('.');
        if (parts.length <= 2) return h;
        return parts.slice(-2).join('.');
    }

    function groupCookies(arr) {
        if (prefs.group === 'none') return [{ key: '', items: arr }];
        const map = new Map();
        for (const c of arr) {
            const k = prefs.group === 'root'
                ? rootDomain(c.domain || location.hostname)
                : (c.domain || location.hostname).replace(/^\./, '');
            if (!map.has(k)) map.set(k, []);
            map.get(k).push(c);
        }
        return [...map.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([key, items]) => ({ key, items }));
    }

    function renderList() {
        const list = mainOv.querySelector('#list');
        list.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = state.sel ? 'sel' : '';
        list.appendChild(wrap);
        if (!state.filtered.length) {
            const e = document.createElement('div');
            e.className = 'empty';
            e.textContent = t('empty');
            wrap.appendChild(e);
        } else if (prefs.group === 'none') {
            for (const c of state.filtered) wrap.appendChild(renderItem(c));
        } else {
            const groups = groupCookies(state.filtered);
            for (const g of groups) {
                const groupEl = document.createElement('div');
                const collapsed = !!prefs.collapsed[g.key];
                groupEl.className = 'group' + (collapsed ? ' collapsed' : '');
                const header = document.createElement('div');
                header.className = 'group-h';
                const arrow = document.createElement('span'); arrow.className = 'arrow'; arrow.textContent = '▼';
                const name = document.createElement('span'); name.textContent = g.key;
                const count = document.createElement('span'); count.className = 'count'; count.textContent = String(g.items.length);
                header.append(arrow, name, count);
                header.addEventListener('click', () => {
                    prefs.collapsed[g.key] = !collapsed;
                    savePrefs();
                    renderList();
                });
                groupEl.appendChild(header);
                const body = document.createElement('div');
                body.className = 'group-body';
                for (const c of g.items) body.appendChild(renderItem(c));
                groupEl.appendChild(body);
                wrap.appendChild(groupEl);
            }
        }
        renderFoot();
    }

    function cookieSize(c) {
        // 估算 cookie 在 header 中的字节数：name=value + flags
        return new Blob([`${c.key}=${c.value}`]).size;
    }

    // 通用：创建 <tag class textContent>
    function el(tag, cls, txt) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (txt != null) e.textContent = txt;
        return e;
    }

    function renderItem(c) {
        const w = el('div', 'ck'), id = ckId(c);
        const head = el('div', 'ck-h');
        const cb = el('span', 'cb');
        if (state.pool.has(id)) { cb.classList.add('on'); cb.textContent = '✓'; }
        cb.addEventListener('click', e => {
            e.stopPropagation();
            if (cb.classList.toggle('on')) { cb.textContent = '✓'; state.pool.set(id, c); }
            else { cb.textContent = ''; state.pool.delete(id); }
            renderFoot();
        });
        head.append(cb, el('span', 'ck-k', safeDecode(c.key)));
        const sz = cookieSize(c);
        const sizeEl = el('span', 'ck-size' + (sz > 4096 ? ' warn' : ''), t('sizeBytes', sz));
        if (sz > 4096) sizeEl.title = t('sizeWarn');
        head.appendChild(sizeEl);
        if (c.secure) head.appendChild(el('span', 'ck-flag', t('secure')));
        if (c.httpOnly) head.appendChild(el('span', 'ck-flag', t('http')));
        if (c.sameSite) head.appendChild(el('span', 'ck-flag', `${t('sameSite')}=${c.sameSite}`));
        w.append(head, el('div', 'ck-v', safeDecode(c.value)));

        // 详情区
        const detail = el('div', 'ck-detail');
        const dRow = (k, v) => {
            const r = el('div', 'row-d');
            r.append(el('span', 'k-d', k), el('span', 'v-d', String(v)));
            detail.appendChild(r);
        };
        dRow('Domain', c.domain || location.hostname);
        dRow('Path', c.path || '/');
        if (c.expires) dRow('Expires', new Date(c.expires).toLocaleString());
        dRow('Secure', !!c.secure);
        if (c.httpOnly !== undefined) dRow('HttpOnly', !!c.httpOnly);
        if (c.sameSite) dRow('SameSite', c.sameSite);
        dRow('Size', t('sizeBytes', sz));
        w.appendChild(detail);

        // 操作区
        const a = el('div', 'ck-a');
        const doCopy = async (text) => { const ok = await copy(text); toast(ok ? t('tCopied') : t('tCopyFail'), ok ? 'ok' : 'err'); };
        a.append(
            mkBtn(t('modify'), 'pri sm', () => showEdit({ mode: 'modify', cookie: c })),
            mkBtn(t('copyKey'), 'sm', () => doCopy(safeDecode(c.key))),
            mkBtn(t('copyVal'), 'sm', () => doCopy(safeDecode(c.value))),
            mkBtn(t('copyAs'), 'sm', e => showCopyAsMenu(e.currentTarget, [c])),
            mkBtn(t('del'), 'warn sm', async () => {
                if (!await dialog({ message: t('confirmDelOne', safeDecode(c.key)), ok: t('delConfirm'), danger: true })) return;
                trashAdd([c]);
                await ckMgr.del(c); await render();
                toast(t('tDeleted'), 'ok', { label: t('tUndo'), fn: () => restoreCookies([c]) });
            })
        );
        w.appendChild(a);

        head.style.cursor = 'pointer';
        head.addEventListener('click', e => {
            if (cb.contains(e.target)) return;
            w.classList.toggle('open');
        });
        return w;
    }

    function renderFoot() {
        const foot = mainOv.querySelector('.foot');
        foot.innerHTML = '';
        foot.appendChild(mkBtn(state.sel ? t('selExit') : t('sel'), '', () => {
            state.sel = !state.sel;
            if (!state.sel) state.pool.clear();
            renderList();
        }));
        if (state.sel) {
            const n = state.pool.size;
            // 全选状态：基于当前 filtered 列表
            const fIds = state.filtered.map(ckId);
            const fInPool = fIds.filter(id => state.pool.has(id)).length;
            const allFiltered = fIds.length > 0 && fInPool === fIds.length;
            const someFiltered = fInPool > 0 && !allFiltered;
            const selAllLabel = allFiltered ? t('selNone') : (someFiltered ? t('selAllPlus', fIds.length - fInPool) : t('selAll'));
            const selAllBtn = mkBtn(selAllLabel, '', () => {
                if (!fIds.length) return toast(t('tEmptyList'), 'err');
                if (allFiltered) {
                    for (const id of fIds) state.pool.delete(id);
                } else {
                    for (const c of state.filtered) state.pool.set(ckId(c), c);
                }
                renderList();
            });
            if (!fIds.length) selAllBtn.disabled = true;
            foot.appendChild(selAllBtn);

            foot.appendChild(mkBtn(t('copyN', n), 'pri', e => {
                if (!n) return toast(t('tNotSelected'), 'err');
                showCopyAsMenu(e.currentTarget, [...state.pool.values()]);
            }));
            foot.appendChild(mkBtn(t('expSel'), '', () => {
                if (!n) return toast(t('tNotSelected'), 'err');
                exportJson([...state.pool.values()]);
            }));
            foot.appendChild(mkBtn(t('delN', n), 'warn', async () => {
                if (!n) return toast(t('tNotSelected'), 'err');
                const yes = await dialog({ message: t('confirmDelN', n), ok: t('delConfirm'), danger: true });
                if (!yes) return;
                const snapshot = [...state.pool.values()];
                trashAdd(snapshot);
                await Promise.all(snapshot.map(c => ckMgr.del(c)));
                state.pool.clear();
                await render();
                toast(t('tDeleted'), 'ok', { label: t('tUndo'), fn: () => restoreCookies(snapshot) });
            }));
        }
    }

    /* ---------- 编辑 / 批量添加 弹窗 ---------- */
    function makeOv() {
        const ov = document.createElement('div'); ov.className = 'ov show';
        const p = document.createElement('div'); p.className = 'panel';
        ov.appendChild(p); sr.appendChild(ov);
        return { ov, p, close: () => ov.remove() };
    }

    function showEdit({ mode, cookie }) {
        const { p, close } = makeOv();
        const isAdd = mode === 'add', c = cookie || {};
        p.innerHTML = `
            <div class="head"><h3></h3><span class="x">×</span></div>
            <div class="body">
                <div class="row"><label></label><input type="text" id="ek"></div>
                <div class="row"><label></label><textarea id="ev"></textarea></div>
                <div class="row"><label></label><input type="text" id="ed"></div>
                <div class="row"><label></label><input type="text" id="ep"></div>
                <div class="row"><label></label><input type="number" id="eday" value="365"></div>
            </div>
            <div class="foot">
                <button class="btn cancel"></button>
                <button class="btn pri save" style="margin-left:auto"></button>
            </div>`;
        const $ = s => p.querySelector(s);
        p.querySelector('.head h3').textContent = isAdd ? t('addNew') : t('edit');
        const labels = p.querySelectorAll('.row label');
        labels[0].textContent = t('lblKey');
        labels[1].textContent = t('lblValue');
        labels[2].textContent = t('lblDomain');
        labels[3].textContent = t('lblPath');
        labels[4].textContent = t('lblDays');
        $('#ed').placeholder = t('phEmptyDomain');
        p.querySelector('.cancel').textContent = t('cancel');
        p.querySelector('.save').textContent = t('save');
        $('#ek').value = isAdd ? '' : safeDecode(c.key);
        $('#ev').value = isAdd ? '' : safeDecode(c.value);
        $('#ed').value = (!isAdd && c.domain && c.domain !== 'N/A') ? c.domain : (HAS_CS ? location.hostname : '');
        $('#ep').value = (!isAdd && c.path) ? c.path : '/';
        p.querySelector('.x').addEventListener('click', close);
        p.querySelector('.cancel').addEventListener('click', close);
        p.querySelector('.save').addEventListener('click', async () => {
            const key = $('#ek').value.trim();
            if (!key) return toast(t('tNeedKey'), 'err');
            const value = $('#ev').value;
            const inputDomain = $('#ed').value.trim();
            const path = $('#ep').value.trim() || '/';
            const days = parseInt($('#eday').value, 10);

            // 关键：如果原 cookie 是 host-only，且用户没改 domain（或改成与 hostname 相同），保持 host-only
            // 这样 cookieStore.set 不会创建一个 Domain= 属性的副本，导致同名两条
            let hostOnly = false;
            let domainToSet = inputDomain;
            if (!isAdd && c._hostOnly) {
                // 原本就是 host-only；如果用户没动 domain 输入框（仍等于 location.hostname），保持 host-only
                if (inputDomain === '' || inputDomain === location.hostname) {
                    hostOnly = true;
                    domainToSet = '';
                }
            } else if (isAdd) {
                // 新增时：如果用户填的就是当前 hostname，默认按 host-only 创建（更安全，不影响子域）
                if (inputDomain === '' || inputDomain === location.hostname) {
                    hostOnly = true;
                    domainToSet = '';
                }
            }

            // 修改模式：精准判断是否需要先删旧
            // - 同 (key, domain, path, hostOnly)：直接 set 覆盖（cookieStore.set 会原位更新）
            // - 改了任意一项：删旧的，写新的
            if (!isAdd) {
                const sameKey = c.key === key;
                const samePath = (c.path || '/') === path;
                const sameHostOnly = !!c._hostOnly === hostOnly;
                const sameDomain = hostOnly ? sameHostOnly : (c.domain || '') === domainToSet;
                if (!(sameKey && samePath && sameHostOnly && sameDomain)) {
                    await ckMgr.del(c);
                }
            }
            const setOpt = {
                domain: domainToSet,
                hostOnly,
                path,
                days: isNaN(days) ? 365 : days,
                secure: !isAdd ? !!c.secure : false,
                sameSite: !isAdd ? c.sameSite : ''
            };
            const ok = await ckMgr.set(key, value, setOpt);
            if (ok) { toast(isAdd ? t('tAdded') : t('tModified'), 'ok'); close(); render(); }
        });
    }

    function showBatch() {
        const { p, close } = makeOv();
        p.innerHTML = `
            <div class="head"><h3></h3><span class="x">×</span></div>
            <div class="body">
                <div class="row"><label></label><input type="text" id="bd"></div>
                <div class="row"><label></label><input type="text" id="bp" value="/"></div>
                <div class="row">
                    <label></label>
                    <textarea id="bparse"></textarea>
                </div>
                <div id="brows"></div>
                <button class="btn sm" id="brow" style="width:100%"></button>
            </div>
            <div class="foot">
                <button class="btn cancel"></button>
                <button class="btn pri save" style="margin-left:auto"></button>
            </div>`;
        const $ = s => p.querySelector(s);
        p.querySelector('.head h3').textContent = t('batch');
        const lbls = p.querySelectorAll('.row label');
        lbls[0].textContent = t('lblDomain');
        lbls[1].textContent = t('lblPath');
        lbls[2].textContent = t('lblParse');
        $('#bd').placeholder = t('phEmptyDomain');
        $('#bparse').placeholder = t('phParse');
        $('#brow').textContent = t('addRow');
        p.querySelector('.cancel').textContent = t('cancel');
        p.querySelector('.save').textContent = t('batchSave');
        $('#bd').value = HAS_CS ? location.hostname : '';
        const rows = $('#brows');
        const addRow = (k = '', v = '') => {
            const r = document.createElement('div'); r.className = 'br';
            const ki = document.createElement('input'); ki.type = 'text'; ki.placeholder = t('lblKey'); ki.className = 'k'; ki.value = k;
            const vi = document.createElement('input'); vi.type = 'text'; vi.placeholder = t('lblValue'); vi.className = 'v'; vi.value = v;
            const x = document.createElement('button'); x.className = 'rm'; x.textContent = '×';
            x.addEventListener('click', () => r.remove());
            r.appendChild(ki); r.appendChild(vi); r.appendChild(x);
            rows.appendChild(r);
        };
        addRow();
        $('#brow').addEventListener('click', () => addRow());

        // 行优先 + 启发式：仅当一行有多个 = 才按 ; 切，避免 value 内含分号被截断
        const parsePairs = text => {
            const out = [];
            for (const line of text.split(/\r?\n/)) {
                const segs = (line.indexOf(';') >= 0 && line.split('=').length > 2) ? line.split(';') : [line];
                for (const seg of segs) {
                    const tt = seg.trim(); if (!tt) continue;
                    let i = tt.indexOf('='); if (i < 0) i = tt.indexOf(':');
                    if (i < 1) continue;
                    out.push([tt.slice(0, i).trim(), tt.slice(i + 1).trim()]);
                }
            }
            return out;
        };
        $('#bparse').addEventListener('input', e => {
            const pairs = parsePairs(e.target.value);
            if (!pairs.length) return;
            rows.innerHTML = '';
            for (const [k, v] of pairs) addRow(k, v);
        });

        p.querySelector('.x').addEventListener('click', close);
        p.querySelector('.cancel').addEventListener('click', close);
        p.querySelector('.save').addEventListener('click', async () => {
            const domain = $('#bd').value.trim();
            const path = $('#bp').value.trim() || '/';
            const items = [...rows.querySelectorAll('.br')]
                .map(r => ({ key: r.querySelector('.k').value.trim(), value: r.querySelector('.v').value }))
                .filter(x => x.key);
            if (!items.length) return toast(t('tNeedRow'), 'err');
            const results = await Promise.all(items.map(it => ckMgr.set(it.key, it.value, { domain, path })));
            const ok = results.filter(Boolean).length;
            toast(t('tBatchOk', ok, items.length), ok ? 'ok' : 'err');
            if (ok > 0) { close(); render(); }
        });
    }

    /* ---------- 浮标 + 拖拽 ---------- */
    function buildFab() {
        fab = document.createElement('div');
        fab.id = 'fab'; fab.title = t('title'); fab.textContent = 'C';
        sr.appendChild(fab);
        const pos = gmGet(POS_KEY, { bottom: '90px', right: '14px' });
        Object.assign(fab.style, { top: pos.top || 'auto', left: pos.left || 'auto', bottom: pos.bottom || 'auto', right: pos.right || 'auto' });

        let dragging = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
        const TH = 5;
        const down = e => {
            const t = e.touches ? e.touches[0] : e;
            dragging = true; moved = false; sx = t.clientX; sy = t.clientY;
            const r = fab.getBoundingClientRect(); ox = r.left; oy = r.top;
        };
        const move = e => {
            if (!dragging) return;
            const t = e.touches ? e.touches[0] : e;
            const dx = t.clientX - sx, dy = t.clientY - sy;
            if (!moved && Math.hypot(dx, dy) < TH) return;
            moved = true; e.preventDefault();
            const w = fab.offsetWidth, h = fab.offsetHeight;
            const nx = Math.max(0, Math.min(window.innerWidth - w, ox + dx));
            const ny = Math.max(0, Math.min(window.innerHeight - h, oy + dy));
            fab.style.left = nx + 'px'; fab.style.top = ny + 'px';
            fab.style.right = 'auto'; fab.style.bottom = 'auto';
        };
        const up = () => {
            if (!dragging) return;
            dragging = false;
            if (moved) {
                const r = fab.getBoundingClientRect();
                gmSet(POS_KEY, { top: r.top + 'px', left: r.left + 'px', bottom: 'auto', right: 'auto' });
            }
        };
        fab.addEventListener('touchstart', down, { passive: false });
        fab.addEventListener('touchmove', move, { passive: false });
        fab.addEventListener('touchend', up);
        fab.addEventListener('touchcancel', up);
        fab.addEventListener('mousedown', down);
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
        fab.addEventListener('click', () => {
            if (moved) { moved = false; return; }
            mainOv.classList.contains('show') ? closePanel() : openPanel();
        });
    }

    /* ---------- 启动 ---------- */
    function boot() {
        ensureHost();
        startGuardian();
        try { if (typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand(t('title'), openPanel); } catch {}
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
})();
