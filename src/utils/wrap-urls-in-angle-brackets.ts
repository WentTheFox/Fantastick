export const urlPattern = /https?:\/\/\S+/g;

export const wrapUrlsInAngleBrackets = (text: string): string => text.replace(urlPattern, '<$&>');
