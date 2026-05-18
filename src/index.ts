import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import App from './app.js';
import { getHistory } from './utils/storage.js';

// Enter alternate screen buffer before Ink's first render
process.stdout.write('\x1b[?1049h');
process.on('exit', () => {
  process.stdout.write('\x1b[?1049l');
});

const program = new Command();

program
  .name('novel')
  .description('Terminal novel reader')
  .argument('[file]', 'path to .txt file')
  .option('--resume', 'resume from last reading position')
  .option('--encoding <encoding>', 'file encoding (utf-8 or gbk)')
  .option('--browse', 'open file browser')
  .action((file: string | undefined, options: { resume?: boolean; encoding?: string; browse?: boolean }) => {
    const initialFile = options.resume ? (getHistory()[0]?.path ?? null) : (file ?? null);

    const showBookshelf = !file && !options.resume;

    const { waitUntilExit } = render(
      React.createElement(App, {
        initialFile,
        encoding: options.encoding,
        showBookshelf,
        initialBrowse: !!options.browse,
      })
    );

    waitUntilExit().then(() => {
      process.exit(0);
    });
  });

program.parse(process.argv);
