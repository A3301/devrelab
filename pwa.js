/* © 2026 Ali AKDAĞLI — Sürüm 1.3 */
(async function(){
 const label=document.getElementById('offline-status');
 if(location.protocol!=='https:' && location.hostname!=='localhost'){label.textContent='Bu paket önce HTTPS destekli bir web adresine yüklenmelidir. Dosyalar uygulamasından açarak kurulum yapılamaz.';return;}
 if(!('serviceWorker' in navigator)){label.textContent='Bu tarayıcı çevrimdışı kurulumu desteklemiyor. Safari ile çevrimiçi kullanın.';return;}
 const timer=setTimeout(()=>{label.textContent='Hazırlık sürüyor. İnternet bağlantınızı kontrol edin; hazır mesajı görünmeden çevrimdışı kullanıma geçmeyin.';},20000);
 try{
  await navigator.serviceWorker.register('./sw.js',{scope:'./'});
  await navigator.serviceWorker.ready;
  const cache=await caches.open("devrelab-ali-v13-2");
  const files=["./LISANS.txt", "./devre1/hafta01.html", "./devre1/hafta01.js", "./devre1/hafta02.html", "./devre1/hafta02.js", "./devre1/hafta03.html", "./devre1/hafta03.js", "./devre1/hafta04.html", "./devre1/hafta04.js", "./devre1/hafta05.html", "./devre1/hafta05.js", "./devre1/hafta06.html", "./devre1/hafta06.js", "./devre1/hafta07.html", "./devre1/hafta07.js", "./devre1/hafta08.html", "./devre1/hafta08.js", "./devre1/hafta09.html", "./devre1/hafta09.js", "./devre1/hafta10.html", "./devre1/hafta10.js", "./devre1/hafta11.html", "./devre1/hafta11.js", "./devre1/hafta12.html", "./devre1/hafta12.js", "./devre1/hafta13.html", "./devre1/hafta13.js", "./devre1/hafta14.html", "./devre1/hafta14.js", "./devre2/hafta01.html", "./devre2/hafta01.js", "./devre2/hafta02.html", "./devre2/hafta02.js", "./devre2/hafta03.html", "./devre2/hafta03.js", "./devre2/hafta04.html", "./devre2/hafta04.js", "./devre2/hafta05.html", "./devre2/hafta05.js", "./devre2/hafta06.html", "./devre2/hafta06.js", "./devre2/hafta07.html", "./devre2/hafta07.js", "./devre2/hafta08.html", "./devre2/hafta08.js", "./devre2/hafta09.html", "./devre2/hafta09.js", "./devre2/hafta10.html", "./devre2/hafta10.js", "./devre2/hafta11.html", "./devre2/hafta11.js", "./devre2/hafta12.html", "./devre2/hafta12.js", "./devre2/hafta13.html", "./devre2/hafta13.js", "./devre2/hafta14.html", "./devre2/hafta14.js", "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png", "./index.html", "./manifest.webmanifest", "./ortak/ciktilar.js", "./ortak/lab-core.js", "./ortak/lab.css", "./pwa-bridge.js", "./pwa.js"];
  for(const file of files){if(!await cache.match(new URL(file,location.href).href))throw Error('Önbellek eksik');}
  clearTimeout(timer);label.textContent='✓ Çevrimdışı içerik hazır. Ana ekrana ekledikten sonra simgeden bir kez internet açıkken açın ve bu mesajı tekrar kontrol edin.';
 }catch(error){clearTimeout(timer);label.textContent='Çevrimdışı hazırlık tamamlanamadı. İnternet açıkken sayfayı kapatıp yeniden açın. İçerik çevrimiçi kullanılabilir.';}
})();
