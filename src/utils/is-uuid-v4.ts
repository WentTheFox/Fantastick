const uuidV4regex = /^[\dA-F]{8}-[\dA-F]{4}-4[\dA-F]{3}-[89AB][\dA-F]{3}-[\dA-F]{12}$/i;

export const isUuidV4 = (input: string) => uuidV4regex.test(input);
