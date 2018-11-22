'use strict'

const createServer = require('./src').createServer

const server = createServer() // using defaults
module.exports = {
  karma: {
    files: [{
      pattern: 'test/fixtures/**/*',
      watched: false,
      served: true,
      included: false
    }],
    reporters: ['coverage-istanbul'],
    coverageIstanbulReporter: {
      reports: ['json'],
      dir: path.join(__dirname, 'coverage'),
      combineBrowserReports: true,
      fixWebpackSourcePaths: true,
    },
    preprocessors: { 'node_modules/aegir/src/config/karma-entry.js': [ 'webpack', 'sourcemap' ] },
    webpack: {
      module: {
        rules: [
          // instrument only testing sources with Istanbul
          {
            test: /\.js$/,
            use: { loader: 'istanbul-instrumenter-loader' },
            include: path.resolve('src/')
          }
        ]
      }
    },
    customLaunchers: {
      ChromeDocker: {
        base: 'ChromeHeadless',
        // We must disable the Chrome sandbox when running Chrome inside Docker (Chrome's sandbox needs
        // more permissions than Docker allows by default)
        flags: ['--no-sandbox']
      }
    },
    client: {
      mocha: {
        bail: true,
      }
    },
    singleRun: true
  },
  hooks: {
    browser: {
      pre: server.start.bind(server),
      post: server.stop.bind(server)
    }
  }
}
