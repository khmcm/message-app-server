const path = require('path'),
      rootPath = require('app-root-path').path;

/**
 * @description Checks if a hex string is valid and of a 
 *              specified length
 * @param {string} key
 * @param {number} len
 * @returns {{message: string, ok: false}}
 * */
const validateKeyString = (key, len) => {
    if(!len) { len = 32; }
    if(typeof key !== 'string') {
        return {ok: false, message: `Key must be string.`};
    }
    if(!key.match(new RegExp(`^[a-f0-9]{${len * 2}}$`))) {
        return {ok: false, message: `Invalid key length.`};
    }

    return {ok: true};
}

module.exports = validateKeyString;