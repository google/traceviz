module.exports = function (config) {
  config.set({
    frameworks: ["jasmine", "@angular-devkit/build-angular"],
    plugins: [
      require("karma-jasmine"),
      require("karma-chrome-launcher"),
      require("karma-jasmine-html-reporter"),
      require("karma-spec-reporter"),
      require("@angular-devkit/build-angular/plugins/karma"),
    ],
    files: [
      { pattern: "./src/test.ts", watched: false }
    ],
    preprocessors: {
      "./src/test.ts": ["@angular-devkit/build-angular"]
    },
    angularCli: {
      tsConfig: './tsconfig.spec.json',
    },
    reporters: ["progress", "kjhtml", "spec"],
    browsers: ["Chrome"],
    restartOnFileChange: true
  });
};
