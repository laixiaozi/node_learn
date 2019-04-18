const server = require("./lib/server");
const url = require("url");

App = server.Start();

//链接状态
App.on("connect",(request, socket, head)=>{
    console.log("http链接服务器");
});

App.on("data",(socket)=>{
    console.log("tcp 链接服务器");
});


App.on("connection",(socket)=>{
   console.log("tcp 链接服务器");
});

//request 是一个http.incomingMessage
App.on("request",(request, response)=>{
     response.stateCode=200;
     console.log("当前请求url是：",request.url);
     var nowtm = new Date().getTime();
     response.setHeader("Set-Cookie",["tm="+nowtm]);
     console.log(response.getHeaders());
     response.end("helloword.")
});

//启动服务
App.listen(8080,(error)=>{
    console.log("启动服务器开始监听8080端口");
});