#! /usr/bin/env node
const importLocal = require('import-local')
// 优先使用本地模块
if(importLocal(__filename)) {
  require('npmlog').info('cli', '正在使用 liti-cli 本地版本')
} else {
  require('../lib')(process.argv.slice(2))
}