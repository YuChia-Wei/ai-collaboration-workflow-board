const url = new URL(location.href);
const params = url.searchParams;
const product = params.get('product');
const otherView = params.has('view') && params.get('view') !== 'portfolio';
if (otherView || product === 'legacy-personal' || (!product && (params.has('project') || params.has('workflow') || url.hash))) {
  const store = params.get('store');
  url.hash = '';
  url.search = '';
  if (store) url.searchParams.set('store', store);
  history.replaceState(null, '', url);
}

import('./portfolio-app.mjs');
