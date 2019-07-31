function generateDataForType(type) {
  switch (type) {
    case 'int':
      return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    default:
      if (typeof type === 'object') {
        if (type.type === 'record') {
          return generateRecord(type);
        }
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
