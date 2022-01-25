import { schema as avsc } from 'avsc';
import mersenne = require('mersenne-twister');
import { v4 as uuid4, v5 as uuid5 } from 'uuid';

const defaultGenerators = {
  int: (_, { generators: { random } }: Context) =>
    Math.floor(random() * 2 ** 31),
  // This  doesn't technically produce a long but JS doesn't support those, so it's likely the user will have a logicalType on top of it
  long: (_, { generators: { random } }: Context) =>
    Math.floor(random() * Number.MAX_SAFE_INTEGER),
  double: (_, { generators: { random } }: Context) => random(),
  float: (_, { generators: { random } }: Context) => random(),
  null: () => null,
  boolean: (_, { generators: { random } }: Context) =>
    Boolean(Math.round(random())),
  string: (_, { generators: { uuid } }: Context) => uuid(),
  bytes: (_, { generators: { uuid } }: Context) => Buffer.from(uuid(), 'ascii'),
  array: ({ items }, context: Context) => [generateDataForType(items, context)],
  map: ({ values }, context: Context) => ({
    [context.generators.uuid()]: generateDataForType(values, context),
  }),
  enum: ({ symbols }) => symbols[0],
  uuid: () => uuid4(),
  random: () => Math.random(),
  decimal: generateDecimal,
  fixed: generateFixed,
  record: generateRecord,
  'time-millis': (_, { generators: { random } }: Context) =>
    Math.floor(random() * Number.MAX_SAFE_INTEGER),
  'time-micros': (_, { generators: { random } }: Context) =>
    Math.floor(random() * Number.MAX_SAFE_INTEGER),
  'timestamp-millis': (_, { generators: { random } }: Context) =>
    Math.floor(random() * Number.MAX_SAFE_INTEGER),
  'timestamp-micros': (_, { generators: { random } }: Context) =>
    Math.floor(random() * Number.MAX_SAFE_INTEGER),
  duration: generateDuration,
  date: (_, context: Context) =>
    /* long may generate up to 9007199254740991 (MAX_SAFE_INTEGER)
     * but date supports up to 8640000000000000
     * so just divide by 100. That's still plenty of time and falls into the 4 digit years most of the time.
     */
    new Date(context.generators.long(_, context) / 100),
};

function generateDuration(_, { generators: { random } }: Context) {
  const buf = new Buffer(12);
  buf.writeIntLE(random() * 2 ** 31, 0, 4);
  buf.writeIntLE(random() * 2 ** 31, 0, 4);
  buf.writeIntLE(random() * 2 ** 31, 0, 4);
  return buf.toString('ascii');
}

function generateDecimal(_, { generators: { random } }: Context) {
  // this ignores scale and precision, probably ok but PR welcome!
  const buf = new Buffer(6);
  buf.writeIntBE(random(), 0, buf.length);
  return buf;
}

function generateFixed({ size }, { generators: { random } }: Context) {
  /* I don't really know bytes operations in JS
   * So let's just cheat by overfilling size with 4bytes integers
   * Buffer is clever enough to only retain the newest bytes and
   * match the desired length
   */
  const nbInt = size / 4;

  const buffer = Buffer.alloc(size);
  for (let i = 0; i < nbInt; i++) {
    buffer.writeIntLE(random() * 2 ** 31, 0, 4);
  }
  return buffer.toString('ascii');
}

function generateDataForType(type, context: Context) {
  if (Array.isArray(type)) {
    return generateUnionType(type, context);
  }

  const { generators } = context;

  if (generators[type]) {
    return generators[type](type, context);
  }

  if (typeof type === 'object') {
    if (generators[type.logicalType]) {
      return generators[type.logicalType](type, context);
    }

    if (generators[type.type]) {
      return generators[type.type](type, context);
    }
  }

  const alias = typeof type === 'string' ? type : type.type;
  if (context.registry[alias]) {
    return generateDataForType(context.registry[alias], context);
  }

  throw new Error(`Unknown type ${type}`);
}

function generateUnionType(types: Array<any>, context) {
  const needsNamespacing =
    types.filter(type => type && type.type === 'record').length > 1;

  const { namespace } = context;

  const namespaced = types.map(type => {
    const tNamespace = namespace || type.namespace;
    const namespacedName = tNamespace
      ? `${tNamespace}.${type.name}`
      : type.name;

    return {
      type,
      namespacedName,
    };
  });

  const chosenType =
    namespaced.find(
      ({ namespacedName, type }) =>
        context.pickUnion.includes(namespacedName) ||
        context.pickUnion.includes(type.name),
    ) || namespaced[0];

  if (
    typeof chosenType.type === 'object' &&
    !Array.isArray(chosenType.type) &&
    isRecordType(chosenType.type) &&
    needsNamespacing
  ) {
    return {
      [chosenType.namespacedName]: generateDataForType(
        chosenType.type,
        context,
      ),
    };
  }
  return generateDataForType(chosenType.type, context);
}

function generateRecord(avroSchema, context) {
  if (Array.isArray(avroSchema)) {
    return generateUnionType(avroSchema, context);
  }

  const { fields, namespace } = avroSchema;
  const currentNamespace = namespace || context.namespace;

  return fields.reduce((record, { name, type }) => {
    record[name] = Array.isArray(type)
      ? generateUnionType(type, {
          ...context,
          namespace: currentNamespace,
        })
      : generateDataForType(type, { ...context, namespace: currentNamespace });

    return record;
  }, {});
}

const isRecordType = (type: any): boolean =>
  typeof type === 'object' && 'type' in type && type.type === 'record';

export type Generator = (typeDef: any, context: Context) => any;
export type Generators = {
  random: () => number;
  uuid: () => string;
  [key: string]: Generator;
};
export type Context = {
  generators: Generators;
  registry: Registry;
  namespace?: string;
};

export type AvroMock<T = any> = (
  schema: avsc.AvroSchema,
  options?: Options,
) => T;

export type Options = {
  generators?: Partial<Generators>;
  pickUnion?: Array<string>;
};

type Registry = {
  [key: string]: any;
};

function buildRegistry(registry, type) {
  if (Array.isArray(type)) {
    return type.reduce(buildRegistry, registry);
  }

  if (typeof type.type === 'object') {
    return buildRegistry(registry, type.type);
  }

  if (type.type === 'array' && type.items) {
    return buildRegistry(registry, type.items);
  }

  const { fields, namespace, name } = type;

  if (name) {
    registry[name] = type;
  }

  if (name && namespace) {
    registry[`${namespace}.${name}`] = type;
  }

  if (fields) {
    fields.reduce(buildRegistry, registry);
  }

  return registry;
}

const defaultOptions = {
  pickUnion: [],
};

export function Seeded<T = any>(seed: number) {
  const generator = new mersenne(seed);
  const random = generator.random.bind(generator);
  const uuidNamespace = '1b671a64-40d5-491e-99b0-da01ff1f3341';
  const uuid = uuid5.bind(uuid5, seed.toString(), uuidNamespace);

  return (schema: avsc.AvroSchema, options: Options = {}): T =>
    generate(schema, {
      ...options,
      generators: {
        uuid: () => uuid(),
        random,
        ...options.generators,
      },
    });
}

export default function generate<T = any>(
  schema: avsc.AvroSchema,
  options: Options = {},
): T {
  const { generators, pickUnion } = {
    ...defaultOptions,
    ...options,
  };

  return generateRecord(schema, {
    registry: buildRegistry({}, schema),
    pickUnion,
    generators: {
      ...defaultGenerators,
      ...(generators || {}),
    },
  });
}
