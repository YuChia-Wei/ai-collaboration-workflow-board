// Keep the existing manual/source workspace and the collaboration profile separate.
if (new URLSearchParams(location.search).get('view') === 'collaboration') {
  import('./collaboration-app.mjs');
} else {
  import('./app.mjs');
}
