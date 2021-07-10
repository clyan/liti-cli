'use strict';
const axios = require('axios')  
const urlJoin = require('url-join')
const semver = require('semver')
const colors = require('colors')
const log = require('@liti/log')
async function getNpmInfo(npmName, registry) {
    if(!npmName) {
        return null;
    }
    const registryUrl = registry || getDefaultRegistry(false);
    const npmInfoUrl = urlJoin(registryUrl, npmName)
    return axios.get(npmInfoUrl).then(res => {
        if(res.status !== 200) {
            return null
        }
        return res.data
    }).catch(err => {
        const { response } = err;
        if(response.status === 404) {
            log.warn(colors.yellow(`${npmName}  ${response.statusText} in ${registryUrl}, 检查${npmName}是否已发布`))
        }
        return null
    })
}

async function getNpmVersions(npmName, registry) {
    const data = await getNpmInfo(npmName, registry);
    if(data) {
        return Object.keys(data.versions)
    }
    return [];
}   
function getSemverVersion(baseVersion, versions) {
    versions = versions.filter(version => semver.gte(version, baseVersion))
    const semverSort = require('semver-sort');
    return semverSort.desc(versions);
}
async function getNpmSemverVersion(baseVersion, npmName, registry) {
    const versions = await getNpmVersions(npmName, registry)
    const newVersions = getSemverVersion(baseVersion, versions)
    if(newVersions && newVersions.length > 0) {
        return newVersions[0]
    }
    return baseVersion
}
function getDefaultRegistry(isOrigin = true) {
    return isOrigin ? 'https://registry.npmjs.org/' : 'https://registry.npm.taobao.org'
}
module.exports = {
    getNpmVersions,
    getNpmInfo,
    getNpmSemverVersion
}