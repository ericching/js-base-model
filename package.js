Package.describe({
    documentation: "README.md",
    summary: "Base model with type-checking and constraint validation",
    git: "https://github.com/ericching/js-base-model.git",
    version: "0.2.5"
});

Package.on_use(function (api) {
    api.use('underscore', ['client', 'server']);

    api.add_files('src/baseModel.js', ['client', 'server']);

    if (typeof api.export !== 'undefined') {
        api.export('BaseModel', ['client', 'server']);
    }
});

Package.on_test(function (api) {
    api.add_files('test/baseModelTest.js', ['client', 'server']);
});
