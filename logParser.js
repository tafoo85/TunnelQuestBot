const { parsePrice } = require('./utils');

// Poll DB for new watches on a set interval:
//                   m   s    ms
const pullInterval = 1 * 60 * 1000;

const AUC_REGEX = /^\[.*?\] (\w+) auctions, '(.*)'$/;
const WTS_REGEX = /WTS(.*?)(?=WTB|$)/gi;

//stream log file(s)
if (require.main === module) {
    const client = require('./client.js');
    const db = require('./db.js');
    const settings = require('./settings.json');
    const tail = require('tail');
    let itemList = [];
    for (const server in settings.servers) {
        const log_tail = new tail.Tail(settings.servers[server].log_file_path);
        log_tail.on("line", function(data) {
            parseLog(data, itemList, server, client);
        });
        log_tail.on("error", function(error) {
            console.log('ERROR: ', error)
        });
    }


    setInterval(() => {
        db.upkeep();
        db.getWatches((results) => {
            itemList = results;
        })
    }, pullInterval)
}

//remove any WTB sections from seller message
function filterWTS(auction_contents) {
    const filteredWTS = [...auction_contents.matchAll(WTS_REGEX)];
    let auctionWTS = "";
    for (let section in filteredWTS) {
        auctionWTS += filteredWTS[section][1].trim() + " ";
    }
    return auctionWTS.toUpperCase().trim();
}

function parseLog(text, itemList, logServer, client) {
    const outgoing = [];
    //test if is auction
    const auction_text = text.match(AUC_REGEX);
    if (auction_text) {
        const auction_user = auction_text[1];
        const auction_contents = auction_text[2];
        //stream for stream channels
        client.streamAuction(auction_user, auction_contents, logServer);
        const auctionWTS = filterWTS(auction_contents);
        if (auctionWTS) {
            itemList.forEach(({watch_id, item_name, user_id, user_name, price, server}) => {
                if (server === logServer && auctionWTS.includes(item_name)) {
                    let filteredAuction = auctionWTS.slice(auctionWTS.indexOf(item_name), auctionWTS.length);
                    let logPrice = parsePrice(filteredAuction, item_name.length);
                    if (price === -1) {
                        let msg = {watchId: watch_id, userId: user_id, userName: user_name, itemName: item_name, sellingPrice: logPrice, seller: auction_user, server: server, fullAuction: text};
                        outgoing.push(msg);
                    }
                    else if (logPrice && logPrice <= price) {
                        let msg = {watchId: watch_id, userId: user_id, userName: user_name, itemName: item_name, sellingPrice: logPrice, seller: auction_user, server: server, fullAuction: text};
                        outgoing.push(msg);
                    }
                }
            })
        }
    }
    sendDiscordMessages(client, outgoing);
}

function sendDiscordMessages(client, outgoing) {
    outgoing.forEach(msg => {
        client.pingUser(
            msg.watchId,
            msg.userName,
            msg.seller,
            msg.itemName,
            msg.sellingPrice,
            msg.server,
            msg.fullAuction)
    });
}

module.exports = {parseLog, filterWTS};