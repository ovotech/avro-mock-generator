import { randomFillSync } from 'crypto';

import uuid from 'uuid/v4';

const typeGenerators = {
  int: () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
  // This  doesn't technically produce a long but JS doesn't support those, so it's likely the user will have a logicalType on top of it
  long: () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
  double: () => Math.random(),
  float: () => Math.random(),
  null: () => null,
  boolean: () => Boolean(Math.round(Math.random())),
  string: () => uuid(),
  bytes: () => Buffer.from(uuid(), 'ascii'),
  array: ({ items }) => [generateDataForType(items)],
  map: ({ values }) => ({ [uuid()]: generateDataForType(values) }),
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
  date: () => new Date()
  // TODO: allow overriding of any of those generators
};

function generateDuration() {
  const buf = new Buffer(12)
  buf.writeIntLE(Math.random(), 0, 4)
  buf.writeIntLE(Math.random(), 0, 4)
  buf.writeIntLE(Math.random(), 0, 4)
  return buf.toString('ascii')
}

function generateDecimal() {
  // this ignores scale and precision, probably ok but PR welcome!
  const buf = new Buffer(6)
  buf.writeIntBE(Math.random(), 0, buf.length)
  return buf
}

function generateFixed({ size }) {
  const buffer = Buffer.alloc(size);
  randomFillSync(buffer);
  return buffer.toString('ascii');
}

function generateDataForType(type) {
  if (typeGenerators[type]) {
    return typeGenerators[type]();
  }

  if (typeof type === 'object') {
    if (typeGenerators[type.logicalType]) {
      return typeGenerators[type.logicalType](type);
    }
    if (typeGenerators[type.type]) {
      return typeGenerators[type.type](type);
    }
  }
  // TODO support custom logical types

  throw new Error(`Unknown type ${type}`);
}

function generateRecord({ fields, namespace }) {
  return fields.reduce((record, { name, type }) => {
    if (Array.isArray(type)) {
      /* union type, always choose the first one
       * so that the caller can be in control of which type
       * of the union is being used
       */
      const chosenType = type[0];
      let namespacedName = namespace
        ? `${namespace}.${chosenType.name}`
        : chosenType.name;
      record[namespacedName] = generateDataForType(chosenType);
    } else {
      record[name] = generateDataForType(type);
    }

    return record;
  }, {});
}

export default <T = any>(schema: any) => {
  return generateRecord(schema) as T;
};
