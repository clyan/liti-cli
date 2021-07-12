'use strict';
const path = require("path")
const log = require("@liti/log")
const constants = require("@liti/constants")
const { exec:spawn } = require("@liti/utils")
const Package = require("@liti/package")
const SETINGS = {
    init: '@liti/init'
}
async function exec(...options) {
    let targetPath = process.env[constants.CLI_TARGET_PATH]
    const homePath = process.env[constants.CLI_HOME_PATH]
    log.verbose('targetPath', targetPath)
    log.verbose('homePath', homePath)
    const [ name, option, command ] = options;
    log.verbose('获取的是liti init test的init', command.parent.args[0])
    let packageName = SETINGS[command.parent.args[0]]
    const packageVersion =  constants.LATEST_VERSION
    let storeDir, pkg;
    if(!targetPath) {
        // 生成缓存路径
        targetPath = path.resolve(homePath, constants.CACHE_DIR) // 生成缓存路径
        storeDir = path.resolve(targetPath, 'node_modules');
        log.verbose('targetPath', targetPath)
        log.verbose('storeDir', storeDir)
        pkg = new Package({
            targetPath,
            packageName,
            storeDir,
            packageVersion
        })
        if(await pkg.exists()) {
            // 更新package
            log.info("更新package中...")
            await pkg.update()
        } else {
            // 安装
            await pkg.install()
        }
    } else {
        // 调用本地的init包
        pkg = new Package({
            targetPath,
            packageName,
            storeDir,
            packageVersion
        })
    }
    // 引入本地的包
    const rootFilePath = pkg.getRootFilePath()
    log.verbose("rootFilePath", rootFilePath)
    if(rootFilePath) {
        // 执行init包
        // log.verbose("options",options)
        try {
            // require(rootFilePath).call(null, Array.from(options))
            // 在node子进程中调用
            const args = Array.from(options);
            const cmd = args[args.length - 1];
            let o = Object.create(null);
            Object.keys(cmd).forEach((key) => {
                if(cmd.hasOwnProperty(key) && !key.startsWith('_') && key !== 'parent') {
                    o[key] = cmd[key]
                }
            })
            args[args.length - 1] = o
            let code = `require('${rootFilePath}').call(null, ${ JSON.stringify(args)})`
            let child = spawn('node', ['-e', code], {
                cmd: process.cwd(),
                stdio: 'inherit'
            })
            child.on('error', e => {
                log.error(e.message)
                process.exit(1)
            })
            child.on('exit', e => {
                log.verbose('命令执行成功', e)
                process.exit(e)
            })
            log.verbose("rootFilePath",rootFilePath)
        } catch (error) {
            log.error(error)
        }
    }
}
module.exports = exec;
