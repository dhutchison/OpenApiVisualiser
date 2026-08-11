// @ts-check
const eslint = require('@eslint/js');
const {defineConfig} = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      angular.configs.tsRecommended
    ],
    languageOptions: {
      parserOptions: {
        projectService: true
      }
    },
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase'
        }
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case'
        }
      ],
      '@angular-eslint/prefer-standalone': 'off',
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      'prefer-const': 'off'
    }
  },
  {
    files: ['**/*.html'],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility
    ],
    rules: {}
  }
]);
