# Avro Mock Generator

Create mock messages from Avro schemas.

## Usage

Call the generator with the schema:

```
import generateMsg from '@ovotech/avro-mock-generator'

const schema = {
  type: 'record',
  fields: [{ name: 'nbChickens', type: 'int' }],
}
console.log(generateData(schema));

// { nbChickens: 25672672 }
```

All fields will contain randomly generated data that respects their type.

### Options

An `options` object can optionnaly be provide as the second argument.

Supported Options:

- `generators`: An `key`/`value` object of generator functions.
  - `key`: the `type` (or `logicalType`)
  - `value`: should be a generator function `(type, context) => value` where - `type`: the content of the `type` field in the schema, either a `string` for simple type, or the type configuration for complex types - `context`: an object with contextual data, including the `generators`
    It is possible to override the default generators, and add support for extra types/logicalTypes by providing

## Supported Avro features

Based on the Avro 1.9.0 [specification](https://avro.apache.org/docs/current/spec.html).

- All primitive types
- All logical types
  - including custom logicalTypes using the `options` parameter. If a `logicalType` is missing a generator, data will be generated matching the underlying `type`.
- All complex types
  - Note that for `enum` and `union` types, the first element of the array will always be chosen. This allows the caller to drive the behaviour of the generator to return the expected type

**Partial support for namespaces**. Only union types are namespaced, unconditionally.

**Aliases** are not currently supported.

## Contributing

All contributions are welcome, just fork the repository then create a PR. Once merged we will release a new version.

## Releasing

Simply create a [new release](https://github.com/ovotech/avro-mock-generator/releases/new) on master, with the tag being the new version (eg: 1.0.0).
