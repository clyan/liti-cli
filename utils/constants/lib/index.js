'use strict';

exports.LOWEST_NODE_VERSION = '14.0.0';
// 如：用户 c://users/nice 目录下的脚手架目录 c://users/nice/.liti-cli 
exports.DEFAULT_CLI_HOME = '.liti-cli';
// 业务脚手架的缓存目录，比如默认使用command/init这个项目, 也就是@liti/init进行创建项目
exports.CACHE_DIR = 'dependencies/';
// npm包的最大版本号
exports.LATEST_VERSION = 'latest';
// 模板保存总目录, 
exports.TEMPLATE_DIR = 'template/';
// 模板保存的子目录  保存在: template/node_modules/ ,如：  c://users/nice/.liti-cli/template/node_modules/
exports.NODE_MODULES = 'node_modules/';

// 环境变量
// 仅用于开发中的使用到的环境变量，统一管理
exports.CLI_HOME = 'CLI_HOME'
exports.CLI_HOME_PATH = 'CLI_HOME_PATH'
exports.LOG_LEVEL = 'LOG_LEVEL'
exports.CLI_TARGET_PATH = 'CLI_TARGET_PATH'
