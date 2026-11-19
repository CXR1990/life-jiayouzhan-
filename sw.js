/* ============================================================
 * sw.js —— 自清理版本（不再缓存任何资源，不再拦截任何请求）
 *
 * 背景：旧版 sw.js 会把 index.html 等资源写入 Cache Storage 并
 *       拦截 fetch，导致已「添加到桌面」的旧 Service Worker 一直
 *       返回旧页面 / 旧清单，表现为开屏图卡住、更新不生效。
 *
 * 本版本激活后立即执行：
 *   1) 清空 Cache Storage 中的全部缓存
 *   2) 注销自身（Service Worker 被移除）
 *   3) 刷新所有已打开的页面，让它们直接走网络加载最新版
 * 并且**不注册 fetch 监听**，因此不再参与任何网络请求。
 * ============================================================ */

self.addEventListener('install', function(){
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    selfClean()
      .then(reloadOpenPages)
      .catch(function(){ /* 清理失败也不影响页面正常使用 */ })
  );
});

/* 清空全部缓存 */
function clearAllCaches(){
  if(!self.caches || !self.caches.keys) return Promise.resolve();
  return self.caches.keys().then(function(keys){
    return Promise.all(keys.map(function(key){
      return self.caches.delete(key);
    }));
  }).catch(function(){ return null; });
}

/* 注销自身 */
function unregisterSelf(){
  if(!self.registration || !self.registration.unregister) return Promise.resolve();
  return self.registration.unregister().catch(function(){ return null; });
}

function selfClean(){
  return Promise.all([ clearAllCaches(), unregisterSelf() ]);
}

/* 通知所有已打开的页面重新加载（此时 SW 已注销，会直接走网络） */
function reloadOpenPages(){
  if(!self.clients || !self.clients.matchAll) return Promise.resolve();
  return self.clients.matchAll({ type: 'window' }).then(function(list){
    list.forEach(function(client){
      try{ client.navigate(client.url); }catch(e){}
    });
  }).catch(function(){ return null; });
}

/* 注意：刻意不注册 'fetch' 事件，本 Service Worker 不拦截任何请求 */
