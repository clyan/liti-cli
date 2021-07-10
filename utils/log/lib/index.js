'use strict';
const log = require('npmlog')

log.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info'; // 判断debug模式

log.heading = 'liti';  //修改前缀
log.headingStyle = { fg: 'white', bg: 'black' }
log.addLevel('success', 2000, { fg: 'green', bold: true }) // 添加自定义指令

module.exports = log;
// log.addLevel('silly', -Infinity, { inverse: true }, 'sill')
// log.addLevel('verbose', 1000, { fg: 'blue', bg: 'black' }, 'verb')
// log.addLevel('info', 2000, { fg: 'green' })
// log.addLevel('timing', 2500, { fg: 'green', bg: 'black' })
// log.addLevel('http', 3000, { fg: 'green', bg: 'black' })
// log.addLevel('notice', 3500, { fg: 'blue', bg: 'black' }) 
// log.addLevel('warn', 4000, { fg: 'black', bg: 'yellow' }, 'WARN')
// log.addLevel('error', 5000, { fg: 'red', bg: 'black' }, 'ERR!')
// log.addLevel('silent', Infinity)

