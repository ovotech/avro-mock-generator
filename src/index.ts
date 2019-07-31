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
};

function generateDataForType(type) {
  if (typeGenerators[type]) {
    return typeGenerators[type]();
  }

  if (typeof type === 'object') {
    if (type.type === 'record') {
      return generateRecord(type);
    }
  }
  throw new Error(`Unknown type ${type}`);
}

function generateRecord({ fields }) {
  return fields.reduce((record, { name, type }) => {
    record[name] = generateDataForType(type);
    return record;
  }, {});
}

// TODO support logical types
export default (schema: any) => {
  return generateRecord(schema);
};