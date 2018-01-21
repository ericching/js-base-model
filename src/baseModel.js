/*
 * This object is the base class for domain models to extend from.
 *
 * Documentation: https://github.com/ericching/js-base-model
 *
 * Author: Eric Ching
 */

/**
 * Constructor.
 * @param className the class name, e.g. "AddressModel"
 * @param document the model data
 * @param documentElementsAreStringified true to transform MongoDB documents obtained in a fetch, findOne or find call (the default is false).
 * @param validateModel true to validate the document upon instantiation (the default is true).
 * @returns {BaseModel}
 * @constructor
 */
BaseModel = function (className, document, documentElementsAreStringified, validateModel) {
    this.__class__ = className;
    this.__errors__ = null;
    if (!_.isUndefined(documentElementsAreStringified) && documentElementsAreStringified) {
        this.assignProperties(document, validateModel);
    } else {
        _.extend(this, document);
    }
    if (_.isUndefined(validateModel) || validateModel) {
        this.validate();
    }
    return this;
};

BaseModel.extendedBy = function (childModel, constraints) {
    if (!_.isObject(constraints)) {
        throw new Error("Invalid constraints");
    }
    childModel.prototype = Object.create(this.prototype);
    childModel.prototype.constructor = childModel;
    childModel.prototype.constraints = constraints;
    // Make the constructor property non-enumerable
    Object.defineProperty(childModel.prototype, 'constructor', {
        enumerable: false,
        value: childModel
    });
};

BaseModel.prototype = {
    constructor: BaseModel,

    assignProperties: function (document, validateModel) {
        if (!document) {
            return;
        }
        if (!this.constraints) {
            _.extend(this, document);
            return;
        }

        for (var key in document) {
            var value = document[key];
            var constraint = this.constraints[key];
            if (this.propertyIsOfTypeBaseModel(constraint)) {
                var Model = constraint['type'];
                this[key] = new Model(value, true, validateModel);
            } else {
                this[key] = value;
            }
        }
    },

    propertyIsOfTypeBaseModel: function (constraint) {
        if (!constraint) {
            return false;
        }
        var typeValue = constraint['type'];
        return (this.isInstanceOfBaseModel(typeValue));
    },
    /*
     * Returns a list of ConstraintError objects if there are validation errors;
     * true otherwise.
     */
    validate: function () {
        var props = this.properties();
        if (_.isObject(this.constraints)) {
            var errors = [];
            for (var property in this.constraints) {
                delete props[property];
                for (var constraintType in this.constraints[property]) {
                    var constraintValue = this.constraints[property][constraintType];
                    if (!(_.isUndefined(constraintValue) || _.isNull(constraintValue))) {
                        var error = this.validateConstraint(property, constraintType, constraintValue);
                        if (error instanceof ConstraintError) {
                            errors.push(error);
                        }
                    }
                }
            }
            for (var key in props) {
                errors.push(new ConstraintError(key, "undefined", undefined, "undefined in constraints"));
            }
            if (errors.length > 0) {
                this.__errors__ = errors;
                throw this.errorsToError(this.__errors__);
            }
            return true;
        }
        throw new Error("Constraints not defined");
    },

    properties: function () {
        var map = {};
        for (var property in this) {
            if (property.indexOf('_') == 0 || property === 'constraints') {
                continue;
            }
            var value = this[property];
            if (this.hasOwnProperty(property) && !_.isFunction(value)) {
                map[property] = value;
            }
        }
        return map;
    },

    validateConstraint: function (property, constraintType, constraintValue) {
        var methodName = 'validateConstraint' + constraintType.charAt(0).toUpperCase() + constraintType.slice(1);
        if (!this[methodName]) {
            throw new Error('Unsupported constraint: ' + constraintType);
        }
        return this[methodName](property, constraintType, constraintValue);
    },

    validateConstraintType: function (property, constraintType, constraintValue) {
        var value = this[property];
        if (_.isUndefined(value) || _.isNull(value)) {
            return true;
        }

        if (this.isInstanceOfBaseModel(constraintValue)) {
            var typeName = this.retrieveModelClassName(constraintValue);
            if (value.__class__) {
                if (value.__class__ !== typeName) {
                    return new ConstraintError(property, constraintType, constraintValue, "not of type " + typeName);
                }
                return true;
            }
            var valueName = this.retrieveModelClassName(value);
            if (valueName !== typeName) {
                return new ConstraintError(property, constraintType, constraintValue, "not of type " + typeName);
            }
            return value.validate();
        }
        var typeName = constraintValue.charAt(0).toUpperCase() + constraintValue.slice(1);
        var typeMethodName = 'is' + typeName;
        if (!_[typeMethodName] || !_[typeMethodName](value)) {
            return new ConstraintError(property, constraintType, constraintValue, "not of type " + constraintValue);
        }
        if ('array' === constraintValue) {
            for (var i in value) {
                var item = value[i];
                if (typeof(item) === 'BaseModel') {
                    item.validate();
                }
            }
        }
        return true;
    },

    retrieveModelClassName: function (objClass) {
        if (objClass) {
            var arr = objClass.toString().match(/BaseModel\.call\(this,\s*["'](\w+)["']/);
            if (arr && arr.length == 2) {
                return arr[1];
            }
        }
        return undefined;
    },

    validateConstraintRequired: function (property, constraintType, constraintValue) {
        if (constraintValue && (_.isUndefined(this[property]) || _.isNull(this[property]))) {
            return new ConstraintError(property, constraintType, constraintValue, "required");
        }
        return true;
    },

    validateConstraintBlank: function (property, constraintType, constraintValue) {
        if (!constraintValue && _.isString(this[property]) && this[property].length == 0) {
            return new ConstraintError(property, constraintType, constraintValue, "blank");
        }
        return true;
    },

    validateConstraintChoice: function (property, constraintType, constraintValue) {
        if (!_.isArray(constraintValue)) {
            throw new Error("Invalid choice: " + constraintValue);
        }
        var value = this[property];
        if (!(_.isUndefined(value) || _.isNull(value))) {
            var i = constraintValue.length;
            while (i--) {
                if (constraintValue[i] == value) {
                    return true;
                }
            }
            return new ConstraintError(property, constraintType, constraintValue, "not in list [" + constraintValue.toString() + "]");
        }
        return true;
    },

    validateConstraintMinLength: function (property, constraintType, constraintValue) {
        if (constraintValue && this[property] && this[property].length < constraintValue) {
            return new ConstraintError(property, constraintType, constraintValue, "minLength");
        }
        return true;
    },

    validateConstraintMaxLength: function (property, constraintType, constraintValue) {
        if (constraintValue && this[property] && this[property].length > constraintValue) {
            return new ConstraintError(property, constraintType, constraintValue, "maxLength");
        }
        return true;
    },

    errorsToError: function (errors) {
        var first = true;
        var msg = this.__class__;
        msg += ' constraint error';
        if (errors.length > 1) {
            msg += 's';
        }
        msg += '=[';
        for (var i in errors) {
            var error = errors[i];
            if (first) {
                first = false;
            } else {
                msg += ', ';
            }
            msg += error.property;
            msg += ': ';
            msg += error.msg;
        }
        msg += ']';
        return new Error(msg);
    },

    isInstanceOfBaseModel: function (obj) {
        if (obj) {
            var arr = obj.toString().replace(/\/\/ [0-9]+/g, '').match(/function\s*\([^\)]+\)\s*{[\s\r\n]*(\w+)\.call/);
            if (arr && arr.length >= 2) {
                return (arr[1] === 'BaseModel');
            }
        }

        return false;
    },

    stringToFunction: function (str) {
        try {
            var arr = str.split(".");

            var fn = (window || this);
            for (var i = 0, len = arr.length; i < len; i++) {
                fn = fn[arr[i]];
            }

            if (!_.isFunction(fn)) {
                throw new Error("Function not found: " + str);
            }

            return fn;
        } catch (e) {
            throw new Error("Function not found: " + str);
        }
    },

    // Convert properties to JSON object
    toJSON: function (props) {
        var properties;
        var json = {};
        if (_.isUndefined(props) || _.isNull(props)) {
            properties = this.properties();
            if (this._id) { // MongoDB document id
                json._id = this._id;
            }
        } else {
            properties = props;
        }
        for (var key in properties) {
            if (key.indexOf('__') == 0) {
                continue;
            }
            var value = properties[key];
            if (value && (this.isInstanceOfBaseModel(value) ||
                          (value.constructor && this.isInstanceOfBaseModel(value.constructor)))) {
                json[key] = this.toJSON(value.properties());
            } else if (_.isArray(value)) {
                var list = [];
                for (var i = 0; i < value.length; i++) {
                    if (_.isUndefined(value[i])) {
                        continue;
                    }
                    if (_.isFunction(value[i].toJSON)) {
                        list.push(value[i].toJSON());
                    } else {
                        list.push(value[i]);
                    }
                }
                json[key] = list;
            } else {
                if (!_.isFunction(value)) {
                    json[key] = value;
                }
            }
        }
        return json;
    }
};

ConstraintError = function (property, type, value, msg) {
    this.property = property;
    this.type = type;
    this.value = value;
    this.msg = msg;
    return this;
};

ConstraintError.prototype.toString = function () {
    return "ConstraintError={property=" + this.property +
        ", type=" + this.type +
        ", value=" + this.value +
        ", msg=" + this.msg + "}";
}
