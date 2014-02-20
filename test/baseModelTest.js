/*
 * Unit tests using CasperJS (http://casperjs.org)
 */

var I18NText = function (document, transformFromDb) {
    BaseModel.call(this, 'I18NText', document, transformFromDb);
};
BaseModel.extendedBy(I18NText, {
    en: {
        type: "string"
    },
    fr: {
        type: "string"
    }
});

casper.test.begin('Test baseModel.js', function (test) {
    var TestModel;
    var testConstraint = function (testName, jsonDoc, constraints, errorMessage) {
        try {
            TestModel = function (document) {
                BaseModel.call(this, 'TestModel', document);
            };
            BaseModel.extendedBy(TestModel, constraints);
            var model = new TestModel(jsonDoc);
            test.pass(testName);
        } catch (e) {
            test.assertEquals(e.message, errorMessage, testName);
        }
    };

    try {
        var model = new BaseModel();
    } catch (e) {
        test.assertEquals(e.message, 'Constraints not defined', 'A model without constraints will fail.');
    }

    try {
        var document = {};
        var model = new BaseModel(document);
    } catch (e) {
        test.assertEquals(e.message, 'Constraints not defined', 'A model without constraints and an empty document will fail.');
    }

    GrandChildModel = function (document) {
        BaseModel.call(this, 'GrandChildModel', document);
    }
    var grandChildModelConstraints = {
        name: {
            type: I18NText,
            required: true
        }
    };
    BaseModel.extendedBy(GrandChildModel, grandChildModelConstraints);

    ChildModel = function (document) {
        BaseModel.call(this, 'ChildModel', document);
    };
    var childModelConstraints = {
        name: {
            type: I18NText,
            required: true
        },
        grandChild: {
            type: GrandChildModel
        }
    };
    BaseModel.extendedBy(ChildModel, childModelConstraints);

    var constraints = {
        name: {
            type: "string",
            required: true,
            blank: false
        },
        gender: {
            type: "string",
            required: true,
            choice: ['M', 'F']
        },
        phoneList: {
            type: "array"
        },
        flag: {
            type: "boolean"
        }
    };

    testConstraint('Test an empty document.', {}, constraints, 'TestModel constraint errors=[name: required, gender: required]');

    testConstraint(
        'Non-blank properties with blank values will fail.',
        {
            name: "",
            gender: []
        },
        constraints,
        'TestModel constraint errors=[name: blank, gender: not of type string, gender: not in list [M,F]]'
    );

    testConstraint(
        'Choice properties with an invalid value will fail.',
        {
            name: "Joe",
            gender: 'A'
        },
        constraints,
        'TestModel constraint error=[gender: not in list [M,F]]'
    );

    testConstraint(
        'Typed properties with invalid types will fail.',
        {
            name: "Joe",
            gender: 'M',
            phoneList: '1234567890',
            flag: 'true'
        },
        constraints,
        'TestModel constraint errors=[phoneList: not of type array, flag: not of type boolean]'
    );

    testConstraint(
        'Properties that satisfy all constraints will pass.',
        {
            name: "Joe",
            gender: 'M',
            phoneList: [],
            flag: true
        },
        constraints,
        ''
    );

    var childModel = new ChildModel({
        name: new I18NText({
            en: "English Name",
            fr: "French Name"
        })
    });

    testConstraint(
        'A property that is not defined in the constraints will fail.',
        {
            name: "Joe",
            gender: 'M',
            phoneList: [],
            flag: true,
            child: childModel
        },
        constraints,
        'TestModel constraint error=[child: undefined in constraints]'
    );

    constraints['child'] = {
        type: ChildModel,
        required: true
    };

    testConstraint(
        'An object property with an invalid type will fail.',
        {
            name: "Joe",
            gender: 'M',
            phoneList: [],
            flag: true,
            child: "test"
        },
        constraints,
        'TestModel constraint error=[child: not of type ChildModel]'
    );

    testConstraint(
        'All properties, including an object, that satisfies all constraints will pass',
        {
            name: "Joe",
            gender: 'M',
            phoneList: [],
            flag: true,
            child: childModel
        },
        constraints,
        ''
    );

    childModel.name = undefined;
    testConstraint(
        'A model property that fails its own validation will also fail the parent validation',
        {
            name: "Joe",
            gender: 'M',
            phoneList: [],
            flag: true,
            child: childModel
        },
        constraints,
        'ChildModel constraint error=[name: required]'
    );

    var grandChildModel = new GrandChildModel({
        name: new I18NText({
            fr: "French Grand Child Name"
        })
    });
    childModel.grandChild = grandChildModel;
    testConstraint(
        'An invalid grandchild property that fails its own validation will also fail the grandparent validation',
        {
            name: "Joe",
            gender: 'M',
            phoneList: [],
            flag: true,
            child: childModel
        },
        constraints,
        'GrandChildModel constraint error=[name: required]'
    );

    grandChildModel.name.en = "English Grand Child Name";
    childModel.grandChild = grandChildModel;
    testConstraint(
        'All three levels of properties that are valid will pass validation.',
        {
            name: "Joe",
            gender: 'M',
            phoneList: [],
            flag: true,
            child: childModel
        },
        constraints,
        'GrandChildModel constraint error=[name: required]'
    );

    constraints = {
        name: {
            type: 'string',
            required: true,
            minLength: 5,
            maxLength: 10
        }
    };
    testConstraint(
        'The min length fails if the string is too short',
        {
            name: "Joe"
        },
        constraints,
        'TestModel constraint error=[name: minLength]'
    );

    testConstraint(
        'The max length fails if the string is too long',
        {
            name: "Flappy Bird is so stupid!"
        },
        constraints,
        'TestModel constraint error=[name: maxLength]'
    );

    testConstraint(
        'The min and max lengths pass if the string length fits the criteria',
        {
            name: "Flappy"
        },
        constraints,
        ''
    );

    test.done();
});
