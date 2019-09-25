import isuuid from 'isuuid';

import generateData from '../src/index';

describe('Avro mock data generator', () => {
  it('supports all easily tested avro types', () => {
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
        { name: 'array', type: { type: 'array', items: 'string' } },
        { name: 'map', type: { type: 'map', values: 'int' } },
        { name: 'fixed', type: { type: 'fixed', size: 16 } },
        { name: 'uuid', type: { type: 'string', logicalType: 'uuid' } },
        { name: 'decimal', type: { type: 'bytes', logicalType: 'decimal' } },
        {
          name: 'time-millis',
          type: { type: 'int', logicalType: 'time-millis' },
        },
        {
          name: 'time-micros',
          type: { type: 'long', logicalType: 'time-micros' },
        },
        {
          name: 'timestamp-millis',
          type: { type: 'long', logicalType: 'timestamp-millis' },
        },
        {
          name: 'timestamp-micros',
          type: { type: 'long', logicalType: 'timestamp-micros' },
        },
        { name: 'duration', type: { type: 'fixed', logicalType: 'duration' } },
        { name: 'date', type: { type: 'int', logicalType: 'date' } },
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
    expect(result).toMatchObject({ bytes: expect.any(Buffer) });
    expect(result).toMatchObject({ bytes: expect.any(Buffer) });
    expect(result).toMatchObject({
      array: expect.arrayContaining([expect.any(String)]),
    });
    expect(result).toMatchObject({ date: expect.any(Date) });

    expect(Object.entries(result.map).length).toEqual(1);
    expect(Object.values(result.map)).toEqual(
      expect.arrayContaining([expect.any(Number)]),
    );

    expect(typeof result.fixed).toEqual('string');
    expect(result.fixed).toHaveLength(16);

    expect(isuuid(result.uuid)).toBe(true);

    expect(result).toMatchObject({ decimal: expect.any(Buffer) });
    expect(typeof result.decimal.readIntBE(0, result.decimal.length)).toEqual(
      'number',
    );

    expect(result).toMatchObject({ 'time-millis': expect.any(Number) });
    expect(result).toMatchObject({ 'time-micros': expect.any(Number) });
    expect(result).toMatchObject({ 'timestamp-millis': expect.any(Number) });
    expect(result).toMatchObject({ 'timestamp-micros': expect.any(Number) });

    expect(typeof result.duration).toEqual('string');
    expect(result.duration).toHaveLength(12);
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

  it('supports union types', () => {
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
      country: { CountryFarm: { nbChickens: expect.any(Number) } },
    });
  });

  it('supports union types with a namespace', () => {
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
      farms: { 'com.farms.CountryFarm': { nbChickens: expect.any(Number) } },
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
      farm: { CountryFarm: { nbChickens: expect.any(Number) } },
    });
  });

  it('supports top level union types', () => {
    const result = generateData([
      {
        type: 'record',
        name: 'Owners',
        namespace: 'com.farms',
        fields: [
          {
            name: 'name',
            type: 'string',
          },
        ],
      },
      {
        type: 'record2',
        namespace: 'com.farms',
        name: 'Animals',
        fields: [
          {
            name: 'breed',
            type: 'string',
          },
        ],
      },
    ]);
    expect(result).toEqual({
      'com.farms.Owners': { name: expect.any(String) },
    });
  });

  it('supports enum types', () => {
    const result = generateData({
      type: 'record',
      fields: [
        {
          name: 'farmAnimals',
          type: { type: 'enum', name: 'animals', symbols: ['Chicken'] },
        },
      ],
    });
    expect(result).toEqual({
      farmAnimals: 'Chicken',
    });
  });

  it('always chooses the first type in a enum type', () => {
    // 1/1000 chances that this test falsely pass is deemed acceptable, but you can always up the number
    const symbols = Array(1000).fill('Cow');
    symbols[0] = 'Chicken';

    const result = generateData({
      type: 'record',
      fields: [
        {
          name: 'farmAnimals',
          type: { type: 'enum', symbols },
        },
      ],
    });
    expect(result).toEqual({
      farmAnimals: 'Chicken',
    });
  });

  it('throws when encountering an unknown type', () => {
    const schema = {
      type: 'record',
      fields: [{ name: 'nbChickens', type: '3rd Kind' }],
    };

    expect(() => generateData(schema)).toThrow('Unknown type');
  });

  it('allows custom generators', () => {
    const result = generateData(
      {
        type: 'record',
        fields: [{ name: 'chickenName', type: 'string' }],
      },
      { generators: { string: () => 'henry' } },
    );
    expect(result).toEqual({ chickenName: 'henry' });
  });

  it('supports type alias', () => {
    const result = generateData({
      type: 'record',
      fields: [
        {
          name: 'Rooster',
          type: 'chicken',
        },
        {
          name: 'hen',
          type: {
            type: 'record',
            name: 'chicken',
            fields: [{ name: 'chickenName', type: 'string' }],
          },
        },
      ],
    });
    expect(result).toEqual({
      Rooster: { chickenName: expect.any(String) },
      hen: { chickenName: expect.any(String) },
    });
  });

  it('supports fully qualified type alias', () => {
    const result = generateData({
      type: 'record',
      fields: [
        {
          name: 'Rooster',
          type: 'space.chicken',
        },
        {
          name: 'hen',
          type: {
            type: 'record',
            name: 'chicken',
            namespace: 'space',
            fields: [{ name: 'chickenName', type: 'string' }],
          },
        },
      ],
    });
    expect(result).toEqual({
      Rooster: { chickenName: expect.any(String) },
      hen: { chickenName: expect.any(String) },
    });
  });
});
