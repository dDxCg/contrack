import { pageOf } from '../../../dtos/page.dto';

describe('pageOf', () => {
  it('assembles the same envelope shape every list endpoint returns', () => {
    expect(pageOf(['a', 'b'], 5, { limit: 20, offset: 0 })).toEqual({
      items: ['a', 'b'],
      total: 5,
      limit: 20,
      offset: 0,
    });
  });
});
