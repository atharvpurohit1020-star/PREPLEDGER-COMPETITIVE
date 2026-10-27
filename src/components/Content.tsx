import { memo, useMemo } from 'react';
import { renderContent } from '../../shared/content';
import type { DiagramRef } from '../../shared/types';

interface Props {
  src: string | null | undefined;
  diagrams?: Record<string, DiagramRef>;
  className?: string;
  as?: 'div' | 'span';
}

/** Renders PrepLedger markup (Markdown subset + KaTeX). Output is escaped by renderContent. */
export const Content = memo(function Content({ src, diagrams, className, as = 'div' }: Props) {
  const html = useMemo(() => renderContent(src ?? '', { diagrams }), [src, diagrams]);
  const Tag = as;
  return <Tag className={`content ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: html }} />;
});
