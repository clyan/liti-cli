'use strict';
const path = require("path")
const pkgDir = require("pkg-dir").sync
const utils = require("@liti/utils")
const npminstall = require("npminstall")
const pathExists = require("path-exists")
const formatPath = require("@liti/format-path")
const getNpmInfo = require("@liti/get-npm-info")
const constants = require("@liti/constants")
const log = require("@liti/log")
const fse = require('fs-extra')
class Package {
    constructor(options) {
        if(!options ) {
            throw new Error("package 类的options参数不能为空！")
        }
        if(!utils.isObject(options)) {
            throw new Error("package 类的options参数必须为对象！")
        }
        this.targetPath = options.targetPath
        // 缓存package目录
        this.storeDir = options.storeDir
        // package的name
        this.packageName = options.packageName;
        // package的version
        this.packageVersion = options.packageVersion;
        // package的缓存目录前缀
        this.cacheFilePathPrefix = this.packageName.replace('/', '_');
    }
    async prepare() {
        // 缓存目录不存在，则创建
        if(this.storeDir && !pathExists(this.storeDir)) {
            fse.mkdirSync(this.storeDir)
        }
        if(this.packageVersion === constants.LATEST_VERSION) {
            this.packageVersion = await getNpmInfo.getNpmLatestVersioin(this.packageName, )
        }
        log.verbose(this.packageVersion)
    }
    get cacheFilePath() {
        return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`)
    }
    getSpecificCacheFilePath(packageVersion) {
        return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`)
    }
    // 判断当前路径是否存在
    async exists() {
        if(this.storeDir) {
            await this.prepare()
            log.verbose('this.cacheFilePath', this.cacheFilePath)
            return pathExists(this.cacheFilePath)
        } else {
            return pathExists(this.targetPath)
        }
    }
    // 安装package
    install() {
        return npminstall({
            root: this.targetPath,
            storeDir: this.storeDir,
            registry: getNpmInfo.getDefaultRegistry(),
            pkgs:[
                { name: this.packageName, version: this.packageVersion }
            ]
        })
    }
    // 更新Package
    async update() {
        await this.prepare()
        // 1. 获取最新的npm 模块版本号
        const latestPackageVersion = await getNpmInfo.getNpmLatestVersioin(this.packageName)
        log.verbose("latestPackageVersion", latestPackageVersion)
        // 2. 查询最新版本号的路径是否存在
        let  latestFilePath =  this.getSpecificCacheFilePath(latestPackageVersion)
        log.verbose("latestFilePath", latestFilePath)
        log.verbose("storeDir", this.storeDir)
        // 3. 如果不存在，则直接安装最新版本
        if(!await pathExists(latestFilePath)) {
            await npminstall({
                root: this.packageName,
                storeDir: this.storeDir,
                registry: getNpmInfo.getDefaultRegistry(false),
                pkgs:[
                    { name: this.packageName, version: latestPackageVersion }
                ]
            })
        }
        this.packageVersion = latestPackageVersion
    }
    // 获取入口文件的路径
    getRootFilePath() {
        function _getRootFile(targetPath) {
            // 1. 获取package.json所在目录
            const dir = pkgDir(targetPath)
            // 2. 读取package.json
            if(dir) {
                const pkgFile = require(path.resolve(dir, 'package.json'))
                // 3. 寻找main/lib
                if(pkgFile && (pkgFile.main || pkgFile.lib)) {
                    // 4. 路径的兼容（macOS/windows）
                    let tempPath = pkgFile.main ? pkgFile.main : pkgFile.lib
                    return formatPath(path.resolve(dir, tempPath))
                }
            }
            return null;
        }
        // 使用缓存目录的情况
        if(this.storeDir) {
            return _getRootFile(this.cacheFilePath)
        } else {
            return _getRootFile(this.targetPath)
        }
    }
}

module.exports = Package;