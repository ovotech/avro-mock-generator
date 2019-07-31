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
  fixed: generateFixed,
  record: generateRecord,
};

function generateFixed({ size }) {
  const buffer = Buffer.alloc(size);
  randomFillSync(buffer);
  return buffer.toString('ascii');
}

function generateDataForType(type) {
  if (typeGenerators[type]) {
    return typeGenerators[type]();
  }

  if (typeof type === 'object' && typeGenerators[type.type]) {
    return typeGenerators[type.type](type);
  }
  // TODO support logical types

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

export default (schema: any) => {
  return generateRecord(schema);
};
