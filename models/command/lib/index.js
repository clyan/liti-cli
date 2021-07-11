'use strict';
const semver = require('semver')
const colors = require('colors')
const constants = require('@liti/constants');
const log = require('@liti/log');
class Command {
    constructor(argv) {
        //log.verbose("Command constructor", argv)
        if(!argv) {
            throw new Error(colors.red(`Command参数为空！`))
        }
        if(!Array.isArray(argv)) {
            throw new Error(colors.red(`Command参数必须为数组！`))
        }
        if(argv.length < 1) {
            throw new Error(colors.red(`Command参数列表为空！`))
        }
        this._argv = argv;
        let runner = new Promise((resolve, reject)=> {
            let chain = Promise.resolve();
            chain = chain.then(()=> {this.checkNodeVersion();});
            chain = chain.then(()=> {this.initArgs();});
            chain = chain.then(()=> {this.init();});
            chain = chain.then(()=> {this.exec();});
            chain.catch(err => {
                log.error(err)
            })
        })
    }
     // 获取当前node版本号，比对最低版本号
    checkNodeVersion() {
        let currentVersion = process.version;
        let lowestVersion = constants.LOWEST_NODE_VERSION;
        log.verbose('当前node版本', currentVersion)
        log.verbose('最低支持node版本', lowestVersion)
        if(!semver.gte(currentVersion, lowestVersion)) {
            throw new Error(colors.red(`liti-cli需要安装v${lowestVersion}以上版本的Node.js`))
        }
    }
    initArgs() {
        this._cmd = this._argv[this._argv.length - 1]
        this._argv = this._argv.slice(0, this._argv.length - 1) 
        //log.verbose(this._cmd, this._argv)
    }
    init() {
        throw new Error('init 必须实现')
    }
    exec() {
        throw new Error('exec 必须实现')
    }
}

module.exports = Command;