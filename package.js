Package.describe({
    summary: "Base model with type-checking and constraint validation",
    version: "0.2.5",
    git: "https://github.com/ericching/js-base-model.git"
});

Package.on_use(function (api) {
    api.versionsFrom("METEOR@0.9.0");
    api.use('underscore', ['client', 'server']);

    api.add_files('src/baseModel.js', ['client', 'server']);

    if (typeof api.export !== 'undefined') {
        api.export('BaseModel', ['client', 'server']);
    }
});

Package.on_test(function (api) {
    api.add_files('test/baseModelTest.js', ['client', 'server']);
});
