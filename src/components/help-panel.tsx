import React from 'react';
import { Box, Text, useInput } from 'ink';

interface HelpPanelProps {
  onClose: () => void;
}

export default function HelpPanel({ onClose }: HelpPanelProps) {
  useInput((input, key) => {
    if (key.escape || input === 'q') onClose();
  });

  const shortcuts = [
    ['j / ↓', 'Scroll down'],
    ['k / ↑', 'Scroll up'],
    ['Ctrl+d / PgDn', 'Half page down'],
    ['Ctrl+u / PgUp', 'Half page up'],
    ['g', 'Go to start'],
    ['G', 'Go to end'],
    [':N', 'Go to line N'],
    ['n / N', 'Next / Previous search result'],
    ['t', 'Open table of contents'],
    ['[ / ]', 'Previous / Next chapter'],
    ['/', 'Search'],
    [':', 'Command mode'],
    ['Esc', 'Cancel / Close panel'],
    ['m / `', 'Set bookmark / Jump to bookmark'],
    ['', ''],
    ['Commands', ''],
    [':q', 'Quit / Go back'],
    [':open <path>', 'Open file'],
    [':help', 'Show this help'],
    [':theme <name>', 'Switch theme'],
    [':encoding <name>', 'Set encoding'],
    [':set number', 'Toggle line numbers'],
  ];

  return (
    <Box flexDirection="column" padding={1} borderStyle="round">
      <Text bold inverse> Help </Text>
      <Box flexDirection="column" marginTop={1}>
        {shortcuts.map(([key, desc], idx) => (
          <Box key={idx}>
            <Box width={20}><Text bold>{key}</Text></Box>
            <Text>{desc}</Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press Esc or q to close</Text>
      </Box>
    </Box>
  );
}
