import { randomFillSync } from 'crypto';

import uuid from 'uuid/v4';

const defaultGenerators = {
  int: () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
  // This  doesn't technically produce a long but JS doesn't support those, so it's likely the user will have a logicalType on top of it
  long: () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
  double: () => Math.random(),
  float: () => Math.random(),
  null: () => null,
  boolean: () => Boolean(Math.round(Math.random())),
  string: () => uuid(),
  bytes: () => Buffer.from(uuid(), 'ascii'),
  array: ({ items }, context) => [generateDataForType(items, context)],
  map: ({ values }, context) => ({
    [uuid()]: generateDataForType(values, context),
  }),
  enum: ({ symbols }) => symbols[0],
  uuid: () => uuid(),
  decimal: generateDecimal,
  fixed: generateFixed,
  record: generateRecord,
  'time-millis': () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
  'time-micros': () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
  'timestamp-millis': () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
  'timestamp-micros': () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
  duration: generateDuration,
  date: () => new Date(),
};

function generateDuration() {
  const buf = new Buffer(12);
  buf.writeIntLE(Math.random(), 0, 4);
  buf.writeIntLE(Math.random(), 0, 4);
  buf.writeIntLE(Math.random(), 0, 4);
  return buf.toString('ascii');
}

function generateDecimal() {
  // this ignores scale and precision, probably ok but PR welcome!
  const buf = new Buffer(6);
  buf.writeIntBE(Math.random(), 0, buf.length);
  return buf;
}

function generateFixed({ size }) {
  const buffer = Buffer.alloc(size);
  randomFillSync(buffer);
  return buffer.toString('ascii');
}

function generateDataForType(type, context) {
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
  /* union type, always choose the first one
   * so that the caller can be in control of which type
   * of the union is being used
   */
  const chosenType = types[0];
  const chosenNamespace = namespace || chosenType.namespace;
  const namespacedName = chosenNamespace
    ? `${chosenNamespace}.${chosenType.name}`
    : chosenType.name;

  return {
    [namespacedName]: generateDataForType(chosenType, context),
  };
}

function generateRecord(avroSchema, context) {
  if (Array.isArray(avroSchema)) {
    return generateUnionType(avroSchema, undefined, context);
  }

  const { fields, namespace } = avroSchema;

  return fields.reduce((record, { name, type }) => {
    if (Array.isArray(type)) {
      record[name] = generateUnionType(type, namespace, context);
    } else {
      record[name] = generateDataForType(type, context);
    }

    return record;
  }, {});
}

export type Generator = (typeDef: any, context: Context) => any;
export type Generators = {
  [key: string]: Generator;
};
export type Context = {
  generators: Generators;
  registry: Registry;
};
export type Options = {
  generators?: Generators;
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

export default <T = any>(schema: any, options: Options = {}) => {
  const { generators } = options;
  return generateRecord(schema, {
    registry: buildRegistry({}, schema),
    generators: {
      ...defaultGenerators,
      ...(generators || {}),
    },
  }) as T;
};
