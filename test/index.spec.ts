import generateData from '../src/index';

describe('Avro mock data generator', () => {
  it('can parse a basic schema', () => {
    const result = generateData({
      type: 'record',
      fields: [{ name: 'nbChickens', type: 'int' }],
    });
    expect(result).toEqual({ nbChickens: expect.any(Number) });
  });

  it('throws when encountering an unknown type', () => {
    const schema = {
      type: 'record',
      fields: [{ name: 'nbChickens', type: '3rd Kind' }],
    };

    expect(() => generateData(schema)).toThrow('Unknown type');
  });
});
