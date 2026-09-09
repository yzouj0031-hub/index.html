/* ══════════════════════════════════════════════════════════════════
 *  🔥 APK 更新（发现新版 → 用户确认 → 下载 → 安全启用 → 启动确认）
 *
 *  这个 app 的本体就是一份 index.html 加几个资源文件，绝大多数更新根本不碰原生层，
 *  所以没必要让用户重装安装包：
 *
 *    启动检查清单并提示；用户点击后下载，空闲时 set() 启用。
 *    不调用 next()：把应用切到后台不应意外打断尚未结束的对局。
 *
 *  ⚠️ 为什么用原生插件而不是 Service Worker：
 *  第一版是用 Service Worker + Cache Storage 掉包的，在浏览器里没问题，但在 APK 里
 *  完全无效——Capacitor 在【原生层】用 WebViewAssetLoader 拦截请求、直接把安装包里的
 *  文件递给 WebView，这一层排在 Service Worker 前面，SW 根本没机会插手。表现就是
 *  「提示下载成功、重启后版本号纹丝不动」。所以换成在同一层做事的插件。
 *
 *  几条硬性约束：
 *  · 只在 APK 里跑。网页/PWA 刷新本来就是最新的，不需要也不应该走这套。
 *  · 所有模式通过退出保护器判断是否活跃；没有保护器时禁止自动重载。
 *  · 下载成功不是安装成功；新页面启动确认后才能宣布更新完成。
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
  const LS_ATTEMPT = 'wolfHotAttempt';
  const LS_LAST = 'wolfHotLastCheck';
  const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;  // 自动检查最多 6 小时一次

  const EN = /\/en\//.test(location.pathname);
  const T = EN ? {
    staged: v => 'Update ' + v + ' downloaded. Ready to restart.',
    current: 'Already up to date.',
    checking: 'Checking for updates…',
    failed: 'Update check failed.',
    needsApk: 'A new version needs a new installer. Tap to open the download page.',
    version: 'Version',
    check: 'Check for updates',
    pending: v => 'Update ' + v + ' is ready to install.'
  } : {
    staged: v => '更新包 ' + v + ' 已下载，尚未生效。',
    current: '已经是最新版本。',
    checking: '正在检查更新…',
    failed: '检查更新失败。',
    needsApk: '新版本需要重新安装安装包，点这里打开下载页。',
    version: '版本',
    check: '检查更新',
    pending: v => '更新包 ' + v + ' 已核对，可立即重启更新。'
  };

  async function fetchJson(url) {
    // 滚动标签的 Release 资源会被 CDN 缓存，加时间戳 + no-store 强制拿最新的。
    const res = await fetch(url + '?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  /* 插件要求每次启动都确认「这一版能正常跑」。主脚本完整执行到底才会调到这里；
     新包把 app 写崩时这行永远到不了，插件超时后自动回滚到安装包内置版本。 */
  let bootTask = null;
  function markBootOk() {
    if (bootTask) return bootTask;
    bootTask = (async () => {
      await bounded(Updater.notifyAppReady(), 15000);
      let attempt;
      try { attempt = JSON.parse(localStorage.getItem(LS_ATTEMPT) || 'null'); } catch (e) {}
      const pending = Number(localStorage.getItem(LS_PENDING)) || 0;
      if (attempt || pending) {
        const current = await bounded(Updater.current(), 15000);
        const target = attempt ? attempt.build : pending;
        const nativeMatches = current && current.bundle &&
          (current.bundle.version === String(APP_BUILD) || current.bundle.id === 'builtin');
        if (APP_BUILD >= target && nativeMatches) {
          localStorage.removeItem(LS_PENDING);
          localStorage.removeItem(LS_ATTEMPT);
          setState('success', (EN ? 'Updated successfully. Running ' : '更新完成，当前运行 ') + APP_VERSION, 100);
        } else if (attempt) {
          setState('failed', EN ? 'Update did not start or was rolled back. Still running ' + APP_VERSION + '. Retry the download.'
            : '新版未成功启动或已回滚，当前仍运行 ' + APP_VERSION + '。请重新下载重试。');
          forceDownload = true;
          // Keep the attempt until retry or a confirmed successful boot; do not loop installs.
        }
      }
    })().catch(e => {
      setState('failed', (EN ? 'Could not confirm update startup: ' : '无法确认更新启动状态：') + errorText(e));
    });
    return bootTask;
  }
  function bounded(promise, ms) {
    let timer;
    return Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(EN ? 'Operation timed out' : '操作超时')), ms);
    })]).finally(() => clearTimeout(timer));
  }
  function errorText(e) { return e && e.message ? e.message : String(e || ''); }

  function metered() {
    const c = navigator.connection;
    return !!(c && (c.saveData || /^(slow-2g|2g)$/.test(c.effectiveType || '')));
  }

  let inFlight = null;
  let applying = false;
  let deferred = false;
  let installRequested = false;
  let forceDownload = false;
  let targetMeta = null;
  let readyBundle = null;
  let dialog = null;
  let remindedBuild = 0;
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
    if (button) button.disabled = !!inFlight || applying;
    if (progress) {
      progress.hidden = !['downloading', 'preparing', 'staged', 'applying', 'success'].includes(uiState.phase);
      if (uiState.percent === null) progress.removeAttribute('value');
      else progress.value = uiState.percent;
    }
    renderDialog();
  }
  function check(opts) {
    if (inFlight) return inFlight;
    if (applying) return Promise.resolve({status:'applying'});
    const previous = uiState;
    inFlight = performCheck(opts).then(r => {
      if (r.status === 'current') setState('current', T.current);
      else if (r.status === 'pending') setState('pending', T.pending(r.version || r.build));
      else if (r.status === 'staged') setState('staged', T.staged(r.version || r.build), 100);
      else if (r.status === 'available') setState('available', (EN ? 'New version available: ' : '发现新版本：') + r.version);
      else if (r.status === 'needs-apk') setState('needs-apk', T.needsApk);
      else if (r.status === 'skipped-metered') setState('idle', EN ? 'Data saver: tap Check to download.' : '省流量模式未自动下载，可点检查更新手动下载。');
      else if (r.status === 'skipped') { uiState = previous; renderState(); }
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
    const meta = await bounded(fetchJson(MANIFEST_URL), 20000);
    if (!meta || !Number.isInteger(meta.build)) throw new Error('version.json 格式错误');

    if (meta.build <= APP_BUILD) { targetMeta = null; readyBundle = null; return { status: 'current', build: APP_BUILD }; }
    targetMeta = meta;

    if ((Number(meta.minNative) || 1) > NATIVE_ABI) {
      return { status: 'needs-apk', build: meta.build, version: meta.version };
    }

    // Local flags are only hints. Native inventory is the authority for reusable packages.
    readyBundle = null;
    const list = await bounded(Updater.list(), 15000);
    if (!list || !Array.isArray(list.bundles)) throw new Error(EN ? 'Cannot read installed update packages' : '无法读取原生更新包状态');
    if (!forceDownload) readyBundle = list.bundles.find(b => b.id && String(b.version) === String(meta.build) &&
      ['pending', 'success'].includes(b.status)) || null;
    if (readyBundle) return {status:'pending', build:meta.build, version:meta.version};
    localStorage.removeItem(LS_PENDING);
    if (!(opts && opts.download)) return {status:'available', build:meta.build, version:meta.version};

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

    // Leave the bundle unqueued; backgrounding during a match must not activate it.
    setState('preparing', EN ? 'Download complete. Checking update package…' : '下载完成，正在核对更新包…');
    const downloaded = await bounded(Updater.list(), 15000);
    readyBundle = downloaded.bundles && downloaded.bundles.find(b => b.id === bundle.id &&
      String(b.version) === String(meta.build) && ['pending', 'success'].includes(b.status));
    if (!readyBundle) throw new Error(EN ? 'Downloaded package is not ready' : '下载包尚不可用，请重试');
    forceDownload = false;
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
    if (['available', 'pending', 'staged', 'needs-apk'].includes(r.status)) {
      if (manual || remindedBuild !== r.build) { remindedBuild = r.build; showDialog(); }
    }
    else if (r.status === 'current' && manual) toast(T.current);
  }

  function isActive() {
    // Fail closed: an uninitialized or broken guard is not proof it is safe to reload.
    if (!window.WolfExitGuard || typeof window.WolfExitGuard.isActive !== 'function') return true;
    try { return window.WolfExitGuard.isActive(); } catch (e) { return true; }
  }
  async function updateNow() {
    if (inFlight || applying) return;
    installRequested = true;
    showDialog();
    try {
      const result = await check({manual:true, download:true});
      if (installRequested && ['staged', 'pending'].includes(result.status)) await applyReady();
    } catch (e) { /* check/applyReady expose errors in the persistent UI */ }
  }
  async function applyReady() {
    if (applying || inFlight || !readyBundle || !targetMeta) return;
    if (isActive()) {
      deferred = true;
      setState('deferred', EN ? 'Download ready. Waiting for the session to end; it will not be interrupted.'
        : '更新包已准备好，等待本局／当前会话结束后自动更新，不会打断游戏。');
      return;
    }
    applying = true;
    deferred = false;
    setState('preparing', EN ? 'Preparing to restart…' : '正在准备重启更新…');
    try {
      const inventory = await bounded(Updater.list(), 15000);
      const valid = inventory.bundles && inventory.bundles.find(b => b.id === readyBundle.id &&
        String(b.version) === String(targetMeta.build) && ['pending', 'success'].includes(b.status));
      if (!valid) { readyBundle = null; forceDownload = true; throw new Error(EN ? 'Update package is missing or failed. Download again.' : '更新包已丢失或失效，请重新下载。'); }
      // Recheck after asynchronous native calls; the user may have started a game.
      if (isActive()) {
        deferred = true;
        setState('deferred', EN ? 'Waiting for the session to end.' : '等待当前会话结束后更新。');
        return;
      }
      if (!window.WolfExitGuard.prepareUpdate || window.WolfExitGuard.prepareUpdate() !== true)
        throw new Error(EN ? 'Session data could not be saved safely. Update has been stopped.' : '当前数据未能安全保存，已停止更新。');
      localStorage.setItem(LS_ATTEMPT, JSON.stringify({build:targetMeta.build, id:valid.id, from:APP_BUILD}));
      setState('applying', EN ? 'Restarting into the new version…' : '正在重启并启用新版…');
      // set() reloads the WebView. Success belongs to markBootOk() in the NEW context.
      await bounded(Updater.set({id:valid.id}), 30000);
      await new Promise(resolve => setTimeout(resolve, 10000));
      throw new Error(EN ? 'The new version did not reload. Retry the update.' : '新版未重新加载，请重试更新。');
    } catch (e) {
      forceDownload = true;
      setState('failed', (EN ? 'Update failed; still running ' : '更新失败，当前仍运行 ') + APP_VERSION + '。' + errorText(e));
    } finally { applying = false; renderState(); }
  }

  function showDialog() {
    if (!dialog) {
      dialog = document.createElement('div');
      dialog.id = 'wolf-update-dialog';
      dialog.style.cssText = 'position:fixed;inset:0;z-index:100001;background:#080813b8;display:flex;align-items:center;justify-content:center;padding:20px;';
      const card = document.createElement('section');
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-modal', 'true');
      card.setAttribute('aria-labelledby', 'wolf-update-title');
      card.style.cssText = 'width:100%;max-width:420px;background:#211e35;color:#f3e8d3;border:1px solid #b79b59;border-radius:18px;padding:24px;box-shadow:0 20px 70px #0008;';
      const title = document.createElement('h2');
      title.id = 'wolf-update-title';
      title.textContent = EN ? 'App update' : '应用更新';
      title.style.cssText = 'margin:0 0 12px;font-size:22px;';
      const version = document.createElement('div');
      version.id = 'wolf-update-version';
      version.style.cssText = 'color:#cbbd9f;margin-bottom:16px;font-size:14px;';
      const status = document.createElement('div');
      status.id = 'wolf-update-message';
      status.setAttribute('role','status');
      status.style.cssText = 'line-height:1.7;overflow-wrap:anywhere;min-height:52px;';
      const progress = document.createElement('progress');
      progress.id = 'wolf-update-bar';
      progress.max = 100;
      progress.setAttribute('aria-label', EN ? 'Update progress' : '更新进度');
      progress.style.cssText = 'width:100%;height:18px;accent-color:#c8a84c;margin:16px 0;';
      const primary = document.createElement('button');
      primary.id = 'wolf-update-primary';
      primary.style.cssText = 'padding:12px 18px;border:0;border-radius:9px;background:#d5b96c;color:#211e35;font-weight:bold;font-size:16px;cursor:pointer;margin:12px 10px 0 0;';
      primary.onclick = () => uiState.phase === 'needs-apk' ? window.open(APK_PAGE,'_blank') : updateNow();
      const later = document.createElement('button');
      later.id = 'wolf-update-later';
      later.style.cssText = 'padding:12px;border:1px solid #857650;border-radius:9px;background:transparent;color:#eadfc9;cursor:pointer;';
      later.onclick = () => {
        installRequested = false;
        deferred = false;
        if (uiState.phase === 'deferred') setState('staged', EN ? 'Update downloaded. Automatic restart canceled; install when ready.'
          : '更新包已下载，已取消自动重启；可稍后点击启用。', 100);
        dialog.hidden = true;
        dialog.style.display = 'none';
        document.getElementById('wolf-hot-check')?.focus();
      };
      card.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !applying) { event.preventDefault(); later.click(); }
        if (event.key === 'Tab') {
          const buttons = [primary,later].filter(b => !b.hidden && !b.disabled);
          if (!buttons.length) { event.preventDefault(); return; }
          if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons[buttons.length-1].focus(); }
          else if (!event.shiftKey && document.activeElement === buttons[buttons.length-1]) { event.preventDefault(); buttons[0].focus(); }
        }
      });
      card.append(title, version, status, progress, primary, later);
      dialog.appendChild(card);
      document.body.appendChild(dialog);
    }
    dialog.hidden = false;
    dialog.style.display = 'flex';
    renderDialog();
    const primary = document.getElementById('wolf-update-primary');
    (primary && !primary.hidden && !primary.disabled ? primary : document.getElementById('wolf-update-later'))?.focus();
  }
  function renderDialog() {
    if (!dialog) return;
    const busy = !!inFlight || applying;
    document.getElementById('wolf-update-version').textContent = (EN ? 'Running ' : '当前 ') + APP_VERSION +
      (targetMeta ? ' → ' + targetMeta.version : '');
    document.getElementById('wolf-update-message').textContent = uiState.text;
    const bar = document.getElementById('wolf-update-bar');
    bar.hidden = !['downloading','preparing','applying','staged','success'].includes(uiState.phase);
    if (uiState.percent === null) bar.removeAttribute('value'); else bar.value = uiState.percent;
    const primary = document.getElementById('wolf-update-primary');
    primary.hidden = ['current','success'].includes(uiState.phase);
    primary.disabled = busy || deferred;
    primary.textContent = busy ? (uiState.phase === 'downloading' ? (EN ? 'Downloading…' : '下载中…') : (EN ? 'Updating…' : '正在更新…')) :
      uiState.phase === 'needs-apk' ? (EN ? 'Get installer' : '获取安装包') :
      uiState.phase === 'failed' ? (EN ? 'Retry update' : '重新下载并重试') :
      deferred ? (EN ? 'Waiting for session' : '等待会话结束') :
      isActive() ? (EN ? 'Download · install after session' : '下载 · 本局结束后更新') :
      readyBundle ? (EN ? 'Restart and update' : '立即重启更新') : (EN ? 'Update now' : '立即更新');
    const later = document.getElementById('wolf-update-later');
    later.disabled = applying;
    later.textContent = ['success','current'].includes(uiState.phase) ? (EN ? 'Done' : '完成') :
      busy ? (EN ? 'Background · install later' : '后台下载，稍后安装') :
      deferred ? (EN ? 'Cancel scheduled restart' : '取消自动重启') : (EN ? 'Later' : '稍后提醒');
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
    label.textContent = (EN ? 'Running: ' : '当前运行：') + (APP_VERSION === 'dev' ? 'dev · b' + APP_BUILD : APP_VERSION);
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
    renderState();
  }

  window.WolfHotUpdate = {
    build: APP_BUILD,
    version: APP_VERSION,
    nativeAbi: NATIVE_ABI,
    check,
    updateNow,
    applyReady,
    getState: () => ({ ...uiState }),
    markBootOk
  };

  window.addEventListener('load', () => {
    mountUi();
    // 延后一点再查，别和开局的资源加载抢带宽。
    Promise.resolve(bootTask).then(() => {
      if (['success','failed'].includes(uiState.phase)) showDialog();
      setTimeout(() => {
        if (['success','failed'].includes(uiState.phase)) return;
        check({manual:true}).then(r => report(r, false)).catch(() => {});
      }, 2000);
    });
    setInterval(() => {
      if (deferred && !document.hidden && !isActive()) applyReady();
    }, 1500);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !inFlight && !applying && !deferred && !['success','failed'].includes(uiState.phase))
        check().then(r => report(r, false)).catch(() => {});
    });
  });
})();
