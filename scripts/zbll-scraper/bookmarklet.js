javascript:(function(){
  const stats = JSON.parse(localStorage.getItem('zbll_stats_array') || '[]');
  const store = JSON.parse(localStorage.getItem('zbll_store') || '{}');
  const settings = JSON.parse(localStorage.getItem('zbllTrainerSettings') || '{}');

  const data = {
    stats: stats,
    store: store,
    settings: settings,
    exportedAt: new Date().toISOString(),
    source: 'bestsiteever.net/zbll',
    totalSolves: stats.length,
    summary: stats.length > 0 ? {
      avgMs: Math.round(stats.reduce((sum, s) => sum + s.ms, 0) / stats.length),
      bestMs: Math.min(...stats.map(s => s.ms)),
      worstMs: Math.max(...stats.map(s => s.ms)),
      uniqueCases: [...new Set(stats.map(s => s.key))].length
    } : null
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'zbll-stats-' + new Date().toISOString().split('T')[0] + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  alert('Exported ' + stats.length + ' solves!');
})();
