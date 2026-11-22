import { fromBinary } from '@bufbuild/protobuf';
import {
  OrderUpdateType,
  OrderUpdatedSchema,
} from '@p2p-energy-trading-platform/typescript-sdk/gen/gridx/order/v1/order_update_events_pb';
import { TradeExecutedSchema } from '@p2p-energy-trading-platform/typescript-sdk/gen/gridx/trade/v1/trade_events_pb';

import type { AppConfig } from '../config/types.js';
import { InvalidRecordError } from './errors.js';
import type { ConsumedRecord, DomainEvent } from './types.js';

type Decoder = (value: Uint8Array) => DomainEvent;

function decodeProtobuf<T>(decode: () => T): T {
  try {
    return decode();
  } catch (error) {
    throw new InvalidRecordError(`Cannot decode protobuf: ${(error as Error).message}`);
  }
}

function requireFields(fields: Record<string, string>): void {
  const missing = Object.entries(fields)
    .filter(([, value]) => value === '')
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new InvalidRecordError(`Missing required fields: ${missing.join(', ')}`);
  }
}

const decodeTradeExecuted: Decoder = (value) => {
  const payload = decodeProtobuf(() => fromBinary(TradeExecutedSchema, value));

  requireFields({
    event_id: payload.eventId,
    buyer_user_id: payload.buyerUserId,
    seller_user_id: payload.sellerUserId,
  });

  return { name: 'trade.executed', eventId: payload.eventId, payload };
};

const decodeOrderUpdated: Decoder = (value) => {
  const payload = decodeProtobuf(() => fromBinary(OrderUpdatedSchema, value));

  requireFields({ event_id: payload.eventId, user_id: payload.userId });

  if (payload.eventType === OrderUpdateType.UNSPECIFIED) {
    throw new InvalidRecordError('event_type is UNSPECIFIED');
  }

  // e.g. OrderUpdateType.PARTIALLY_FILLED -> 'order.partially_filled'
  const type = (OrderUpdateType[payload.eventType] ?? `unknown_${payload.eventType}`).toLowerCase();

  return { name: `order.${type}`, eventId: payload.eventId, payload };
};

export function createDecoders(config: AppConfig): Map<string, Decoder> {
  return new Map([
    [config.KAFKA_TRADE_EXECUTED_TOPIC, decodeTradeExecuted],
    [config.KAFKA_ORDER_STATE_TOPIC, decodeOrderUpdated],
  ]);
}

export function decodeRecord(
  decoders: Map<string, Decoder>,
  record: ConsumedRecord,
): DomainEvent | undefined {
  const decoder = decoders.get(record.topic);

  if (!decoder) {
    return undefined;
  }

  if (!record.value || record.value.length === 0) {
    throw new InvalidRecordError('Empty record value');
  }

  return decoder(record.value);
}
