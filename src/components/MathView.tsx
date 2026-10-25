/**
 * MathView - Compiled Mathematical Typography via KaTeX
 * Renders LaTeX equations visually as true textbook mathematical typography.
 */

import React, { useMemo } from 'react';
import katex from 'katex';

interface MathBlockProps {
  math: string;
  className?: string;
  displayMode?: boolean;
}

export const MathBlock: React.FC<MathBlockProps> = ({
  math,
  className = '',
  displayMode = true,
}) => {
  const html = useMemo(() => {
    try {
      // Clean up common quirks
      const cleaned = math.trim();
      return katex.renderToString(cleaned, {
        displayMode,
        throwOnError: false,
        output: 'htmlAndMathml',
      });
    } catch (err) {
      return `<span class="text-rose-500 font-mono text-xs">${math}</span>`;
    }
  }, [math, displayMode]);

  return (
    <div
      className={`overflow-x-auto py-1 scrollbar-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

/**
 * Parses a string containing inline `$math$` delimiters or `**bold**` text and compiles the math.
 */
export const MathText: React.FC<{ text: string; className?: string }> = ({
  text,
  className = '',
}) => {
  const renderedContent = useMemo(() => {
    if (!text) return null;

    // Split text by $...$
    const parts = text.split(/(\$[^$]+\$)/g);

    return parts.map((part, idx) => {
      if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
        const mathContent = part.slice(1, -1);
        try {
          const html = katex.renderToString(mathContent, {
            displayMode: false,
            throwOnError: false,
          });
          return (
            <span
              key={idx}
              className="inline-math inline-block align-baseline mx-0.5"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <span key={idx}>{part}</span>;
        }
      }

      // Handle bold formatting **bold**
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((bp, bIdx) => {
        if (bp.startsWith('**') && bp.endsWith('**') && bp.length > 4) {
          return (
            <strong key={`${idx}-${bIdx}`} className="font-bold">
              {bp.slice(2, -2)}
            </strong>
          );
        }
        return <span key={`${idx}-${bIdx}`}>{bp}</span>;
      });
    });
  }, [text]);

  return <div className={className}>{renderedContent}</div>;
};
