const Discord = require('discord.io');
const logger = require('winston');
const auth = require('./auth.json');
const helpMsg = '\n\n***TunnelQuestBot Help***\n***NOTE:***\n-All commands begin with an exclamation mark (\"!\").\n-Arguments listed in carats (\"<\" \">\") should be replaced by your input data.\n\n***COMMANDS***\n!help   (displays available commands)\n!add watch: <item>, <min price>, <server>   (starts a watch based on enetered parameters - wathces expire after 7 days)\n!end watch: <item>   (ends a currently running watch)\n!show watch: <item>   (lists details for a watch for entered item - if no item is provided, lists details for all watches)\n!show watches   (lists details for all watches)'
const db = require('./db.js');

// logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

// Initialize Discord Client
var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});

bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});

bot.on('message', function (user, userID, channelID, message, evt) {
    console.log(userID);
    console.log(message);
    
    // listen for messages that will start with `!`
    if (message.substring(0, 1) == '!') {
        var args = message.toLowerCase().substring(1).split(/,|:/);
        var cmd = args[0];
        args = args.splice(1);
        args.forEach((elem, index, array) => array[index] = elem.trim());
        console.log('cmd == ', cmd);
        switch(cmd) {
            // !help
            case 'help':
                bot.sendMessage({
                    to: channelID,
                    message: 'Thanks for using TunnelQuestBot! ' + helpMsg
                });
                break;

            // !add watch <item>
            case 'add watch':
                console.log('add watch command received.  args = ', args)
                //TODO: don't cast to number, do on db file and add check for 'k'
                db.addWatch(userID, args[0], Number(args[1]), args[2]);
                break;

            // !end watch <item>
            case 'end watch':
                console.log('end watch command received.  args = ', args)
                db.endWatch(userID, args[0], args[1]);
                break;
                
            // !show watch <item>
            case 'show watch':
                console.log('show watch command received.  args = ', args)
                break;

            // !show watches
            case 'show watches':
                console.log('add watch command received.  args = ', args)
                db.showWatches(userID, (res) => {
                    console.log('client side:', typeof res, res)
                    msgUser(userID, 'Here are your watches: \n' + res);
                });
                
                break;

            //default: command not recognized...
            default: 
                bot.sendMessage({
                    to: channelID,
                    message: 'Sorry, I didn\'t recognized that command.  Please check your syntax and try again. ' + helpMsg
                });
            break;
         }
    }
    else if (userID != 643497793834582017) {
        console.log('else block')
        bot.sendMessage({
            to: channelID,
            message: 'I\'d love to chat, but I\'m just a dumb bot.  Try !help'
        });
    }     
});

function pingUser (seller, item, price, server) {
    bot.sendMessage({
    to: '213474329747259401',
    message: `${seller} is currently selling ${item} for ${price} on Project 1999 ${server} server`
    })
};

function msgUser(userID, msg) {
    bot.sendMessage({
        to: userID,
        message: msg
    })
}

module.exports = {pingUser, msgUser}