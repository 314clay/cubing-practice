/**
 * ZBLL Stats Exporter - Content Script
 * Runs on bestsiteever.net/zbll/* pages
 */

const LOCAL_SERVER = 'http://localhost:3847/zbll-stats';
const EXPORT_INTERVAL_MS = 5 * 60 * 1000; // Every 5 minutes

let lastExportedCount = 0;

function getStats() {
  const stats = JSON.parse(localStorage.getItem('zbll_stats_array') || '[]');
  const store = JSON.parse(localStorage.getItem('zbll_store') || '{}');

  return {
    stats,
    store,
    exportedAt: new Date().toISOString(),
    source: 'bestsiteever.net/zbll',
    totalSolves: stats.length,
    summary: stats.length > 0 ? {
      avgMs: Math.round(stats.reduce((sum, s) => sum + s.ms, 0) / stats.length),
      bestMs: Math.min(...stats.map(s => s.ms)),
      worstMs: Math.max(...stats.map(s => s.ms)),
      uniqueCases: [...new Set(stats.map(s => s.key))].length,
    } : null,
  };
}

async function exportStats(reason = 'scheduled') {
  const data = getStats();

  // Skip if no new solves
  if (data.totalSolves === lastExportedCount && reason === 'scheduled') {
    console.log('[ZBLL Exporter] No new solves, skipping export');
    return;
  }

  console.log(`[ZBLL Exporter] Exporting ${data.totalSolves} solves (${reason})...`);

  try {
    const response = await fetch(LOCAL_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      lastExportedCount = data.totalSolves;
      console.log('[ZBLL Exporter] Export successful!');
      showNotification('Stats synced!', 'success');
    } else {
      throw new Error(`Server returned ${response.status}`);
    }
  } catch (err) {
    console.warn('[ZBLL Exporter] Server not running, saving to chrome.storage', err.message);
    // Fallback: save to chrome.storage for later
    chrome.storage.local.set({
      zbllStats: data,
      pendingSync: true,
    });
    showNotification('Saved locally (server offline)', 'warning');
  }
}

function showNotification(message, type = 'info') {
  const existing = document.getElementById('zbll-exporter-notification');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.id = 'zbll-exporter-notification';
  div.textContent = message;
  div.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 10px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-family: sans-serif;
    z-index: 99999;
    transition: opacity 0.3s;
    background: ${type === 'success' ? '#166534' : type === 'warning' ? '#854d0e' : '#1e40af'};
    color: white;
  `;

  document.body.appendChild(div);
  setTimeout(() => {
    div.style.opacity = '0';
    setTimeout(() => div.remove(), 300);
  }, 2000);
}

// Export on page unload (when closing tab or navigating away)
window.addEventListener('beforeunload', () => {
  exportStats('page_unload');
});

// Export periodically while page is open
setInterval(() => exportStats('scheduled'), EXPORT_INTERVAL_MS);

// Export when spacebar is released (likely just finished a solve)
let solveCount = 0;
document.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    // Check if solve count increased
    setTimeout(() => {
      const currentCount = JSON.parse(localStorage.getItem('zbll_stats_array') || '[]').length;
      if (currentCount > solveCount) {
        solveCount = currentCount;
        // Don't export every solve, just track it
        // Export will happen on interval or page close
      }
    }, 500);
  }
});

// Initial export on page load
setTimeout(() => exportStats('page_load'), 2000);

console.log('[ZBLL Exporter] Content script loaded - will sync to localhost:3847');
