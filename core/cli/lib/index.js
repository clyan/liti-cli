'use strict';

module.exports = core;
const pkg = require('../package.json')
const log = require('@liti/log')
const semver = require('semver')
const process = require('process')
const colors = require('colors/safe')
let userHome  = require('user-home')
let path  = require('path')
let pathExists  = require('path-exists').sync
const constant = require('./const')
// 参数检查
let args, config;
async function core() {
    try {
        checkVersion()
        checkNodeVersion()
        checkRoot()
        checkUserHome()
        checkInputArgs()
        checkEnv()
        checkGlobalUpdate()
    } catch(e) {
        log.error(e.message)
    }
}

// 检查package.json中的版本号
function checkVersion() {
    log.notice('liti', pkg.version)
}

 // 获取当前node版本号，比对最低版本号
function checkNodeVersion() {
    let currentVersion = process.version;
    let lowestVersion = constant.LOWEST_NODE_VERSION;
    if(!semver.gte(currentVersion, lowestVersion)) {
        throw new Error(colors.red(`liti-cli需要安装v${lowestVersion}以上版本的Node.js`))
    }
}
function checkRoot() {
    let rootCheck  = require('root-check')
    // 检查root ,如果不是会自动降级，核心是process.geteuid,用于linux和mac
    rootCheck()
}
// 用户主目录
function checkUserHome() {
    if(!userHome || !pathExists(userHome)) {
        throw new Error(colors.red('当前登录用户主目录不存在'))
    } else {
        log.info(`用户主目录${userHome}`)
    }
}

// 检查入参
function  checkInputArgs() {
    let minimist  = require('minimist')
    args = minimist(process.argv.slice(2))
    checkArgs()
}

function checkArgs() {
    if(args.debug) {
        process.env.LOG_LEVEL = 'verbose'
    } else {
        process.env.LOG_LEVEL = 'info'
    }
    log.level = process.env.LOG_LEVEL
}
// 检查环境变量
function checkEnv() {
    let dotenv  = require('dotenv')
    const dotenvPath = path.resolve(userHome, '.env')
    if(pathExists(dotenvPath)) {
        dotenv.config({
            path: path.resolve(userHome, '.env')
        })
    }
    createDefaultConfig()
    log.verbose('环境变量', process.env.CLI_HOME_PATH)
}

function createDefaultConfig() {
    const cliConfig = {
        home: userHome
    }
    if(process.env.CLI_HOME) {
        cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME)
    } else {
        cliConfig['cliHome'] = path.join(userHome, constant.DEFAULT_CLI_HOME)
    }
    process.env.CLI_HOME_PATH = cliConfig.cliHome;
}
async function checkGlobalUpdate() {
    // 1. 获取当前版本号和模块名
    const currentVersion = pkg.version;
    const npmName = pkg.name;
    // 2. 调用npm API 获取所有版本
    const { getNpmSemverVersion } = require('@liti/get-npm-info')
    
    // 3. 提取所有版本号, 比对哪些版本号是大于当前版本号
    const lastVersion = await getNpmSemverVersion(currentVersion, npmName)
    // 4. 获取最新版本号, 提示用户更新到最新版本
    if(lastVersion && semver.gt(lastVersion, currentVersion)) {
        log.warn('更新提示:',colors.yellow(`请手动更新${npmName}, 当前版本: ${currentVersion}, 最新版本: ${lastVersion}
更新命令： npm install -g ${npmName}`))
    }
}