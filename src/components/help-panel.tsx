import React from 'react';
import { Box, Text, useInput } from 'ink';

interface HelpPanelProps {
  onClose: () => void;
}

const shortcuts = [
  ['j/↓', 'scroll down'],
  ['k/↑', 'scroll up'],
  ['Ctrl+d/PgDn', 'half page down'],
  ['Ctrl+u/PgUp', 'half page up'],
  ['g / G', 'chapter start/end'],
  ['[ / ]', 'prev/next chapter'],
  ['t / :toc', 'table of contents'],
  ['/', 'search (n/N next/prev)'],
  [':123', 'go to line'],
  ['m / `', 'bookmark / jump'],
  ['Esc', 'cancel / close'],
  [':q', 'quit'],
  [':help', 'this panel'],
  [':open <path>', 'open file'],
  [':theme <name>', 'switch theme'],
  [':encoding <name>', 'set encoding'],
  [':set number', 'toggle line numbers'],
];

export default function HelpPanel({ onClose }: HelpPanelProps) {
  useInput((input, key) => {
    if (key.escape) onClose();
  });

  return (
    <Box flexDirection="column" padding={1} borderStyle="round">
      <Text bold inverse> Help </Text>
      <Box flexDirection="column" marginTop={1}>
        {shortcuts.map(([key, desc], idx) => (
          <Box key={idx}>
            {desc ? (
              <>
                <Box width={16}><Text bold>{key}</Text></Box>
                <Text dimColor>{desc}</Text>
              </>
            ) : (
              <Text> </Text>
            )}
          </Box>
        ))}
      </Box>
      <Box>
        <Text dimColor>Esc to close</Text>
      </Box>
    </Box>
  );
}
