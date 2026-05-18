import React from 'react';
import { Box, Text } from 'ink';

interface VisibleLine {
  text: string;
  logicalLine: number;
  isHighlighted: boolean;
}

interface TextViewerProps {
  lines: VisibleLine[];
  showLineNumbers: boolean;
  highlightColor: string;
  searchMatches: number[];
  currentMatch: number;
}

export default function TextViewer({ lines, showLineNumbers, highlightColor }: TextViewerProps) {
  return (
    <Box flexDirection="column" paddingX={1} paddingY={0}>
      {lines.map((line, idx) => (
        <Box key={idx}>
          {showLineNumbers && (
            <Text color="gray" dimColor>
              {String(line.logicalLine).padStart(5, ' ')} {' '}
            </Text>
          )}
          <Text color={line.isHighlighted ? highlightColor : undefined}>
            {line.text || ' '}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
