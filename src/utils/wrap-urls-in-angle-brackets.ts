export const urlPattern = /(\(+)?(https?:\/\/[^()\s']+)(\)+)?/g;

export const wrapUrlsInAngleBrackets = (text: string): string => text.replace(urlPattern, '$1<$2>$3');
