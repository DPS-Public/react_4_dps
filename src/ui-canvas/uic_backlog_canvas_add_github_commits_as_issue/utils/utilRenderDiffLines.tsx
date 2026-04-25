import React from 'react';

/**
 * Converts a raw unified diff string into an array of styled <div> elements.
 * Color rules:
 *   + lines  → green  (additions)
 *   - lines  → red    (deletions)
 *   @@ lines → gray   (context headers)
 *   rest     → muted  (unchanged context)
 *
 * Pure presentational utility — no state, no side effects.
 * Used by CommitCodeModal and FileChangesModal.
 */
export const renderDiffLines = (code: string): React.ReactElement[] =>
    code.split('\n').map((line, index) => {
        const isAdded   = line.startsWith('+') && !line.startsWith('+++');
        const isRemoved = line.startsWith('-') && !line.startsWith('---');
        const isContext = line.startsWith(' ') || line.startsWith('@@');

        return (
            <div
                key={index}
                style={{
                    padding: '2px 8px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    backgroundColor: isAdded
                        ? 'rgba(0,128,0,0.15)'
                        : isRemoved
                            ? 'rgba(255,0,0,0.15)'
                            : 'transparent',
                    color: isAdded
                        ? '#4ade80'
                        : isRemoved
                            ? '#f87171'
                            : isContext
                                ? '#d1d5db'
                                : '#9ca3af',
                }}
            >
                {line || '\u00A0'}
            </div>
        );
    });
