import iconv from 'iconv-lite';
import fs from 'node:fs';

export type Encoding = 'utf-8' | 'gbk';

export function detectEncoding(buffer: Buffer): Encoding {
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return 'utf-8';
  }
  const utf8Str = buffer.toString('utf-8');
  if (!utf8Str.includes('�') && !utf8Str.includes('￾')) {
    return 'utf-8';
  }
  return 'gbk';
}

export function readFileLines(filePath: string, enc?: Encoding): string[] {
  const buffer = fs.readFileSync(filePath);
  const encoding = enc || detectEncoding(buffer);
  const content = iconv.decode(buffer, encoding);
  return content.split(/\r?\n/);
}
