import mersenne = require('mersenne-twister');

import uuid4 from 'uuid/v4';
import uuid5 from 'uuid/v5';

const defaultGenerators = {
  int: (_, { random }: Context) => Math.floor(random() * 2 ** 31),
  // This  doesn't technically produce a long but JS doesn't support those, so it's likely the user will have a logicalType on top of it
  long: (_, { random }: Context) =>
    Math.floor(random() * Number.MAX_SAFE_INTEGER),
  double: (_, { random }: Context) => random(),
  float: (_, { random }: Context) => random(),
  null: () => null,
  boolean: (_, { random }: Context) => Boolean(Math.round(random())),
  // TODO seeded uuid support (or other random strings, eh
  string: (_, { uuid }: Context) => uuid(),
  bytes: (_, { uuid }: Context) => Buffer.from(uuid(), 'ascii'),
  array: ({ items }, context: Context) => [generateDataForType(items, context)],
  map: ({ values }, context: Context) => ({
    [context.uuid()]: generateDataForType(values, context),
  }),
  enum: ({ symbols }) => symbols[0],
  uuid: (_, { uuid }: Context) => uuid(),
  decimal: generateDecimal,
  fixed: generateFixed,
  record: generateRecord,
  'time-millis': (_, { random }: Context) =>
    Math.floor(random() * Number.MAX_SAFE_INTEGER),
  'time-micros': (_, { random }: Context) =>
    Math.floor(random() * Number.MAX_SAFE_INTEGER),
  'timestamp-millis': (_, { random }: Context) =>
    Math.floor(random() * Number.MAX_SAFE_INTEGER),
  'timestamp-micros': (_, { random }: Context) =>
    Math.floor(random() * Number.MAX_SAFE_INTEGER),
  duration: generateDuration,
  date: (_, { random }: Context) => new Date(random()),
};

function generateDuration(_, { random }: Context) {
  const buf = new Buffer(12);
  buf.writeIntLE(random() * 2 ** 31, 0, 4);
  buf.writeIntLE(random() * 2 ** 31, 0, 4);
  buf.writeIntLE(random() * 2 ** 31, 0, 4);
  return buf.toString('ascii');
}

function generateDecimal(_, { random }: Context) {
  // this ignores scale and precision, probably ok but PR welcome!
  const buf = new Buffer(6);
  buf.writeIntBE(random(), 0, buf.length);
  return buf;
}

function generateFixed({ size }, { random }: Context) {
  /* I don't really know bytes operations in jS
   * So let's just cheat by overfilling size with 4bypes integers
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
    return generateRecord(context.registry[alias], context);
  }

  throw new Error(`Unknown type ${type}`);
}

function generateUnionType(types: Array<any>, namespace, context) {
  const needsNamespacing =
    types.filter(type => type && type.type === 'record').length > 1;

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
    return generateUnionType(avroSchema, undefined, context);
  }

  const { fields, namespace } = avroSchema;

  return fields.reduce((record, { name, type }) => {
    record[name] = Array.isArray(type)
      ? generateUnionType(type, namespace, context)
      : generateDataForType(type, context);

    return record;
  }, {});
}

const isRecordType = (type: any): boolean =>
  typeof type === 'object' && 'type' in type && type.type === 'record';

export type Generator = (typeDef: any, context: Context) => any;
export type Generators = {
  [key: string]: Generator;
};
export type Context = {
  generators: Generators;
  registry: Registry;
  random: () => number;
  uuid: () => string;
};
export type Options = {
  generators?: Generators;
  pickUnion?: Array<string>;
  seed?: number;
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
  seed: undefined,
};

export default <T = any>(schema: any, options: Options = {}) => {
  const { generators, pickUnion } = {
    ...defaultOptions,
    ...options,
  };
  let random: Context['random'] = Math.random;
  let uuid: Context['uuid'] = uuid4;

  if (options.seed) {
    const generator = new mersenne(options.seed);
    random = generator.random.bind(generator);
    const uuidNamespace = '1b671a64-40d5-491e-99b0-da01ff1f3341';
    uuid = uuid5.bind(uuid5, options.seed.toString(), uuidNamespace);
  }

  return generateRecord(schema, {
    registry: buildRegistry({}, schema),
    random,
    pickUnion,
    uuid,
    generators: {
      ...defaultGenerators,
      ...(generators || {}),
    },
  }) as T;
};
