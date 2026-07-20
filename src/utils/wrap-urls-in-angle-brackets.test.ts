import { describe, expect, it } from 'vitest';
import { wrapUrlsInAngleBrackets } from './wrap-urls-in-angle-brackets.js';

describe('wrapUrlsInAngleBrackets', () => {
  it('should leave text without URLs unchanged', () => {
    expect(wrapUrlsInAngleBrackets('just a regular name')).toEqual('just a regular name');
  });

  it('should wrap http and https URLs', () => {
    expect(wrapUrlsInAngleBrackets('see http://example.com and https://example.org/page?a=1'))
      .toEqual('see <http://example.com> and <https://example.org/page?a=1>');
  });

  it('should wrap multiple URLs independently', () => {
    expect(wrapUrlsInAngleBrackets('https://a.example https://b.example'))
      .toEqual('<https://a.example> <https://b.example>');
  });
});
