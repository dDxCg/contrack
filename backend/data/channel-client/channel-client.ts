import { AlertDeliveryStatus } from '../../models/alerts/alert.entity';
export interface ChannelClient {
  send(message: string): Promise<AlertDeliveryStatus>;
}
export const CHANNEL_CLIENT = Symbol('CHANNEL_CLIENT');
