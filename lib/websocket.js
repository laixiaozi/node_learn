/**
 * 监听websocket服务
 * */
var WebSocket = require("net");
var crypto = require("crypto");

WebSocket.Start = function Start() {
    var server = this.createServer((socket) => {
        console.log("监听websocket方法");
        socket.once("data", function (buffer) {
            var str = buffer.toString();
            var headers = parseHeader(str);
            if (headers["upgrade"] != "websocket") {
                console.log("非websocket请求");
            } else if (headers["sec-websocket-version"] != 13) {
                console.log("版本号错误");
            } else {
                console.log("websocket 请求");
                console.log("根据协议规定的方式，向前端返回一个请求头，完成建立WebSocket连接的过程");
                console.log("可参考：https://tools.ietf.org/html/rfc6455");

                // 6. 校验Sec-WebSocket-Key，完成连接
                /*
                  协议中规定的校验用GUID，可参考如下链接：
                  https://tools.ietf.org/html/rfc6455#section-5.5.2
                  https://stackoverflow.com/questions/13456017/what-does-258eafa5-e914-47da-95ca-c5ab0dc85b11-means-in-websocket-protocol
                */
                const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
                const key = headers['sec-websocket-key'];
                const hash = crypto.createHash('sha1');  // 创建一个签名算法为sha1的哈希对象
                hash.update(`${key}${GUID}`);  // 将key和GUID连接后，更新到hash
                const result = hash.digest('base64') // 生成base64字符串
                const header = `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-Websocket-Accept: ${result}\r\n\r\n` // 生成供前端校验用的请求头
                // 若客户端校验结果正确，在控制台的Network模块可以看到HTTP请求的状态码变为101 Switching Protocols，同时客户端的ws.onopen事件被触发。
                socket.write(header);
                // 7. 建立连接后，通过data事件接收客户端的数据并处理
                socket.on('data', (buffer) => {
                    const data = decodeWsFrame(buffer);
                    console.log(data);
                    // console.log(data.payloadData && data.payloadData.toString());
                    // opcode为8，表示客户端发起了断开连接
                    if (data.opcode === 8) {
                        socket.end()  // 与客户端断开连接
                    } else {
                        // 接收到客户端数据时的处理，此处默认为返回接收到的数据。
                        socket.write(encodeWsFrame({ payloadData: `服务端接收到的消息为：${data.payloadData ? data.payloadData.toString() : ''}` }))
                    }
                });
            }
        });
    });

    server.listen(3000, "127.0.0.1", () => {
        console.log("websocket 服务器启动")
    });
};


//处理发出去的数据
function encodeWsFrame(data) {
    const isFinal = data.isFinal !== undefined ? data.isFinal : true,
        opcode = data.opcode !== undefined ? data.opcode : 1,
        payloadData = data.payloadData ? Buffer.from(data.payloadData) : null,
        payloadLen = payloadData ? payloadData.length : 0;
    let frame = [];
    if (isFinal) frame.push((1 << 7) + opcode);
    else frame.push(opcode);

    if (payloadLen < 126) {
        frame.push(payloadLen);
    } else if (payloadLen < 65536) {
        frame.push(126, payloadLen >> 8, payloadLen & 0xFF);
    } else {
        frame.push(127);
        for (let i = 7; i >= 0; --i) {
            frame.push((payloadLen & (0xFF << (i * 8))) >> (i * 8));
        }
    }

    frame = payloadData ? Buffer.concat([Buffer.from(frame), payloadData]) : Buffer.from(frame);
    // console.dir(decodeWsFrame(frame));
    return frame;
}

//处理收到的数据
function decodeWsFrame(data) {
    let start = 0;
    let frame = {
        isFinal: (data[start] & 0x80) === 0x80,
        opcode: data[start++] & 0xF,
        masked: (data[start] & 0x80) === 0x80,
        payloadLen: data[start++] & 0x7F,
        maskingKey: '',
        payloadData: null
    };

    if (frame.payloadLen === 126) {
        frame.payloadLen = (data[start++] << 8) + data[start++];
    } else if (frame.payloadLen === 127) {
        frame.payloadLen = 0;
        for (let i = 7; i >= 0; --i) {
            frame.payloadLen += (data[start++] << (i * 8));
        }
    }

    if (frame.payloadLen) {
        if (frame.masked) {
            const maskingKey = [
                data[start++],
                data[start++],
                data[start++],
                data[start++]
            ];

            frame.maskingKey = maskingKey;
            frame.payloadData = data
                .slice(start, start + frame.payloadLen)
                .map((byte, idx) => byte ^ maskingKey[idx % 4]);
        } else {
            frame.payloadData = data.slice(start, start + frame.payloadLen);
        }
    }

    // console.dir(frame);
    return frame;
}


//header处理
function parseHeader(headerStr) {
    var headerArr = headerStr.split("\r\n");
    let headers = {};
    // console.log(headerArr);
    headerArr.shift();
    //分割和去除空格 变成 k->v 格式
    headerArr.forEach((item) => {
        let [name, value] = item.split(":")
        // console.log(name);
        // console.log(value);
        //去除无效的字符并且转换为小写
        if (name.length > 0 && value.length > 0) {
            name = name.replace(/^\s|\s+$/g, '').toLowerCase();
            value = value.replace(/^\s|\s+$/g, '');
            headers[name] = value;
        }
    });
    // console.log(headers);
    return headers
}

module.exports = WebSocket;