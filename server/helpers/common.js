const camelCase = require('camelcase');

function objectPropsToCamelCase(object) {
    let newObject = {};
    for (let key in object) {
        newObject[camelCase(key)] = object[key];
    }
    return newObject;
}

module.exports = {
    objectPropsToCamelCase,
};