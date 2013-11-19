# js-base-model

JavaScript supports the JSON format natively, which makes it the preferred way to define a domain model with it. Since JavaScript is a loose-typing language, defining your domain model this way comes with several shortcomings:

 - No type-checking:
    - You cannot define a property to be of a specific type, e.g. boolean, string, a prototype object, etc.
    - A boolean property can accept any value without throwing an error, e.g. "true", {}, ["true"], true, etc.
 - No constraint validation:
    - You cannot guarantee that certain properties in your domain model are required fields.
    - You cannot guarantee that certain properties can only accept non-blank values.
    - You cannot guarantee that a property only accept values that are defined in a list (e.g. ['M', 'F']).
    - You cannot guarantee that a property is of a specific type, e.g. boolean, string, a prototype object, etc.
    - You cannot guarantee that only properties that are defined by you are populated.

js-base-model solves the aforementioned issues.

## Features
 - type-checking for properties
 - constraint validation (required, blank, and choice for now)

## Usage:
```javascript
// AddressModel
AddressModel = function (document, transformFromDb) {
    BaseModel.call(this, 'AddressModel', document, transformFromDb);
};

BaseModel.extendedBy(
    AddressModel,
    {
        street1: {
            type: "string",
            required: true,
            blank: false
        },
        street2: {
            type: "string",
            required: false
        },
        city: {
            type: "string",
            required: true,
            blank: false
        },
        stateOrProvince: {
             type: "string",
             required: true,
             blank: false
        },
        zipOrPostalCode: {
            type: "string",
            required: true,
            blank: false
        },
        country: {
            type: "string",
            required: true,
            blank: false
        }
     }
);

// UserModel
UserModel = function (document, transformFromDb) {
    BaseModel.call(this, 'UserModel', document, transformFromDb);
};

BaseModel.extendedBy(
    UserModel,
    {
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
        address: {
            type: Address,
            required: false
        }
    }
);
```

## Meteor Support
[Meteor][http://www.meteor.com] is an open-source platform based on Node.js. It handles domain model in the JSON format.

js-base-model works well with Meteor. With this class you can define strongly-typed domain models while enjoying the benefits of this incredible platform.

To transform collection documents (JSON format) to a predefined domain model:
```javascript
UserCollection = new Meteor.Collection('User', {
    // Transform MongoDB documents before they're returned in a fetch, findOne or find call,
    // and before they are passed to observer callbacks.
    transform: function (document) {
        return new UserModel(document, true);
    }
});

```

To save a domain model to a collection:
```javascript
UserCollection.insert(userModel.toJSON());
```
