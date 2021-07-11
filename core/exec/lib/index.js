'use strict';
const path = require("path")
const log = require("@liti/log")
const constants = require("@liti/constants")
const Package = require("@liti/package")
const CACHE_DIR = 'dependencies/';
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
    const packageVersion =  'latest'
    let storeDir, pkg;
    if(!targetPath) {
        // 生成缓存路径
        targetPath = path.resolve(homePath, CACHE_DIR) // 生成缓存路径
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
            require(rootFilePath).call(null, Array.from(options))
            log.verbose("rootFilePath",rootFilePath)
        } catch (error) {
            log.error(error)
        }
    }
}
module.exports = exec;
