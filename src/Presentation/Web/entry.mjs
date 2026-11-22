// Preserve bookmarked manual and collaboration workspaces.
const params = new URLSearchParams(location.search);
const view = params.get('view');
if (view === 'source-replica') {
  import('./source-replica-app.mjs');
} else if (view === 'collaboration') {
  import('./collaboration-app.mjs');
} else if (view === 'portfolio' || (!view && !location.hash && [...params.keys()].every(key => key === 'store'))) {
  import('./portfolio-app.mjs');
} else {
  import('./app.mjs');
}
