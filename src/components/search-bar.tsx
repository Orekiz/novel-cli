import React from 'react';
import { Box, Text } from 'ink';

interface SearchBarProps {
  query: string;
}

export default function SearchBar({ query }: SearchBarProps) {
  const display = query || 'Search...';

  return (
    <Box>
      <Text bold color="cyan">/</Text>
      <Text>{display}</Text>
      <Text color="gray">  (Esc to cancel)</Text>
    </Box>
  );
}
