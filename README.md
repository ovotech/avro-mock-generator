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
- `pickUnion`: Array of strings to drive which member of union type to choose. Can be the short name of fully namespaced names. When this option is not provided, the first element in the union will be chosen

## Reproducible generation

Use the `Seeded` factory to create a version of the generator that will use deterministic randomness.

The factory will return a function with the same signature as the default generator.

## Supported Avro features

Based on the Avro 1.9.0 [specification](https://avro.apache.org/docs/current/spec.html).

- All primitive types
- All logical types
  - including custom logicalTypes using the `options` parameter. If a `logicalType` is missing a generator, data will be generated matching the underlying `type`.
- All complex types
  - Note that for `enum` types, the first element of the array will always be chosen.
- Type Alias

**Partial support for namespaces**. Only union types are namespaced, unconditionally.

## Contributing

All contributions are welcome, just fork the repository then create a PR. Once merged we will release a new version.

## Releasing

Simply create a [new release](https://github.com/ovotech/avro-mock-generator/releases/new) on master, with the tag being the new version (eg: 1.0.0).
