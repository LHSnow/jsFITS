import html from '@web/rollup-plugin-html';
import { copy } from '@web/rollup-plugin-copy';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import minifyHTML from 'rollup-plugin-minify-html-literals';

/*
Build an application that meets the modern browser build requirements and production optimizations.
This configuration is suitable for serving to modern browsers that can run ES2019 JS without polyfills.
ref: https://lit.dev/docs/tools/production/
*/

export default {
  plugins: [
    // Entry point for application build; can specify a glob to build multiple
    // HTML files for non-SPA app
    html({
      input: ['demo/*.html', 'barebones/*.html'],
    }),

    // Resolve bare module specifiers to relative paths
    resolve(),

    // Because Lit templates are defined inside JavaScript template string literals,
    // they don't get processed by standard HTML minifiers.
    // Adding a plugin that minifies the HTML in template string literals can result in a modest decrease in code size.
    minifyHTML(),

    // Minify JS
    // Terser works well for Lit, because it supports modern JavaScript
    terser({
      ecma: 2020,
      module: true,
      warnings: true,
    }),

    // Copy static assets to build directory
    copy({
      patterns: [
        'files/**/*',
        'custom-elements.json',
        'package.json',
        'package-lock.json',
      ],
    }),
  ],

  input: 'index.js',

  output: {
    dir: 'build',
  },

  preserveEntrySignatures: 'strict',
};
