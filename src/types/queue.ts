import { WorkHandler } from 'pg-boss/dist/types.js';

export enum QueueType {
  UpdateMessage = 'update-message',
}

export interface QueueReqData {
  [QueueType.UpdateMessage]: {
    channelId: string;
    stickerId: string;
    messageId: string;
    interactionId: string | null;
    interactionToken: string | null;
    action: 'delete' | 'update';
    newUrl?: string;
    description?: string;
  };
}

export type QueueHandler<Type extends QueueType> = WorkHandler<QueueReqData[Type], void>;
