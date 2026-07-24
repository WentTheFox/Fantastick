import { describe, expect, it } from 'vitest';
import { parseTelegramPackName } from './parse-telegram-pack-name.js';

describe('parseTelegramPackName', () => {
  it('should extract the pack name from a valid URL', () => {
    expect(parseTelegramPackName('https://t.me/addstickers/my_pack')).toEqual('my_pack');
  });

  it('should decode URL-encoded pack names', () => {
    expect(parseTelegramPackName('https://t.me/addstickers/my%20pack')).toEqual('my pack');
  });

  it('should reject URLs without the expected prefix', () => {
    expect(parseTelegramPackName('https://example.com/addstickers/my_pack')).toBeNull();
  });

  it('should reject pack names containing slashes or parentheses', () => {
    expect(parseTelegramPackName('https://t.me/addstickers/my/pack')).toBeNull();
    expect(parseTelegramPackName('https://t.me/addstickers/my(pack)')).toBeNull();
  });

  it('should reject an empty pack name', () => {
    expect(parseTelegramPackName('https://t.me/addstickers/')).toBeNull();
  });
});
