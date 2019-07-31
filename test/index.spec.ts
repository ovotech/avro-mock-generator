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

  // TODO if only union types are namespaced, how to reconcile controlling which of the union type to return and namespacing?
  // TODO this is only happening on union types. So need to support union types first
  // it('support namespace', () => {
  //   const result = generateData({
  //     type: 'record',
  //     fields: [
  //       {
  //         name: 'farm',
  //         type: {
  //           type: 'record',
  //           namespace: 'country.',
  //           fields: [{ name: 'nbChickens', type: 'int' }],
  //         },
  //       },
  //     ],
  //   });
  //   expect(result).toEqual({
  //     'country.farm': { nbChickens: expect.any(Number) },
  //   });
  // });

  it('throws when encountering an unknown type', () => {
    const schema = {
      type: 'record',
      fields: [{ name: 'nbChickens', type: '3rd Kind' }],
    };

    expect(() => generateData(schema)).toThrow('Unknown type');
  });
});
