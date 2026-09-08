// 自动更新的行为测试：在 Node 里用 vm 造一个 APK 环境，把 hot-update.js 真跑起来，
// 用假的 CapacitorUpdater 记录它到底调了什么。手机上难复现的分支（原生 ABI 不够、
// 已下载过、网页端不许跑、启动确认）在这里全部走一遍。
//
// ⚠️ 这里验证的是【调用逻辑】。插件本身能不能在真机上换包，只能装 APK 实测——
// 上一版就是败在这一点上：逻辑全对，但 Service Worker 在 APK 里根本没机会执行。
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

let passed = 0;
const ok = (c, label) => { if (!c) { console.error('❌ ' + label); process.exit(1); } passed++; };
const eq = (g, w, label) => ok(Object.is(g, w), `${label}（期望 ${w}，实际 ${g}）`);

const SRC = readFileSync('hot-update.js', 'utf8');
const stampedWith = b => SRC.replace(/const APP_BUILD = \d+;/, `const APP_BUILD = ${b};`);

function makeStorage(init = {}) {
  const m = new Map(Object.entries(init).map(([k, v]) => [k, String(v)]));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)),
           removeItem: k => m.delete(k), _map: m };
}

// 记录插件收到的每一次调用，测试据此断言，而不是去猜内部状态
function makeUpdater() {
  const calls = { download: [], next: [], notifyAppReady: 0 };
  return {
    calls,
    plugin: {
      async download(o) { calls.download.push(o); return { id: 'bundle-' + o.version, version: o.version }; },
      async next(o) { calls.next.push(o); },
      notifyAppReady() { calls.notifyAppReady++; return Promise.resolve({}); },
      async current() { return { bundle: { id: 'builtin', version: 'builtin' }, native: '1.0.0' }; }
    }
  };
}

function run({ source = SRC, native = true, hasPlugin = true, remote, localStorage = makeStorage(),
               pathname = '/', connection } = {}) {
  const up = makeUpdater();
  const swRegs = [{ unregistered: false, unregister() { this.unregistered = true; return Promise.resolve(); } }];
  const deletedCaches = [];
  const ctx = {
    console, setTimeout, clearTimeout, setImmediate, URL,
    localStorage,
    fetch: async url => {
      if (!/version\.json/.test(url)) throw new Error('只应请求 version.json，实际：' + url);
      return { ok: true, async json() { return remote; } };
    },
    location: { pathname, href: 'https://localhost' + pathname },
    document: {
      getElementById: () => null,
      createElement: () => ({ style: {}, append() {}, insertAdjacentElement() {}, onclick: null }),
      body: { appendChild() {} }, documentElement: { appendChild() {} }
    },
    navigator: {
      connection,
      serviceWorker: { getRegistrations: async () => swRegs }
    },
    caches: {
      keys: async () => ['wolf-pwa-x', 'wolf-hot-active'],
      delete: async k => { deletedCaches.push(k); return true; }
    },
    Capacitor: native ? {
      isNativePlatform: () => true,
      Plugins: hasPlugin ? { CapacitorUpdater: up.plugin } : {},
      registerPlugin: () => (hasPlugin ? up.plugin : null)
    } : undefined
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  ctx.window.addEventListener = () => {};
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: 'hot-update.js' });
  return { ctx, api: ctx.window.WolfHotUpdate, calls: up.calls, swRegs, deletedCaches };
}

const remoteAt = (build, extra = {}) => ({
  build, version: 'b' + build, minNative: 1,
  sha256: 'a'.repeat(64), size: 123, zipUrl: 'https://example.test/bundle.zip', ...extra
});

/* ① 仓库里必须保持占位值，否则本地开发版会把自己当成线上版本 */
eq(Number(SRC.match(/const APP_BUILD = (\d+);/)[1]), 0, '仓库里的 hot-update.js 应保持 APP_BUILD=0');
eq(SRC.match(/const APP_VERSION = '([^']*)';/)[1], 'dev', '仓库里的 APP_VERSION 应保持 dev');

/* ② 网页端完全不参与：不暴露控制器、不请求清单 */
{
  const r = run({ native: false, remote: remoteAt(999) });
  ok(!r.api, '网页端不应暴露 WolfHotUpdate');
  eq(r.calls.download.length, 0, '网页端不应下载更新包');
}

/* ③ 网页端也不该动 Service Worker —— 浏览器还要靠它离线 */
{
  const r = run({ native: false, remote: remoteAt(999) });
  await new Promise(res => setImmediate(res));
  ok(!r.swRegs[0].unregistered, '网页端不能注销 Service Worker');
  eq(r.deletedCaches.length, 0, '网页端不能清空缓存');
}

/* ④ APK 里必须清掉旧方案留下的 SW 和缓存，否则换包后会新页面配旧脚本 */
{
  const r = run({ remote: remoteAt(0) });
  await new Promise(res => setImmediate(res));
  await new Promise(res => setImmediate(res));
  ok(r.swRegs[0].unregistered, 'APK 里应注销遗留的 Service Worker');
  ok(r.deletedCaches.includes('wolf-hot-active'), 'APK 里应清掉旧热更新缓存');
  ok(r.deletedCaches.includes('wolf-pwa-x'), 'APK 里应清掉旧 PWA 缓存');
}

/* ⑤ 插件不存在时安静退出，不能连累主程序 */
{
  const r = run({ hasPlugin: false, remote: remoteAt(999) });
  ok(!r.api, '拿不到插件时不应暴露控制器');
}

/* ⑥ 远端不比本地新 → 什么都不做 */
{
  const r = run({ source: stampedWith(700), remote: remoteAt(700) });
  const res = await r.api.check({ manual: true });
  eq(res.status, 'current', '构建号不大于本地时应报 current');
  eq(r.calls.download.length, 0, 'current 时不应下载');
}

/* ⑦ 有新版 → 按清单里的地址下载，并用 next 排到下次启动（不能用 set 打断当前对局） */
{
  const r = run({ source: stampedWith(700), remote: remoteAt(750) });
  const res = await r.api.check({ manual: true });
  eq(res.status, 'staged', '有新版应报 staged');
  eq(r.calls.download.length, 1, '应下载一次');
  eq(r.calls.download[0].url, 'https://example.test/bundle.zip', '应使用清单里的 zipUrl');
  eq(r.calls.download[0].version, '750', '应把构建号作为版本号传给插件');
  eq(r.calls.download[0].checksum, 'a'.repeat(64), '应把 sha256 交给插件校验');
  eq(r.calls.next.length, 1, '应调用 next 排期');
  eq(r.calls.next[0].id, 'bundle-750', 'next 应指向刚下载的包');
  eq(r.ctx.localStorage.getItem('wolfHotPending'), '750', '应记下已就绪的构建号');
}

/* ⑧ 已经下载过就不再重复下载几 MB */
{
  const ls = makeStorage({ wolfHotPending: '750' });
  const r = run({ source: stampedWith(700), remote: remoteAt(750), localStorage: ls });
  const res = await r.api.check({ manual: true });
  eq(res.status, 'pending', '已就绪时应报 pending');
  eq(r.calls.download.length, 0, 'pending 时不应重复下载');
}

/* ⑨ 新网页要求更高的原生 ABI → 不下载，提示去装新安装包 */
{
  const r = run({ source: stampedWith(700), remote: remoteAt(750, { minNative: 99 }) });
  const res = await r.api.check({ manual: true });
  eq(res.status, 'needs-apk', '原生 ABI 不够时应报 needs-apk');
  eq(r.calls.download.length, 0, 'needs-apk 时绝不能下载——包里的新页面跑不起来');
}

/* ⑩ 省流量 / 2G 下不自动下载，但手动点仍然下 */
{
  const saveData = { connection: { saveData: true, effectiveType: '4g' } };
  const auto = run({ source: stampedWith(700), remote: remoteAt(750), ...saveData });
  eq((await auto.api.check({})).status, 'skipped-metered', '省流量模式不应自动下载');
  eq(auto.calls.download.length, 0, '省流量模式确实没下载');

  const manual = run({ source: stampedWith(700), remote: remoteAt(750), ...saveData });
  eq((await manual.api.check({ manual: true })).status, 'staged', '手动点应无视省流量模式');
}

/* ⑪ 自动检查有 6 小时节流，手动检查不受限 */
{
  const ls = makeStorage({ wolfHotLastCheck: String(Date.now()) });
  const r = run({ source: stampedWith(700), remote: remoteAt(750), localStorage: ls });
  eq((await r.api.check({})).status, 'skipped', '短时间内不应重复自动检查');
  eq((await r.api.check({ manual: true })).status, 'staged', '手动检查应无视节流');
}

/* ⑫ 启动确认必须真的调到插件——不调的话插件会判定启动失败并回滚 */
{
  const ls = makeStorage({ wolfHotPending: '700' });
  const r = run({ source: stampedWith(700), remote: remoteAt(700), localStorage: ls });
  r.api.markBootOk();
  eq(r.calls.notifyAppReady, 1, 'markBootOk 应调用插件的 notifyAppReady');
  eq(ls.getItem('wolfHotPending'), null, '已生效的构建号应从 pending 清掉');
}

/* ⑬ 主脚本里必须留着启动确认，且 SW 只在网页端注册 */
for (const f of ['index.html', 'en/index.html']) {
  const h = readFileSync(f, 'utf8');
  ok(h.includes('WolfHotUpdate.markBootOk()'), `${f} 必须调用 markBootOk()`);
  ok(/serviceWorker' in navigator &&[\s\S]{0,200}isNativePlatform\(\)\)\)/.test(h),
    `${f} 必须只在网页端注册 Service Worker`);
}

/* ⑭ 两个客户端的 hot-update.js 必须逐字一致，避免只改了一边 */
ok(SRC === readFileSync('en/hot-update.js', 'utf8'), 'en/hot-update.js 必须与根目录版本逐字一致');

/* ⑮ 旧方案的残留必须清干净，避免两套机制并存 */
for (const f of ['sw.js', 'en/sw.js']) {
  const s = readFileSync(f, 'utf8');
  ok(!/HOT_CACHE|BUNDLED_BUILD|wolf-hot-active/.test(s), `${f} 不应再残留旧热更新逻辑`);
}

/* ⑯ 打包脚本必须把 hot-update.js 收进 APK，否则安装包里根本没有更新器 */
{
  const b = readFileSync('scripts/build-www.mjs', 'utf8');
  ok(b.includes("'hot-update.js'"), 'build-www.mjs 必须收集 hot-update.js');
}

/* ⑰ 覆盖安装需要固定签名，并且 Android 原生 versionCode 必须随构建递增 */
{
  const workflow = readFileSync('.github/workflows/build-apk.yml', 'utf8');
  ok(workflow.includes('ANDROID_KEYSTORE_BASE64'), 'APK 工作流必须支持固定发布签名');
  ok(workflow.includes('s/versionCode [0-9]+/versionCode ${BUILD_NUMBER}/'),
    'APK 工作流必须把递增构建号写入 Android versionCode');
  ok(workflow.includes('versionName \\"1.0.${BUILD_NUMBER}\\"'),
    'APK 工作流必须同步写入可见的 Android versionName');
}

console.log(`hot update: ${passed} 项检查通过`);
