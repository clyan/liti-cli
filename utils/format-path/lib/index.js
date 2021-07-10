'use strict';

module.exports = formatPath;
const path = require('path')
function formatPath(filePath) {
    if(filePath) {
        const sep = path.sep;
        if(sep === '/'){
            return filePath
        } else {
            return filePath.replace(/\\/g, '/')
        }
    }
    return filePath;
}