import typescript from '@rollup/plugin-typescript';
import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import nodePolyfills from 'rollup-plugin-node-polyfills';
// import visualizer from "rollup-plugin-visualizer"; Not right now :)
// TODO: Add Uglify bundle, use terser
// FIXME: TS Types should be generated outside of dist.

// Output directory
const dist = 'dist';

// Output javascript name
const bundle = 'bundle';

// Name for the broswer (e.g. window.GerberTools)
const browsername = 'tscheda';

export default {
  input: 'lib/index.ts',
  // Support for CJS, ESM, and UMD
  // (require("GerberTools") || import GerberTools from ".." || window.GerberTools )
  output: [
    {
      // Common JS
      exports: 'auto',
      file: `${dist}/${bundle}.cjs.js`,
      format: 'cjs',
    },
    {
      // ECMAScript Modules
      file: `${dist}/${bundle}.esm.js`,
      format: 'esm',
    },
    {
      // Universar Module Defintion
      name: `${browsername}`,
      file: `${dist}/${bundle}.umd.js`,
      format: 'umd',
    },
  ],

  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
    }),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
    }),
    nodePolyfills(),
    resolve(),
    commonjs(),

    // visualizer(),
  ],
};
