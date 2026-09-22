import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FieldSubmissionBodyDto, FieldUploadBodyDto } from '../../dtos/field/field.dto';
import { FieldContextView, UploadTargetView } from '../../dtos/field/field.response.dto';
import { ShiftView } from '../../dtos/shifts/shifts.response.dto';
import { AuthCredentialExpiredException } from '../../models/domain-errors';
import { Public } from '../../services/access-control/access.decorator';
import { FieldContextService } from '../../services/field/field-context.service';
import {
  FieldSubmissionCommand,
  FieldSubmissionService,
} from '../../services/field/field-submission.service';
import { FieldUploadService } from '../../services/field/field-upload.service';

@Controller('field')
export class FieldController {
  constructor(
    private readonly fieldContextService: FieldContextService,
    private readonly fieldSubmissionService: FieldSubmissionService,
    private readonly fieldUploadService: FieldUploadService,
  ) {}

  @Get('context')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  context(
    @Headers('x-field-token')
    token: string,
  ): Promise<FieldContextView> {
    if (token === undefined || token === '') {
      throw new AuthCredentialExpiredException();
    }

    return this.fieldContextService.get(token);
  }

  @Post('uploads')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  issueUploadTarget(
    @Headers('x-field-token')
    token: string,
    @Body()
    body: FieldUploadBodyDto,
  ): Promise<UploadTargetView> {
    if (token === undefined || token === '') {
      throw new AuthCredentialExpiredException();
    }

    return this.fieldUploadService.issueTarget(token, body.content_type);
  }

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
