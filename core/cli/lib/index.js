'use strict';

module.exports = core;

let path  = require('path')

const semver = require('semver')
const process = require('process')
const colors = require('colors/safe')
let userHome  = require('user-home')
let pathExists  = require('path-exists').sync
let commander  = require('commander')
const constants = require('@liti/constants')
const pkg = require('../package.json')
const exec = require('@liti/exec')
const log = require('@liti/log')

const program = new commander.Command()
async function core() {
    try {
        prepare()
        registerCommand()
    } catch(e) {
        log.error(e.message)
    }
}
async function prepare() {
    checkVersion()
    checkNodeVersion()
    checkRoot()
    checkUserHome()
    checkEnv()
    checkGlobalUpdate()
}

// 检查package.json中的版本号
function checkVersion() {
    log.notice('liti', pkg.version)
}

 // 获取当前node版本号，比对最低版本号
function checkNodeVersion() {
    let currentVersion = process.version;
    let lowestVersion = constants.LOWEST_NODE_VERSION;
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
    if(process.env[constants.CLI_HOME]) {
        cliConfig['cliHome'] = path.join(userHome, process.env[constants.CLI_HOME])
    } else {
        cliConfig['cliHome'] = path.join(userHome, constants.DEFAULT_CLI_HOME)
    }
    process.env[constants.CLI_HOME_PATH] = cliConfig.cliHome;
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

function registerCommand() {
    program
        .name(Object.keys(pkg.bin)[0])
        .usage('<command> [options]')
        .version(pkg.version)
        .option('-d, --debug', '是否开启调试模式', false)
        .option('-tp, --targetPath <targetPath>', '是否指定本地调试文件路径', '')

    program
        .command('init [projectName]')
        .option('-f, --force', '是否强制初始化项目')
        .action(exec)

    // 监听debug命令
    program.on('option:debug', function() {
        process.env[constants.LOG_LEVEL] = 'verbose'
        log.level = process.env[constants.LOG_LEVEL]
        // log.verbose('环境变量', process.env[constants.CLI_HOME_PATH])
    })
    
    // 监听targetPath, 用于是否使用本地代码
    program.on('option:targetPath', function() {
        process.env[constants.CLI_TARGET_PATH] = program._optionValues.targetPath
    })


    // 监听未注册的命令
    program.on('command:*', function (operands) {
        const availableCommands = program.commands.map(cmd => cmd.name());
        console.log(colors.red('未知的命令：' + operands[0]))
        
        if(availableCommands.length > 0) {
            console.log(colors.red('可用命令：' + availableCommands.join(',')))
        }
    });
    
    program.parse(process.argv)
    if(program.args && program.args.length < 1) {
        program.outputHelp()
        console.log()
    }
}