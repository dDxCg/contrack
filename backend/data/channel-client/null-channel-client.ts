import { Injectable } from '@nestjs/common';
import { AlertDeliveryStatus } from '../../models/alerts/alert.entity';
import { ChannelClient } from './channel-client';
@Injectable()
export class NullChannelClient implements ChannelClient {
  async send(): Promise<AlertDeliveryStatus> {
    return AlertDeliveryStatus.NotSent;
  }
}
