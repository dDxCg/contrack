import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FieldSubmissionBodyDto, FieldUploadBodyDto } from '../../../dtos/field/field.dto';

function aBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    photo_keys: { before: ['shifts/1/before-1.jpg'], after: ['shifts/1/after-1.jpg'] },
    receipt_photo_key: 'shifts/1/receipt.jpg',
    latitude: 10.762622,
    longitude: 106.660172,
    ...overrides,
  };
}

async function errorsFor(body: Record<string, unknown>): Promise<string[]> {
  const instance = plainToInstance(FieldSubmissionBodyDto, body);
  const errors = await validate(instance);

  return errors.map((error) => error.property);
}

describe('FieldSubmissionBodyDto', () => {
  it('accepts a well-formed submission', async () => {
    expect(await errorsFor(aBody())).toEqual([]);
  });
  it('rejects a photo key longer than the bound', async () => {
    const errors = await errorsFor(
      aBody({ photo_keys: { before: ['a'.repeat(501)], after: ['shifts/1/after-1.jpg'] } }),
    );
    expect(errors).toContain('photo_keys');
  });
  it('rejects a photo key with shell/path-traversal characters', async () => {
    const errors = await errorsFor(
      aBody({ photo_keys: { before: ['../../etc/passwd'], after: ['shifts/1/after-1.jpg'] } }),
    );
    expect(errors).toContain('photo_keys');
  });
  it('rejects more photo keys than the per-shift bound', async () => {
    const errors = await errorsFor(
      aBody({
        photo_keys: { before: Array.from({ length: 21 }, (_, i) => `shifts/1/b${i}.jpg`), after: [] },
      }),
    );
    expect(errors).toContain('photo_keys');
  });
  it('rejects a receipt key outside the shape bound', async () => {
    expect(await errorsFor(aBody({ receipt_photo_key: 'a'.repeat(501) }))).toContain('receipt_photo_key');
  });
  it('rejects a latitude out of range', async () => {
    expect(await errorsFor(aBody({ latitude: 91 }))).toContain('latitude');
    expect(await errorsFor(aBody({ latitude: -91 }))).toContain('latitude');
  });
  it('rejects a longitude out of range', async () => {
    expect(await errorsFor(aBody({ longitude: 181 }))).toContain('longitude');
    expect(await errorsFor(aBody({ longitude: -181 }))).toContain('longitude');
  });
  it('still allows an absent latitude/longitude — GPS capture can fail on-device', async () => {
    expect(await errorsFor(aBody({ latitude: null, longitude: null }))).toEqual([]);
  });
  it('still allows an empty receipt_photo_key — the service reports it as missing evidence, not a shape error', async () => {
    expect(await errorsFor(aBody({ receipt_photo_key: '' }))).toEqual([]);
  });
});
describe('FieldUploadBodyDto', () => {
  async function uploadErrorsFor(body: Record<string, unknown>): Promise<string[]> {
    const instance = plainToInstance(FieldUploadBodyDto, body);
    const errors = await validate(instance);

    return errors.map((error) => error.property);
  }

  it('accepts an image content type', async () => {
    expect(await uploadErrorsFor({ content_type: 'image/jpeg' })).toEqual([]);
  });
  it('rejects a missing content type', async () => {
    expect(await uploadErrorsFor({})).toContain('content_type');
  });
  it('rejects a content type that is not an image', async () => {
    expect(await uploadErrorsFor({ content_type: 'application/pdf' })).toContain('content_type');
  });
  it('rejects a content type carrying extra characters', async () => {
    expect(await uploadErrorsFor({ content_type: 'image/jpeg; rm -rf /' })).toContain('content_type');
  });
});
