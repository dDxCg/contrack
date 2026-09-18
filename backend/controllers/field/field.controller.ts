import { Body, Controller, Param, Post } from '@nestjs/common';
import { FieldSubmissionBodyDto } from '../../dtos/field/field.dto';
import { ShiftView } from '../../dtos/shifts/shifts.response.dto';
import { Public } from '../../services/access-control/access.decorator';
import {
  FieldSubmissionCommand,
  FieldSubmissionService,
} from '../../services/field/field-submission.service';

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
