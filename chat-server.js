// http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/
"use strict";
 
// Optional. You will see this name in eg. 'ps' or 'top' command
process.title = 'Chat Mod Server v0.4';
 
// Port where we'll run the websocket server
var webSocketsServerPort = 1337;
 
// websocket and http servers
var webSocketServer = require('websocket').server;
var http = require('http');
 
/**
 * Global variables
 */
// latest 100 messages
var history = [ ];
// list of currently connected clients (users)
var clients = [ ];

// Server Version
var ServerVersion = "0.4";
// Message Of The Day
var MOTDString = "MOTD: Welcome to Game Dev Tycoon Chat Mod! Server version running: " + ServerVersion + ". Enjoy your game!";
 
/**
 * Helper function for escaping input strings
 */
function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
 
// Array with some colors
var colors = [ 'red', 'green', 'blue', 'magenta', 'purple', 'plum', 'orange', 'teal', 'navy', 'lime', 'maroon', 'lightsalmon', 'darkslateblue', 'greenyellow', 'aquamarine', 'olivedrab', 'orangered', 'firebrick', 'peru' ];


/**
 * Helper function for creating network readable objects from strings
 */
var ObjectifyString = (function(parText, parAuthor, parColor){

	console.log(parText + " " + parAuthor + " " + parColor);
	
	return {
            time: (new Date()).getTime(),
            text: htmlEntities(parText),
            author: parAuthor,
            color: parColor
        };
    
    
});


/**
 * This function will read the MOTD from a text file called MOTD.txt
 */
var ChangeMotd = (function(){

	var fs = require('fs');
	fs.readFile( __dirname + '/MOTD.txt', function (err, data) {
		if (err) {
			console.log("Unable to load MOTD.txt file: " + err); 
		}
		MOTDString = data.toString();
		console.log("MOTD Loaded succesfully: " + data.toString());
	});

})






 
/**
 * HTTP server
 */
var server = http.createServer(function(request, response) {
    // Not important for us. We're writing WebSocket server, not HTTP server
});
server.listen(webSocketsServerPort, function() {
    console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
});
 
/**
 * WebSocket server
 */
var wsServer = new webSocketServer({
    // WebSocket server is tied to a HTTP server. WebSocket request is just
    // an enhanced HTTP request. For more info http://tools.ietf.org/html/rfc6455#page-6
    httpServer: server
});
 
// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function(request) {
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
 
    // accept connection - you should check 'request.origin' to make sure that
    // client is connecting from your website
    // (http://en.wikipedia.org/wiki/Same_origin_policy)
    var connection = request.accept(null, request.origin); 
    // we need to know client index to remove them on 'close' event
    var index = clients.push(connection) - 1;
    var userName = false;
    var userColor = false;
 
    console.log((new Date()) + ' Connection accepted.');
 
    // send back chat history
    if (history.length > 0) {
        connection.sendUTF(JSON.stringify( { type: 'history', data: history} ));
    }
    
    
    // Send MOTD
    connection.sendUTF(JSON.stringify( { type: 'system_message', data: ObjectifyString(MOTDString,null,null)} ));
     
    // user sent some message
    connection.on('message', function(message) {
        if (message.type === 'utf8'){

            var packet_in = JSON.parse(message.utf8Data);

            if (packet_in.type === 'handshake') {
                // remember user name
                userName = htmlEntities(packet_in.data);
                // get random color and send it back to the user
                //userColor = colors.shift();
                userColor = colors[Math.floor(Math.random()*colors.length)];
                connection.sendUTF(JSON.stringify({ type:'color', data: userColor }));
                console.log((new Date()) + ' User handshake: ' + userName
                            + ' with ' + userColor + ' color.');
                
                // Broadcast Join Message
                var json = JSON.stringify({ type:'message', data: ObjectifyString("just joined the chat",userName.toString(),userColor.toString()) });
                console.log("just joined the chat " + userName.toString() + " " + userColor.toString());
                var CountMessage = JSON.stringify({ type:'system_message', data: ObjectifyString("users online: " + clients.length.toString(),null,null)});
                
                for (var i=0; i < clients.length; i++) {
                    clients[i].sendUTF(json);
                    clients[i].sendUTF(CountMessage);
                }
                
                
            }

            if (packet_in.type === 'message'){ // log and broadcast the message
                console.log((new Date()) + ' Received Message from '
                            + userName + ': ' + packet_in.data);
                
                // we want to keep history of all sent messages
                var obj = {
                    time: (new Date()).getTime(),
                    text: htmlEntities(packet_in.data),
                    author: userName,
                    color: userColor
                };
                history.push(obj);
                history = history.slice(-100);

                // broadcast message to all connected clients
                var json = JSON.stringify({ type:'message', data: obj });

                for (var i=0; i < clients.length; i++) {
                    clients[i].sendUTF(json);
                }
            }

            if (packet_in.type === 'balance') {

                var rec_obj = packet_in.data;

                var json = JSON.stringify({ type:'balance', data: rec_obj });

                for (var i=0; i < clients.length; i++) {
                    clients[i].sendUTF(json);
                }
            }
        }
    });
 
    // user disconnected
    connection.on('close', function(connection) {
        if (userName !== false && userColor !== false) {
            console.log((new Date()) + " Peer "
                + connection.remoteAddress + " disconnected.");
            // remove user from the list of connected clients
            clients.splice(index, 1);
            
            // Broadcast Part Message
            var LeaveMessage = JSON.stringify({ type:'system_message', data: ObjectifyString("user " + userName  + " has left the chat",null,null)});
            var CountMessage = JSON.stringify({ type:'system_message', data: ObjectifyString("users online: " + clients.length.toString(),null,null)});

            for (var i=0; i < clients.length; i++) {
                clients[i].sendUTF(LeaveMessage);
                clients[i].sendUTF(CountMessage);
            }
        }
    });

    // Server Customized Initalization
    
    ChangeMotd();
    
});
