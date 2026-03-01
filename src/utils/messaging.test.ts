import { ComponentType, TopLevelComponent } from 'discord.js';
import { describe, expect, it } from 'vitest';
import {
  EmbedTextData,
  findEmbedsTextFields,
  findTextComponentContentsRecursively,
} from './messaging.js';

describe('messaging', () => {
  const text1 = 'text1';
  const text2 = 'text2';
  const text3 = 'text3';
  const text4 = 'text4';
  const text5 = 'text5';
  const text6 = 'text6';

  describe('findEmbedsTextFields', () => {
    it('should extract contents from embeds correctly', () => {
      const embeds: EmbedTextData[] = [
        {
          title: text1,
          description: text3,
          footer: {
            text: text4,
          },
          fields: [
            {
              name: text2,
              value: text5,
            },
          ],
        },
        {
          description: text6,
        },
      ];

      const result = findEmbedsTextFields(embeds);
      expect(result).toEqual([
        text1,
        text3,
        text4,
        text2,
        text5,
        text6,
      ]);
    });
  });

  describe('findTextComponentContentsRecursively', () => {
    it('should extract contents from text components correctly', () => {
      const components = [
        {
          type: ComponentType.TextDisplay,
          content: text1,
        },
        {
          type: ComponentType.Section,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: text3,
            },
          ],
        },
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: text4,
            },
            {
              type: ComponentType.TextDisplay,
              content: text5,
            },
          ],
        },
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: text6,
            },
          ],
        },
      ] as TopLevelComponent[];

      const result = findTextComponentContentsRecursively(components);
      expect(result).toEqual([
        text1,
        text3,
        text4,
        text5,
        text6,
      ]);
    });
  });
});
