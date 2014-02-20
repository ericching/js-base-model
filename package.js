Package.describe({
    summary: "Base model with type-checking and constraint validation"
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
