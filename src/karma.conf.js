// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-junit-reporter'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    coverageReporter: {
      dir: require('path').join(__dirname, '../coverage/OpenAPIVisualiser'),
      reporters: ['json', 'lcov', 'text-summary'],
      fixWebpackSourcePaths: true
    },
    // Note the documentation says more is required to allow this junit
    // format to be usable in sonar
    junitReporter: {
      outputDir: require('path').join(__dirname, '../junit/OpenAPIVisualiser')
    },
    reporters: ['progress', 'junit', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome', 'ChromeHeadlessNoSandbox'],
    singleRun: false,
    restartOnFileChange: true,

    customLaunchers: {
      ChromeHeadlessNoSandbox: {
          base: 'ChromeHeadless',
          flags: [
              '--no-sandbox', // required to run without privileges in docker
              '--user-data-dir=/tmp/chrome-test-profile',
              '--disable-web-security'
          ]
      }
    }
  });
};
