// import { hmrPlugin, presets } from '@open-wc/dev-server-hmr';
import proxy from 'koa-proxies';

/** Use Hot Module replacement by adding --hmr to the start command */
const hmr = process.argv.includes('--hmr');

export default /** @type {import('@web/dev-server').DevServerConfig} */ ({
  /** Use regular watch mode if HMR is not enabled. */
  watch: !hmr,
  /** Resolve bare module imports */
  nodeResolve: {
    exportConditions: ['browser', 'development'],
  },

  middleware: [
    proxy('*/files', {
      target: 'http://dalek.umea.irf.se',
      changeOrigin: true,
      logs: true,
      rewrite: path => path.replace(/.*\/files/, 'peje/shrink-fits/2022-03-03/19'),
      events: {
        error (err, req, res) {
          console.log(err)
        },
        proxyRes (proxyRes, req, res) {
          // binary parsing does not work properly without Content-Type header set
          // as it defaults to parsing as utf-8
          res.setHeader('Content-Type', 'application/octet-stream')
        }
      }
    }),
  ],

  /** Compile JS for older browsers. Requires @web/dev-server-esbuild plugin */
  // esbuildTarget: 'auto'

  /** Set appIndex to enable SPA routing */
  // appIndex: 'demo/index.html',

  plugins: [
    /** Use Hot Module Replacement by uncommenting. Requires @open-wc/dev-server-hmr plugin */
    // hmr && hmrPlugin({ exclude: ['**/*/node_modules/**/*'], presets: [presets.litElement] }),
  ],

  // See documentation for all available options
});
