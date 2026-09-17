import { Body, Controller, Param, Post } from '@nestjs/common';
import { FieldSubmissionBodyDto } from '../DTOs/field.dto';
import { Public } from '../Services/AccessControl/access.decorator';
import { FieldSubmissionCommand, FieldSubmissionService } from '../Services/field-submission.service';
import { ShiftView } from '../Services/dispatch.service';

/**
 * Token-only — every route here is `@Public()` at the guard level (D3), never gated by
 * `AccessControlGuard`; the signed per-shift token in the URL is the whole authorization
 * (`03-architecture.md` §8.1).
 */
@Controller('field')
export class FieldController {
  constructor(private readonly fieldSubmissionService: FieldSubmissionService) {}

  @Post(':token/submit')
  @Public()
  submit(@Param('token') token: string, @Body() body: FieldSubmissionBodyDto): Promise<ShiftView> {
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
