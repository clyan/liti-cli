'use strict';
const axios = require('axios')  
const urlJoin = require('url-join')
const semver = require('semver')
const colors = require('colors')
const log = require('@liti/log')
const semverSort = require('semver-sort');

// 给同一个包名获取版本做缓存
let CacheNpmInfo = {

}

async function getNpmInfo(npmName, registry) {
    if(!npmName) {
        return null;
    }
    const registryUrl = registry || getDefaultRegistry(false);
    const npmInfoUrl = urlJoin(registryUrl, npmName)
    log.info('获取@liti/cli最新版本号中....')
    // 给包的版本做缓存
    if(CacheNpmInfo[npmName]) {
        return Promise.resolve(CacheNpmInfo[npmName])
    }
    return axios.get(npmInfoUrl).then(res => {
        if(res.status !== 200) {
            return null
        }
        CacheNpmInfo[npmName] = res.data
        return res.data
    }).catch(err => {
        const { response } = err;
        if(response.status === 404) {
            log.verbose(colors.yellow(`${npmName}  ${response.statusText} in ${registryUrl}, 检查${npmName}是否已发布`))
        }
        return null
    })
}
// 获取所有版本
async function getNpmVersions(npmName, registry) {
    const data = await getNpmInfo(npmName, registry);
    if(data) {
        return Object.keys(data.versions)
    }
    return [];
}   
// 过滤比当前版本小的，并从大到小排序
function getSemverVersion(baseVersion, versions) {
    versions = versions.filter(version => semver.gte(version, baseVersion))
    return semverSort.desc(versions);
}
// 获取最大的一个版本， 获取返回默认版本
async function getNpmSemverVersion(baseVersion, npmName, registry) {
    const versions = await getNpmVersions(npmName, registry)
    log.verbose(`${npmName}所有版本号：`, JSON.stringify(versions))
    const newVersions = getSemverVersion(baseVersion, versions)
    if(newVersions && newVersions.length > 0) {
        return newVersions[0]
    }
    return baseVersion
}
// 获取最新版本
async function getNpmLatestVersioin(npmName, registry) {
    let versions = await getNpmVersions(npmName, registry)
    if(versions) {
        return semverSort.desc(versions)[0]
    }
    return null;
}
function getDefaultRegistry(isOrigin = true) {
    return isOrigin ? 'https://registry.npmjs.org/' : 'https://registry.npm.taobao.org'
}
module.exports = {
    getNpmVersions,
    getNpmInfo,
    getNpmSemverVersion,
    getDefaultRegistry,
    getNpmLatestVersioin
}