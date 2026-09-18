import { FieldController } from '../../../controllers/field/field.controller';
import { FieldSubmissionBodyDto } from '../../../dtos/field/field.dto';
import { AuthCredentialExpiredException } from '../../../models/domain-errors';
import { FieldSubmissionService } from '../../../services/field/field-submission.service';
function aBody(): FieldSubmissionBodyDto {
  return {
    photo_keys: { before: ['a.jpg'], after: ['b.jpg'] },
    receipt_photo_key: 'r.jpg',
    latitude: null,
    longitude: null,
  };
}
describe('FieldController.submit', () => {
  it('reads the field token from the X-Field-Token header, not the URL', async () => {
    const submit = jest.fn().mockResolvedValue({ id: 1 });
    const controller = new FieldController({ submit } as unknown as FieldSubmissionService);
    await controller.submit('a-real-token', aBody());
    expect(submit).toHaveBeenCalledWith('a-real-token', expect.anything());
  });
  it('rejects a request with no token header', async () => {
    const submit = jest.fn();
    const controller = new FieldController({ submit } as unknown as FieldSubmissionService);
    expect(() => controller.submit(undefined as unknown as string, aBody())).toThrow(
      AuthCredentialExpiredException,
    );
    expect(submit).not.toHaveBeenCalled();
  });
});
