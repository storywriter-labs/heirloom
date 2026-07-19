// CloudFront Function (viewer-request): map the clean URLs the app links to
// onto the files a Next.js static export actually emits.
//   /            -> handled by default_root_object (index.html)
//   /login       -> /login.html
//   /dashboard/  -> /dashboard.html
//   /_next/...   -> untouched (has a file extension)
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith('/') && uri !== '/') {
    uri = uri.slice(0, -1);
  }

  var lastSegment = uri.split('/').pop();
  if (uri !== '/' && !lastSegment.includes('.')) {
    uri = uri + '.html';
  }

  request.uri = uri;
  return request;
}
