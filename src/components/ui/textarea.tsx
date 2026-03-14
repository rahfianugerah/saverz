import * as React from 'react';
import { cn } from '../../lib/utils';

function emitTextareaInput(element: HTMLTextAreaElement, nextValue: string, selectionStart: number, selectionEnd: number) {
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
  nativeSetter?.call(element, nextValue);
  element.setSelectionRange(selectionStart, selectionEnd);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

function handleTabIndent(event: React.KeyboardEvent<HTMLTextAreaElement>, tabText: string) {
  if (event.key !== 'Tab') return;

  event.preventDefault();

  const textarea = event.currentTarget;
  const value = textarea.value;
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? start;
  const blockStart = value.lastIndexOf('\n', start - 1) + 1;

  if (!event.shiftKey && start === end) {
    const next = `${value.slice(0, start)}${tabText}${value.slice(end)}`;
    const nextCaret = start + tabText.length;
    emitTextareaInput(textarea, next, nextCaret, nextCaret);
    return;
  }

  const block = value.slice(blockStart, end);
  const lines = block.split('\n');

  if (event.shiftKey) {
    let removedAtStartLine = 0;
    let totalRemoved = 0;

    const outdented = lines.map((line, lineIndex) => {
      let removeCount = 0;

      if (line.startsWith(tabText)) {
        removeCount = tabText.length;
      } else if (line.startsWith('\t')) {
        removeCount = 1;
      } else {
        const leadingSpaceMatch = line.match(/^ {1,4}/);
        removeCount = leadingSpaceMatch ? leadingSpaceMatch[0].length : 0;
      }

      if (lineIndex === 0) {
        removedAtStartLine = Math.min(removeCount, start - blockStart);
      }

      totalRemoved += removeCount;
      return line.slice(removeCount);
    });

    const next = `${value.slice(0, blockStart)}${outdented.join('\n')}${value.slice(end)}`;
    const nextStart = Math.max(blockStart, start - removedAtStartLine);
    const nextEnd = Math.max(nextStart, end - totalRemoved);
    emitTextareaInput(textarea, next, nextStart, nextEnd);
    return;
  }

  const indented = lines.map((line) => `${tabText}${line}`);
  const next = `${value.slice(0, blockStart)}${indented.join('\n')}${value.slice(end)}`;
  const nextStart = start + tabText.length;
  const nextEnd = end + tabText.length * lines.length;
  emitTextareaInput(textarea, next, nextStart, nextEnd);
}

type TextareaProps = React.ComponentProps<'textarea'> & {
  tabSize?: 2 | 4;
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onKeyDown, tabSize = 2, ...props }, ref) => {
    const tabText = ' '.repeat(tabSize);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;
      handleTabIndent(event, tabText);
    };

    return (
      <textarea
        className={cn(
          'flex min-h-[88px] w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        onKeyDown={handleKeyDown}
        ref={ref}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
