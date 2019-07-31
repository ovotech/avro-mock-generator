module.exports = {
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testRegex: '.spec.ts$',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  moduleDirectories: ['node_modules', './'],
  watchPathIgnorePatterns: ['/node_modules/', '.git'],
};
