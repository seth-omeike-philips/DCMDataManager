const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  transform: {
    ...tsJestTransformCfg,
  },
  projects: [
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
    },
    {
      displayName: 'backend',
      testEnvironment: 'node',
    },
  ]
};