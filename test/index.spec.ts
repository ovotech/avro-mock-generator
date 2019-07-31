import generateData from '../src/index';

describe('Avro mock data generator', () => {
  it('supports all avro primitive types', () => {
    const result = generateData({
      type: 'record',
      fields: [
        { name: 'int', type: 'int' },
        { name: 'long', type: 'long' },
        { name: 'double', type: 'double' },
        { name: 'float', type: 'float' },
        { name: 'boolean', type: 'boolean' },
        { name: 'null', type: 'null' },
        { name: 'string', type: 'string' },
        { name: 'bytes', type: 'bytes' },
      ],
    });

    expect(result).toMatchObject({ int: expect.any(Number) });
    expect(result).toMatchObject({ float: expect.any(Number) });
    expect(result).toMatchObject({ double: expect.any(Number) });
    expect(result).toMatchObject({ long: expect.any(Number) });
    expect(result).toMatchObject({ boolean: expect.any(Boolean) });
    expect(result).toMatchObject({ string: expect.any(String) });
    expect(result).toMatchObject({ null: null });
    expect(result).toMatchObject({ bytes: expect.any(Buffer) });
  });

  it('can parse a basic schema', () => {
    const result = generateData({
      type: 'record',
      fields: [{ name: 'nbChickens', type: 'int' }],
    });
    expect(result).toEqual({ nbChickens: expect.any(Number) });
  });

  it('can parse a record field', () => {
    const result = generateData({
      type: 'record',
      fields: [
        {
          name: 'farm',
          type: {
            type: 'record',
            fields: [{ name: 'nbChickens', type: 'int' }],
          },
        },
      ],
    });
    expect(result).toEqual({ farm: { nbChickens: expect.any(Number) } });
  });

  it('support union types', () => {
    const result = generateData({
      type: 'record',
      fields: [
        {
          name: 'country',
          type: [
            {
              type: 'record',
              name: 'CountryFarm',
              fields: [{ name: 'nbChickens', type: 'int' }],
            },
          ],
        },
      ],
    });
    expect(result).toEqual({
      CountryFarm: { nbChickens: expect.any(Number) },
    });
  });

  it('support union types with a namespace', () => {
    const result = generateData({
      type: 'record',
      namespace: 'com.farms',
      fields: [
        {
          name: 'farms',
          type: [
            {
              type: 'record',
              name: 'CountryFarm',
              fields: [{ name: 'nbChickens', type: 'int' }],
            },
          ],
        },
      ],
    });
    expect(result).toEqual({
      'com.farms.CountryFarm': { nbChickens: expect.any(Number) },
    });
  });

  it('always chooses the first type in a union type', () => {
    // 1/1000 chances that this test falsely pass is deemed acceptable, but you can always up the number
    const unionType = Array(1000).fill({
      type: 'record',
      name: 'CityFarm',
      fields: [{ name: 'nbPidgeons', type: 'int' }],
    });
    unionType[0] = {
      type: 'record',
      name: 'CountryFarm',
      fields: [{ name: 'nbChickens', type: 'int' }],
    };

    const result = generateData({
      type: 'record',
      fields: [
        {
          name: 'farm',
          type: unionType,
        },
      ],
    });
    expect(result).toEqual({
      CountryFarm: { nbChickens: expect.any(Number) },
    });
  });

  it('throws when encountering an unknown type', () => {
    const schema = {
      type: 'record',
      fields: [{ name: 'nbChickens', type: '3rd Kind' }],
    };

    expect(() => generateData(schema)).toThrow('Unknown type');
  });
});
