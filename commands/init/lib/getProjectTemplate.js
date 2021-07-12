const request = require("@liti/request")

module.exports = function () {
  return request({
    url: '/project/template'
  })
}