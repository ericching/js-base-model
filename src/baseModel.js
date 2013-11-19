/*
 * Provides type-checking for JavaScript.
 *
 * Examples:
 * jsType.isObject({}); // true
 * jsType.isNumber(NaN); // false
 * jsType.isElement(document.createElement('div')); // true
 * jsType.isRegExp(/abc/); // true
 * jsType.isEmpty(""); // true
 */
jsType = function (o) {
    if (o === null) {
        return 'null';
    }

    if (o === undefined) {
        return 'undefined';
    }

    if (o && (o.nodeType === 1 || o.nodeType === 9)) { // handle DOM elements
        return 'element';
    }

    var s = Object.prototype.toString.call(o);
    var type = s.match(/\[object (.*?)\]/)[1].toLowerCase();

    if (type === 'number') {
        if (isNaN(o)) {
            return 'nan';
        }
        if (!isFinite(o)) {
            return 'infinity';
        }
    }

    return type;
};

[
    'Undefined',
    'Null',
    'Object',
    'Array',
    'String',
    'Number',
    'Boolean',
    'Function',
    'RegExp',
    'Element',
    'NaN',
    'Infinite'
].forEach(function (t) {
        jsType['is' + t] = function (o) {
            return jsType(o) === t.toLowerCase();
        };
    });

jsType["isUndefinedOrNull"] = function (o) {
    return jsType.isNull(o) || jsType.isUndefined(o);
};

jsType["isBlank"] = function (o) {
    return (jsType.isString(o) && o.length == 0);
};


/*
 * This prototype object is the base class for domain models to extend from.
 *
 * Author: Eric Ching
 */
BaseModel = function (className, document, transformFromDb) {
    this.__class__ = className;
    this.__errors__ = null;
    if (transformFromDb) {
        this.assignProperties(document);
    } else {
        _.extend(this, document);
    }
    this.validate();
    return this;
};

BaseModel.extendedBy = function (childModel, constraints) {
    if (!jsType.isObject(constraints)) {
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

    assignProperties: function (document) {
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
                this[key] = new Model(value, true);
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
        if (jsType.isObject(this.constraints)) {
            var errors = [];
            for (var property in this.constraints) {
                delete props[property];
                for (var constraintType in this.constraints[property]) {
                    var constraintValue = this.constraints[property][constraintType];
                    if (!jsType.isUndefinedOrNull(constraintValue)) {
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
            if (this.hasOwnProperty(property) && !jsType.isFunction(value)) {
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
        if (jsType.isUndefinedOrNull(value)) {
            return true;
        }

        if (logger.isTraceEnabled('baseModel')) {
            logger.trace('baseModel', 'validateConstraintType: property=' + property + ', constraintType=' + constraintType + ', constraintValue=' + constraintValue + ', value=' + value);
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
        var jsTypeMethodName = 'is' + typeName;
        if (!jsType[jsTypeMethodName] || !jsType[jsTypeMethodName](value)) {
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
        if (logger.isTraceEnabled('baseModel')) {
            logger.trace('baseModel', 'validateConstraintRequired: property=' + property + ', constraintType=' + constraintType + ', constraintValue=' + constraintValue);
        }

        if (constraintValue && jsType.isUndefinedOrNull(this[property])) {
            return new ConstraintError(property, constraintType, constraintValue, "required");
        }
        return true;
    },

    validateConstraintBlank: function (property, constraintType, constraintValue) {
        if (logger.isTraceEnabled('baseModel')) {
            logger.trace('baseModel', 'validateConstraintBlank: property=' + property + ', constraintType=' + constraintType + ', constraintValue=' + constraintValue);
        }

        if (!constraintValue && jsType.isBlank(this[property])) {
            return new ConstraintError(property, constraintType, constraintValue, "blank");
        }
        return true;
    },

    validateConstraintChoice: function (property, constraintType, constraintValue) {
        if (logger.isTraceEnabled('baseModel')) {
            logger.trace('baseModel', 'validateConstraintChoice: property=' + property + ', constraintType=' + constraintType + ', constraintValue=' + constraintValue);
        }

        if (!jsType.isArray(constraintValue)) {
            throw new Error("Invalid choice: " + constraintValue);
        }
        var value = this[property];
        if (!jsType.isUndefinedOrNull(value)) {
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
            var arr = obj.toString().match(/function\s*\([^\)]+\)\s*{[\s\r\n]*(\w+)\.call/);
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

            if (!jsType.isFunction(fn)) {
                throw new Error("Function not found: " + str);
            }

            return fn;
        } catch (e) {
            throw new Error("Function not found: " + str);
        }
    },

    // Convert properties to JSON object
    toJSON: function (props) {
        var properties = jsType.isUndefinedOrNull(props) ? this.properties() : props;
        var json = {};
        for (var key in properties) {
            if (key.indexOf('_') == 0) {
                continue;
            }
            var value = properties[key];
            if (this.isInstanceOfBaseModel(value) || this.isInstanceOfBaseModel(value.constructor)) {
                json[key] = this.toJSON(value.properties());
            } else {
                if (!jsType.isFunction(value)) {
                    json[key] = value;
                }
            }
        }
        return json;
    }
}
;

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

// I18NText is defined here due to a circular dependency issue
// I18NText Model
I18NText = function (document, transformFromDb) {
    BaseModel.call(this, 'I18NText', document, transformFromDb);
};

BaseModel.extendedBy(I18NText, {
    english: {
        type: "string"
    },
    french: {
        type: "string"
    }
});
