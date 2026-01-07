/**
 * ZBLL Stats Exporter - Background Service Worker
 */

// Listen for extension install
chrome.runtime.onInstalled.addListener(() => {
  console.log('[ZBLL Exporter] Extension installed');
});

// Could add periodic background sync here if needed
// But content script handles most of the work
