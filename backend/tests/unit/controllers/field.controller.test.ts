import { FieldController } from '../../../controllers/field/field.controller';
import { FieldSubmissionBodyDto } from '../../../dtos/field/field.dto';
import { AuthCredentialExpiredException } from '../../../models/domain-errors';
import { FieldContextService } from '../../../services/field/field-context.service';
import { FieldSubmissionService } from '../../../services/field/field-submission.service';
import { FieldUploadService } from '../../../services/field/field-upload.service';

function aBody(): FieldSubmissionBodyDto {
  return {
    photo_keys: { before: ['a.jpg'], after: ['b.jpg'] },
    receipt_photo_key: 'r.jpg',
    latitude: null,
    longitude: null,
  };
}

function aController(
  submission: jest.Mock,
  upload: jest.Mock,
  context: jest.Mock = jest.fn(),
): FieldController {
  return new FieldController(
    { get: context } as unknown as FieldContextService,
    { submit: submission } as unknown as FieldSubmissionService,
    { issueTarget: upload } as unknown as FieldUploadService,
  );
}

describe('FieldController.context', () => {
  it('reads the field token from the X-Field-Token header', async () => {
    const context = jest.fn().mockResolvedValue({
      contract_site: 'Toà A',
      service_item: 'Vệ sinh sảnh',
      scheduled_at: '2024-10-21',
      remaining_steps: ['before_photo', 'after_photo', 'receipt_photo'],
    });
    const controller = aController(jest.fn(), jest.fn(), context);
    await controller.context('a-real-token');
    expect(context).toHaveBeenCalledWith('a-real-token');
  });
  it('rejects a request with no token header', () => {
    const context = jest.fn();
    const controller = aController(jest.fn(), jest.fn(), context);
    expect(() => controller.context(undefined as unknown as string)).toThrow(AuthCredentialExpiredException);
    expect(context).not.toHaveBeenCalled();
  });
});
describe('FieldController.submit', () => {
  it('reads the field token from the X-Field-Token header, not the URL', async () => {
    const submit = jest.fn().mockResolvedValue({ id: 1 });
    const controller = aController(submit, jest.fn());
    await controller.submit('a-real-token', aBody());
    expect(submit).toHaveBeenCalledWith('a-real-token', expect.anything());
  });
  it('rejects a request with no token header', async () => {
    const submit = jest.fn();
    const controller = aController(submit, jest.fn());
    expect(() => controller.submit(undefined as unknown as string, aBody())).toThrow(
      AuthCredentialExpiredException,
    );
    expect(submit).not.toHaveBeenCalled();
  });
});
describe('FieldController.issueUploadTarget', () => {
  it('reads the field token from the X-Field-Token header and passes the content type through', async () => {
    const upload = jest.fn().mockResolvedValue({ upload_url: 'https://signed', key: 'uploads/1/2/x.jpg' });
    const controller = aController(jest.fn(), upload);
    await controller.issueUploadTarget('a-real-token', { content_type: 'image/jpeg' });
    expect(upload).toHaveBeenCalledWith('a-real-token', 'image/jpeg');
  });
  it('rejects a request with no token header', () => {
    const upload = jest.fn();
    const controller = aController(jest.fn(), upload);
    expect(() =>
      controller.issueUploadTarget(undefined as unknown as string, { content_type: 'image/jpeg' }),
    ).toThrow(AuthCredentialExpiredException);
    expect(upload).not.toHaveBeenCalled();
  });
});
