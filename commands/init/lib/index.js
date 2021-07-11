'use strict';
const Command = require("@liti/command");
const log = require("@liti/log");
class InitCommand extends Command{
    constructor(argv) {
        super(argv)
    }
    init() {
        this.projectName = this._argv[0] || ''
        this.force = !!this._argv[1].force
        log.verbose('', this.projectName, this.force)
    }
    exec() {
        console.log('init的业务逻辑')
    }
}
function init(argv) {
    const [name, options, command] = argv;
    // console.log('init', name, options, process.env.CLI_TARGET_PATH)
    return new InitCommand(argv)
}

module.exports = init;