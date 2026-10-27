import { useEffect, useRef, useState } from 'react';

/** Global diagram zoom: any `.zoomable[data-zoom-src]` button rendered by Content opens this viewer. */
export function Lightbox() {
  const [img, setImg] = useState<{ src: string; alt: string } | null>(null);
  const [scale, setScale] = useState(1.5);
  const closeRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest('.zoomable[data-zoom-src]') as HTMLElement | null;
      if (!el) return;
      e.preventDefault();
      opener.current = el;
      setScale(1.5);
      setImg({ src: el.dataset.zoomSrc!, alt: el.dataset.zoomAlt ?? '' });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  useEffect(() => {
    if (!img) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === '+' || e.key === '=') setScale((s) => Math.min(4, s + 0.25));
      if (e.key === '-') setScale((s) => Math.max(0.5, s - 0.25));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [img]);
  const close = () => {
    setImg(null);
    opener.current?.focus();
  };
  if (!img) return null;
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Diagram viewer" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="lightbox">
        <div className="lightbox-bar">
          <button className="btn btn-sm" onClick={() => setScale((s) => Math.max(0.5, s - 0.25))} aria-label="Zoom out">−</button>
          <span className="btn btn-sm" aria-live="polite">{Math.round(scale * 100)}%</span>
          <button className="btn btn-sm" onClick={() => setScale((s) => Math.min(4, s + 0.25))} aria-label="Zoom in">+</button>
          <button className="btn btn-sm" onClick={() => setScale(1)}>Reset</button>
          <button className="btn btn-sm" ref={closeRef} onClick={close} aria-label="Close diagram viewer">Close ✕</button>
        </div>
        <img src={img.src} alt={img.alt} style={{ width: `${scale * 100}%`, minWidth: 200 * scale }} />
        <p>{img.alt}</p>
      </div>
    </div>
  );
}
