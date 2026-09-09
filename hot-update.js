/* ══════════════════════════════════════════════════════════════════
 *  🔥 APK 自动更新（静默下载 · 下次启动生效）
 *
 *  这个 app 的本体就是一份 index.html 加几个资源文件，绝大多数更新根本不碰原生层，
 *  所以没必要让用户重装安装包：
 *
 *    启动 → 拉 version.json（约 1KB）→ 有新构建号就后台下载整包 zip
 *         → 交给 CapacitorUpdater 落地 → 下次切后台/重启时换成新版本
 *
 *  ⚠️ 为什么用原生插件而不是 Service Worker：
 *  第一版是用 Service Worker + Cache Storage 掉包的，在浏览器里没问题，但在 APK 里
 *  完全无效——Capacitor 在【原生层】用 WebViewAssetLoader 拦截请求、直接把安装包里的
 *  文件递给 WebView，这一层排在 Service Worker 前面，SW 根本没机会插手。表现就是
 *  「提示下载成功、重启后版本号纹丝不动」。所以换成在同一层做事的插件。
 *
 *  几条硬性约束：
 *  · 只在 APK 里跑。网页/PWA 刷新本来就是最新的，不需要也不应该走这套。
 *  · 绝不在对局中途换版本：用 next() 而不是 set()，新版本只在切后台或重启后生效，
 *    避免存档格式在一局进行中被换掉。
 *  · 启动失败自动回滚：插件要求每次启动调用 notifyAppReady()。新包把 app 写崩时这行
 *    永远执行不到，插件超时后自动退回安装包内置版本（见 markBootOk）。
 *  · 装了更新的安装包后旧热更新包自动退位：插件的 resetWhenUpdate（默认开）负责。
 *  · 原生层真的变了（加插件/改权限）时，version.json 的 minNative 会高于本壳的
 *    NATIVE_ABI，此时不做热更新，改为提示用户去下载新安装包。
 * ══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const Cap = window.Capacitor;
  const IS_NATIVE = !!(Cap && typeof Cap.isNativePlatform === 'function' && Cap.isNativePlatform());

  // ── 清理第一版留下的 Service Worker ──
  // 旧版本在 APK 里注册过 SW。它虽然拦不住导航（所以旧方案才失效），却会用自己的缓存
  // 应答 i18n.js 这类子资源；插件换包之后这些请求仍可能命中旧缓存，造成新页面配旧脚本。
  // 必须主动注销并清空缓存，且只在 APK 里做——网页版还要靠 SW 离线。
  if (IS_NATIVE) {
    try {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.getRegistrations()
          .then(rs => rs.forEach(r => r.unregister()))
          .catch(() => {});
      }
      if (window.caches) caches.keys().then(ks => ks.forEach(k => caches.delete(k))).catch(() => {});
    } catch (e) {}
  }

  if (!IS_NATIVE) return;

  // 插件由原生桥注册；这个项目没有打包器，所以走全局访问而不是 import。
  const Updater =
    (Cap.Plugins && Cap.Plugins.CapacitorUpdater) ||
    (typeof Cap.registerPlugin === 'function' ? Cap.registerPlugin('CapacitorUpdater') : null);
  if (!Updater || typeof Updater.download !== 'function') return;

  // ── 发布时由 scripts/stamp-build.mjs 写入；仓库里永远是占位值 ──
  // 本地开发时 APP_BUILD 恒为 0，任何线上构建号都大于它，所以本地永远不会误判成"已最新"。
  const APP_BUILD = 0;
  const APP_VERSION = 'dev';
  // 原生壳 ABI：只有改动 Capacitor 插件 / 权限 / 图标时才手动 +1。
  // 网页热更新改不了原生层，所以新网页要求的 ABI 高于当前壳时只能提示重装。
  const NATIVE_ABI = 2;

  const REPO = 'yzouj0031-hub/wolf';
  const ASSET_BASE = 'https://github.com/' + REPO + '/releases/download/web-latest/';
  const MANIFEST_URL = ASSET_BASE + 'version.json';
  const FALLBACK_ZIP = ASSET_BASE + 'bundle.zip';
  const APK_PAGE = 'https://github.com/' + REPO + '/releases/tag/android-latest';

  const LS_PENDING = 'wolfHotPending';   // 已下载完成、等待生效的 build，避免重复下载
  const LS_LAST = 'wolfHotLastCheck';
  const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;  // 自动检查最多 6 小时一次

  const EN = /\/en\//.test(location.pathname);
  const T = EN ? {
    staged: v => 'Update ' + v + ' downloaded — it will apply next time you open the app.',
    current: 'Already up to date.',
    checking: 'Checking for updates…',
    failed: 'Update check failed.',
    needsApk: 'A new version needs a new installer. Tap to open the download page.',
    version: 'Version',
    check: 'Check for updates',
    pending: v => 'Update ' + v + ' is ready — fully close and reopen the app to use it.'
  } : {
    staged: v => '更新包 ' + v + ' 已下载，尚未生效。',
    current: '已经是最新版本。',
    checking: '正在检查更新…',
    failed: '检查更新失败。',
    needsApk: '新版本需要重新安装安装包，点这里打开下载页。',
    version: '版本',
    check: '检查更新',
    pending: v => '曾下载更新 ' + v + '，当前仍未运行此版本。若重启后仍如此，更新可能未切换或已回滚。'
  };

  async function fetchJson(url) {
    // 滚动标签的 Release 资源会被 CDN 缓存，加时间戳 + no-store 强制拿最新的。
    const res = await fetch(url + '?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  /* 插件要求每次启动都确认「这一版能正常跑」。主脚本完整执行到底才会调到这里；
     新包把 app 写崩时这行永远到不了，插件超时后自动回滚到安装包内置版本。 */
  function markBootOk() {
    try {
      const r = Updater.notifyAppReady();
      if (r && typeof r.catch === 'function') r.catch(() => {});
    } catch (e) {}
    // 跑起来的就是新版，pending 标记可以清了
    try {
      if ((Number(localStorage.getItem(LS_PENDING)) || 0) <= APP_BUILD) localStorage.removeItem(LS_PENDING);
    } catch (e) {}
  }

  function metered() {
    const c = navigator.connection;
    return !!(c && (c.saveData || /^(slow-2g|2g)$/.test(c.effectiveType || '')));
  }

  let inFlight = null;
  let uiState = { phase: 'idle', text: '', percent: null };
  function setState(phase, text, percent = null) {
    uiState = { phase, text, percent };
    renderState();
  }
  function renderState() {
    const status = document.getElementById('wolf-hot-status');
    const progress = document.getElementById('wolf-hot-progress');
    const button = document.getElementById('wolf-hot-check');
    if (status) status.textContent = uiState.text;
    if (button) button.disabled = !!inFlight;
    if (progress) {
      progress.hidden = !['downloading', 'preparing', 'staged'].includes(uiState.phase);
      if (uiState.percent === null) progress.removeAttribute('value');
      else progress.value = uiState.percent;
    }
  }
  function check(opts) {
    if (inFlight) return inFlight;
    inFlight = performCheck(opts).then(r => {
      if (r.status === 'current') setState('current', T.current);
      else if (r.status === 'pending') setState('pending', T.pending(r.version || r.build));
      else if (r.status === 'staged') setState('staged', T.staged(r.version || r.build), 100);
      else if (r.status === 'needs-apk') setState('needs-apk', T.needsApk);
      else if (r.status === 'skipped-metered') setState('idle', EN ? 'Data saver: tap Check to download.' : '省流量模式未自动下载，可点检查更新手动下载。');
      return r;
    }).catch(e => {
      setState('failed', T.failed + ' ' + (e && e.message ? e.message : '') + (EN ? ' Tap Check to retry.' : ' 可再次点检查更新重试。'));
      throw e;
    }).finally(() => { inFlight = null; renderState(); });
    renderState();
    return inFlight;
  }
  async function performCheck(opts) {
    const manual = !!(opts && opts.manual);
    let last = 0;
    try { last = Number(localStorage.getItem(LS_LAST)) || 0; } catch (e) {}
    if (!manual && Date.now() - last < CHECK_INTERVAL_MS) return { status: 'skipped' };
    try { localStorage.setItem(LS_LAST, String(Date.now())); } catch (e) {}

    setState('checking', T.checking);
    const meta = await fetchJson(MANIFEST_URL);
    if (!meta || !Number.isInteger(meta.build)) throw new Error('version.json 格式错误');

    if (meta.build <= APP_BUILD) return { status: 'current', build: APP_BUILD };

    if ((Number(meta.minNative) || 1) > NATIVE_ABI) {
      return { status: 'needs-apk', build: meta.build, version: meta.version };
    }

    let pending = 0;
    try { pending = Number(localStorage.getItem(LS_PENDING)) || 0; } catch (e) {}
    if (pending >= meta.build) return { status: 'pending', build: pending, version: meta.version };

    // 整包几 MB：省流量模式和 2G 下不自动下载，用户手动点还是照下。
    if (!manual && metered()) return { status: 'skipped-metered', build: meta.build };

    // checksum 交给插件校验（sha256）；下错/下断会直接抛错，不会落地半个包。
    let listener;
    let lastPercent = 0;
    setState('downloading', EN ? 'Downloading update… waiting for progress.' : '正在下载更新包…等待下载进度。');
    try {
      if (typeof Updater.addListener === 'function') {
        try {
          listener = await Updater.addListener('download', event => {
            if (uiState.phase !== 'downloading' || !event ||
                !event.bundle || String(event.bundle.version) !== String(meta.build) ||
                typeof event.percent !== 'number' || !Number.isFinite(event.percent)) return;
            lastPercent = Math.max(lastPercent, Math.min(100, Math.max(0, Math.floor(event.percent))));
            setState('downloading', (EN ? 'Downloading ' : '正在下载 ') + meta.version + ' · ' + lastPercent + '%' +
              (lastPercent === 100 ? (EN ? ' — verifying/preparing…' : ' · 正在校验、准备更新包…') : ''), lastPercent);
          });
        } catch (e) { /* Older bridges can download without progress events; stay indeterminate. */ }
      }
    const bundle = await Updater.download({
      url: meta.zipUrl || FALLBACK_ZIP,
      version: String(meta.build),
      checksum: meta.sha256 || undefined
    });
    if (!bundle || !bundle.id) throw new Error('下载返回异常');

    // next 而不是 set：不打断当前这一局，切后台或重启时才换过去。
    setState('preparing', EN ? 'Download complete. Scheduling update…' : '下载完成，正在安排下次启动使用…');
    await Updater.next({ id: bundle.id });
    try { localStorage.setItem(LS_PENDING, String(meta.build)); } catch (e) {}
    return { status: 'staged', build: meta.build, version: meta.version };
    } finally {
      if (listener && typeof listener.remove === 'function') {
        try { await listener.remove(); } catch (e) {}
      }
    }
  }

  /* ── 轻量提示条：不依赖 app 自身的 CSS ── */
  function toast(text, onClick) {
    let el = document.getElementById('wolf-hot-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'wolf-hot-toast';
      el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:18px;z-index:99999;' +
        'max-width:88vw;padding:10px 16px;border-radius:10px;font-size:13px;line-height:1.5;' +
        'background:rgba(20,18,30,.95);color:#e8dcc0;border:1px solid rgba(200,168,76,.45);' +
        'box-shadow:0 6px 24px rgba(0,0,0,.45);text-align:center;';
      (document.body || document.documentElement).appendChild(el);
    }
    el.textContent = text;
    el.style.cursor = onClick ? 'pointer' : 'default';
    el.onclick = onClick || null;
    el.style.display = '';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.display = 'none'; }, onClick ? 12000 : 6000);
  }

  function report(r, manual) {
    if (!r) return;
    if (r.status === 'staged') toast(T.staged(r.version || r.build));
    else if (r.status === 'pending' && manual) toast(T.pending(r.version || r.build));
    else if (r.status === 'needs-apk') toast(T.needsApk, () => window.open(APK_PAGE, '_blank'));
    else if (r.status === 'current' && manual) toast(T.current);
  }

  /* ── 主菜单挂一行版本号 + 手动检查按钮（DOM 注入，不动 index.html 结构）── */
  function mountUi() {
    const anchor = document.getElementById('cloud-card');
    if (!anchor || document.getElementById('wolf-hot-row')) return;
    const row = document.createElement('div');
    row.id = 'wolf-hot-row';
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;' +
      'flex-wrap:wrap;margin:6px 0 2px;padding:8px 4px;font-size:.85em;color:#b8ad98;';
    const label = document.createElement('span');
    label.textContent = (EN ? 'Running: ' : '当前运行：') + APP_VERSION + ' · b' + APP_BUILD;
    const btn = document.createElement('button');
    btn.id = 'wolf-hot-check';
    btn.textContent = T.check;
    btn.style.cssText = 'background:none;border:1px solid rgba(200,168,76,.35);color:#c8a84c;' +
      'border-radius:6px;padding:3px 10px;font-size:1em;cursor:pointer;';
    btn.onclick = async () => {
      btn.disabled = true;
      toast(T.checking);
      try { report(await check({ manual: true }), true); }
      catch (e) { toast(T.failed + ' ' + (e && e.message ? e.message : '')); }
      finally { btn.disabled = false; }
    };
    const status = document.createElement('div');
    status.id = 'wolf-hot-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.style.cssText = 'flex-basis:100%;line-height:1.6;overflow-wrap:anywhere;';
    const progress = document.createElement('progress');
    progress.id = 'wolf-hot-progress';
    progress.max = 100;
    progress.setAttribute('aria-label', EN ? 'Update download progress' : '更新包下载进度');
    progress.style.cssText = 'width:100%;height:16px;accent-color:#c8a84c;';
    row.append(label, btn, status, progress);
    anchor.insertAdjacentElement('afterend', row);
    let pending = 0;
    try { pending = Number(localStorage.getItem(LS_PENDING)) || 0; } catch (e) {}
    if (uiState.phase === 'idle' && pending > APP_BUILD) setState('pending', T.pending('b' + pending));
    renderState();
  }

  window.WolfHotUpdate = {
    build: APP_BUILD,
    version: APP_VERSION,
    nativeAbi: NATIVE_ABI,
    check,
    getState: () => ({ ...uiState }),
    markBootOk
  };

  window.addEventListener('load', () => {
    mountUi();
    // 延后一点再查，别和开局的资源加载抢带宽。
    setTimeout(() => { check().then(r => report(r, false)).catch(() => {}); }, 8000);
  });
})();
