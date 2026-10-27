import { useEffect } from 'react';

const SITE = 'PrepLedger';

/** Sets document title, meta description and the canonical URL (query strings other than `page` are dropped). */
export function useHead(title: string | null | undefined, opts: { description?: string; canonical?: string; noindex?: boolean } = {}) {
  useEffect(() => {
    if (!title) return;
    document.title = `${title} | ${SITE}`;
    const set = (sel: string, create: () => HTMLElement, attr: string, value: string | undefined) => {
      let el = document.head.querySelector(sel) as HTMLElement | null;
      if (!value) {
        el?.remove();
        return;
      }
      if (!el) {
        el = create();
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };
    const canonical = opts.canonical ?? window.location.pathname;
    set('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), 'href', window.location.origin + canonical);
    set('meta[name="description"]', () => Object.assign(document.createElement('meta'), { name: 'description' }), 'content', opts.description);
    set('meta[name="robots"]', () => Object.assign(document.createElement('meta'), { name: 'robots' }), 'content', opts.noindex ? 'noindex' : undefined);
  }, [title, opts.description, opts.canonical, opts.noindex]);
}
