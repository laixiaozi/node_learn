/**
 * 启动一个服务器，监听http请求
 * */

http = require("http");

var Server  = {};

Server.Start = ()=>{
  return http.createServer();
};

module.exports = Server;