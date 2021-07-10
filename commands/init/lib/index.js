'use strict';


function init(name, options, command)  {
    console.log('init', name, options, process.env.CLI_TARGET_PATH)
}


module.exports = init;