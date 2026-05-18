export interface ParsedCommand {
  action: 'quit' | 'open' | 'goto' | 'search' | 'help' | 'theme' | 'encoding' | 'set' | 'unknown';
  args: string[];
  raw: string;
}

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.startsWith(':') ? input.slice(1).trim() : input.trim();
  const parts = trimmed.split(/\s+/);
  const cmd = parts[0]?.toLowerCase() || '';

  switch (cmd) {
    case 'q':
    case 'quit':
    case 'exit':
      return { action: 'quit', args: [], raw: trimmed };

    case 'open':
    case 'e':
    case 'edit':
      return { action: 'open', args: parts.slice(1), raw: trimmed };

    case 'help':
      return { action: 'help', args: [], raw: trimmed };

    case 'theme':
      return { action: 'theme', args: parts.slice(1), raw: trimmed };

    case 'encoding':
      return { action: 'encoding', args: parts.slice(1), raw: trimmed };

    case 'set':
      return { action: 'set', args: parts.slice(1), raw: trimmed };

    default: {
      if (/^\d+$/.test(cmd)) {
        return { action: 'goto', args: [cmd], raw: trimmed };
      }
      if (cmd.startsWith('/')) {
        return { action: 'search', args: [cmd.slice(1), ...parts.slice(1)], raw: trimmed };
      }
      return { action: 'unknown', args: parts, raw: trimmed };
    }
  }
}

export function getCompletions(input: string): string[] {
  const trimmed = input.startsWith(':') ? input.slice(1) : input;
  const commands = ['q', 'quit', 'open', 'help', 'theme', 'encoding', 'set number'];
  if (!trimmed) return commands.map(c => `:${c}`);
  return commands.filter(c => c.startsWith(trimmed)).map(c => `:${c}`);
}
