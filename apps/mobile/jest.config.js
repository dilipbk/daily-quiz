/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Mocks first, then the same theme registration the app's entry file runs.
  setupFiles: ['react-native-unistyles/mocks', './src/unistyles.ts'],
};
