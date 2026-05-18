import React from 'react';
import { Box, Text } from 'ink';
import { getCompletions } from '../utils/commands.js';

interface CommandBarProps {
  input: string;
}

export default function CommandBar({ input }: CommandBarProps) {
  const completions = getCompletions(input);
  const display = input || 'Enter command...';

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold color="cyan">:</Text>
        <Text>{display}</Text>
      </Box>
      {completions.length > 0 && (
        <Text dimColor>
          {' '}{completions.join('  ')}
        </Text>
      )}
    </Box>
  );
}
