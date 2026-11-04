/**
 * El dev server y la API comparten prefijos (`/cases`, `/documents`, …).
 * Una recarga o el botón atrás piden el HTML de esa URL. Sin este bypass el
 * proxy se la entrega a la API y el navegador muestra `{"detail":"No autenticado"}`.
 * Las llamadas `fetch` no traen `text/html` ni `Sec-Fetch-Dest: document`, así que siguen yendo a :8000.
 */
const API_PREFIXES = [
  '/auth',
  '/me',
  '/users',
  '/email-integrations',
  '/documents',
  '/cases',
  '/case-messages',
  '/case-folders',
  '/case-files',
  '/party-identifiers',
  '/dashboard',
  '/alerts',
  '/health',
];

const TARGET = {
  target: 'http://127.0.0.1:8000',
  secure: false,
  changeOrigin: true,
  bypass(req) {
    const url = req.url ?? '';
    if (/^\/email-integrations\/[^/]+\/callback(?:\?|$)/.test(url)) {
      return undefined;
    }
    const accept = req.headers.accept ?? '';
    const navigation =
      req.headers['sec-fetch-dest'] === 'document' ||
      req.headers['sec-fetch-mode'] === 'navigate' ||
      accept.includes('text/html');
    return navigation ? '/index.html' : undefined;
  },
};

module.exports = API_PREFIXES.map((context) => ({ context: [context], ...TARGET }));
