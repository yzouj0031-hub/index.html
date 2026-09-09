(function () {
  'use strict';

  const EN = document.documentElement.lang === 'en' || /\/en(?:\/|$)/.test(location.pathname);
  const T = EN ? {
    title:'Leave the current session?', body:'This mode is still running. Stay to continue, or save what can be saved and exit.',
    stay:'Stay', exit:'Save and exit', fallback:'current session'
  } : {
    title:'要离开当前进程吗？', body:'这个模式仍在运行。你可以留下继续，或保存能够保存的进度后退出。',
    stay:'留在这里', exit:'保存并退出', fallback:'当前进程'
  };
  const providers = new Map();
  const isNative = !!window.Capacitor?.isNativePlatform?.();
  let modal = null;
  let pending = null;
  let allowHistoryExit = false;
  let allowUnloadOnce = false;
  let nativeBackHandle = null;

  function activeProviders() {
    return [...providers.values()].filter(item => {
      try { return !!item.isActive?.(); } catch (_) { return false; }
    });
  }

  function save(items) {
    (items || activeProviders()).forEach(item => {
      try { item.save?.(); } catch (_) {}
    });
  }

  function installUI() {
    if (modal || !document.body) return;
    modal = document.createElement('div');
    modal.id = 'wg-exit-guard'; modal.className = 'wg-exit-guard';
    modal.innerHTML = '<section class="wg-exit-guard-card" role="alertdialog" aria-modal="true" aria-labelledby="wg-exit-guard-title">'
      + '<span class="wg-exit-guard-mark" aria-hidden="true"></span>'
      + '<h3 id="wg-exit-guard-title">' + T.title + '</h3><p id="wg-exit-guard-body">' + T.body + '</p>'
      + '<div class="wg-exit-guard-actions"><button type="button" class="stay" id="wg-exit-stay">' + T.stay + '</button>'
      + '<button type="button" class="exit" id="wg-exit-confirm">' + T.exit + '</button></div></section>';
    document.body.appendChild(modal);
    document.getElementById('wg-exit-stay').onclick = hidePrompt;
    document.getElementById('wg-exit-confirm').onclick = confirmExit;
  }

  function ensureHistoryGuard() {
    if (isNative || !activeProviders().length) return;
    if (!history.state?.wgExitGuard) history.pushState({...history.state,wgExitGuard:true},'',location.href);
  }

  function refresh() {
    if (activeProviders().length) ensureHistoryGuard();
  }

  function showPrompt(continuation) {
    const items = activeProviders();
    if (!items.length) return continuation?.();
    installUI();
    pending = {items,continuation};
    const names = [...new Set(items.map(item => item.label).filter(Boolean))];
    const body = document.getElementById('wg-exit-guard-body');
    if (body) body.textContent = names.length
      ? (EN ? `${names.join(' / ')} is still running. Stay to continue, or save what can be saved and exit.` : `${names.join('、')}仍在运行。你可以留下继续，或保存能够保存的进度后退出。`)
      : T.body;
    modal?.classList.add('show');
    document.getElementById('wg-exit-stay')?.focus();
  }

  function hidePrompt() {
    pending = null;
    modal?.classList.remove('show');
  }

  async function confirmExit() {
    const task = pending;
    hidePrompt();
    if (!task) return;
    save(task.items);
    for (const item of task.items) {
      try { await item.onExit?.(); } catch (_) {}
    }
    allowUnloadOnce = true;
    task.continuation?.();
  }

  function onBeforeUnload(event) {
    if (allowUnloadOnce) { allowUnloadOnce = false; return; }
    const items = activeProviders();
    if (!items.length) return;
    save(items);
    event.preventDefault();
    event.returnValue = '';
  }

  function onHistoryBack() {
    if (allowHistoryExit) {
      allowHistoryExit = false;
      history.back();
      return;
    }
    if (isNative || !activeProviders().length) return;
    history.pushState({...history.state,wgExitGuard:true},'',location.href);
    showPrompt(() => {
      allowHistoryExit = true;
      history.back();
    });
  }

  async function installNativeBackGuard() {
    const app = window.Capacitor?.Plugins?.App;
    if (!isNative || !app?.addListener || nativeBackHandle) return;
    try {
      nativeBackHandle = await app.addListener('backButton', event => {
        if (activeProviders().length) return showPrompt(() => app.exitApp?.());
        if (event?.canGoBack) history.back(); else app.exitApp?.();
      });
    } catch (_) {}
  }

  function register(id, provider) {
    providers.set(id,{id,label:provider?.label || T.fallback,...provider});
    refresh();
    return () => providers.delete(id);
  }

  window.addEventListener('beforeunload',onBeforeUnload);
  window.addEventListener('popstate',onHistoryBack);
  document.addEventListener('visibilitychange',() => {
    if (document.visibilityState === 'hidden') save();
    else refresh();
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',() => { installUI(); installNativeBackGuard(); });
  else { installUI(); installNativeBackGuard(); }
  setInterval(refresh,1000);

  // Update reloads are stricter than ordinary exit: never swallow a failed save,
  // never end a live room/chat/match, and fail closed on a broken provider.
  function prepareUpdate() {
    const items = [...providers.values()];
    if (items.some(item => item.isActive?.())) return false;
    for (const item of items) {
      if (item.beforeUpdate && item.beforeUpdate() !== true) return false;
    }
    return true;
  }
  window.WolfExitGuard = {register,refresh,save,showPrompt,prepareUpdate,isActive:() => {
    try { return [...providers.values()].some(item => item.isActive?.()); }
    catch (_) { return true; }
  }};
})();
