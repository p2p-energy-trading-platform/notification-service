import type { ConsumedRecord } from './types.js';

export interface DlqMessage {
  key: Buffer | null;
  value: Buffer | null;
  headers: Record<string, string>;
}

export interface DlqPublisher {
  publish(record: ConsumedRecord, error: Error): Promise<void>;
}

export function toDlqMessage(record: ConsumedRecord, error: Error): DlqMessage {
  return {
    key: record.key,
    value: record.value,
    headers: {
      ...record.headers,
      'x-error': error.message,
      'x-source-topic': record.topic,
      'x-source-partition': String(record.partition),
      'x-source-offset': record.offset,
    },
  };
}
