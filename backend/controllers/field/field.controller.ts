import { Body, Controller, Headers, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FieldSubmissionBodyDto } from '../../dtos/field/field.dto';
import { ShiftView } from '../../dtos/shifts/shifts.response.dto';
import { AuthCredentialExpiredException } from '../../models/domain-errors';
import { Public } from '../../services/access-control/access.decorator';
import {
  FieldSubmissionCommand,
  FieldSubmissionService,
} from '../../services/field/field-submission.service';
@Controller('field')
export class FieldController {
  constructor(private readonly fieldSubmissionService: FieldSubmissionService) {}
  @Post('submit')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  submit(
    @Headers('x-field-token')
    token: string,
    @Body()
    body: FieldSubmissionBodyDto,
  ): Promise<ShiftView> {
    if (token === undefined || token === '') {
      throw new AuthCredentialExpiredException();
    }
    return this.fieldSubmissionService.submit(token, toCommand(body));
  }
}
function toCommand(body: FieldSubmissionBodyDto): FieldSubmissionCommand {
  return {
    photoKeys: { before: body.photo_keys.before, after: body.photo_keys.after },
    receiptPhotoKey: body.receipt_photo_key,
    latitude: body.latitude ?? null,
    longitude: body.longitude ?? null,
  };
}
