/* eslint-disable indent */
/* eslint-disable max-nested-callbacks */
const {
	Client,
	Intents,
	Collection,
	MessageEmbed,
} = require('discord.js');
const {
	Routes,
} = require('discord-api-types/v9');
const {
	REST,
} = require('@discordjs/rest');
const logger = require('winston');
const settings = require('../settings/settings.json');
const db = require('../db/db.js');
const fs = require('fs');
const path = require('path');
const commandDir = path.join(__dirname, 'commands');
const standardCommands = require('./executors.js');
const commandFiles = fs.readdirSync(commandDir).filter(file => file.endsWith('.js'));
const { fetchAndFormatAuctionData, fetchImageUrl, fetchWikiPricing, SERVER_COLOR } = require('../utility/wikiHandler');
const { formatCapitalCase, removeLogTimestamp } = require('../utility/utils.js');
const moment = require('moment');
const wiki_url = require('../utility/data/items.json');
const { embedReactions, MessageType } = require('./clientHelpers');
const { helpMsg, welcomeMsg } = require('../content/messages');
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
	colorize: true,
});
logger.level = 'debug';

// Initialize Discord Client
const bot = new Client({ intents: [Intents.FLAGS.GUILDS] });
const TOKEN = settings.discord.token;
const GUILD = settings.discord.guild;
const COMMAND_CHANNEL = settings.discord.command_channel;
const GENERAL_CHANNEL = settings.discord.general_channel;
const BLUE_TRADING_CHANNEL = settings.servers.BLUE.trading_channel;
const GREEN_TRADING_CHANNEL = settings.servers.GREEN.trading_channel;

bot.on('ready', () => {
	logger.info(`Logged in as ${bot.user.tag}!`);
});

// server greeting for users who join
bot.on('guildMemberAdd', (member) => {
	const memberTag = member.user.tag; // GuildMembers don't have a tag property, read property user of guildmember to get the user object from it
	bot.users.cache.get(member.user.id).send(`**Hi ${memberTag}!**\n\n` + welcomeMsg).catch(console.error);
});

bot.commands = new Collection();

const commands = [];

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	commands.push(command.data.toJSON());
	bot.commands.set(command.data.name, command);
}

// Don't get burned by testing development with global commands!
//
// Global commands are cached for one hour. New global commands will fan out
// slowly across all guilds and will only be guaranteed to be updated after an
// hour. Guild commands update instantly. As such, we recommend you use guild-based
// commands during development and publish them to global commands when they're
// ready for public use.

// TODO: dont forget to upgrade node to 14 and npm install, as well as adjust discord permissions for application commands

// When the client is ready, run this code (only once)

// TODO: can a pinned embedded message with a select for WTS/WTB, server preference, etc to allow for easier command syntax and results?
bot.once('ready', () => {
	console.log('Ready!');
	// Registering the commands in the client
	const CLIENT_ID = bot.user.id;
	const rest = new REST({
		version: '9',
	}).setToken(TOKEN);
	(async () => {
		try {
			await rest.put(
				Routes.applicationGuildCommands(CLIENT_ID, GUILD), {
					body: commands,
				},
			);
			console.log('Successfully registered guild application commands');
		}
 catch (error) {
			if (error) console.error(JSON.stringify(error.rawError.errors));
		}
	})();
});


// command syntax as well as executors are defined in /commands directory
bot.on('interactionCreate', async interaction => {
	// TODO: block stream channels, etc.
	if (!interaction.isCommand()) return;

	const command = bot.commands.get(interaction.commandName);
	if (!command) return;

	try {
		await command.execute(interaction);
	}
 catch (error) {
		console.error('catch block error', error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

// bot.on('interactionCreate', interaction => {
// 	if (!interaction.isButton()) return;
// 	console.log(interaction);
// 	switch (interaction.customId.toUpperCase()) {
// 		case 'SNOOZE':
// 			db.snooze('user', interaction.user.id)
// 				.then()
// 	}
// });



// bot.on('message', function(message) {
// 	// ignore bots
// 	if (message.author.bot) {
// 		return;
// 	}

// 	// listen for messages that will start with `!`
// 	if (message.content.startsWith('!')) {
// 		// console.log(message.content);
// 		const spaceIndex = message.content.indexOf(' ');
// 		let cmd = '';
// 		let args;
// 		// allow users to enter single word commands with no spaces
// 		if (spaceIndex === -1) {
// 			cmd = message.content.substring(1).toUpperCase();
// 		}
// 		else {
// 			cmd = message.content.substring(1, spaceIndex).toUpperCase();
// 			args = message.content.substring(spaceIndex + 1).toUpperCase().split(',');
// 			args.forEach((elem, index, array) => array[index] = elem.trim().replace(/[<>"\{\}\[\]]/g, ''));
// 		}

// 		// if user entered a depreciated command, inform them
// 		const deprecatedCmds = ['ADD', 'END', 'SHOW'];
// 		let abort = false;
// 		deprecatedCmds.forEach((deprecatedCmd) => {
// 			if (deprecatedCmd === cmd) {
// 				message.author.send(`It looks like you've entered a deprecated command.  Please see the current commands below:${helpMsg}`);
// 				abort = true;
// 			}
// 		});

// 		if (abort) return;

// 		// if user entered a current command ending in ':', inform them and trim the colon off
// 		const colonCmds = ['WATCH:', 'UNWATCH:', 'BLOCK:', 'UNBLOCK:', 'SNOOZE:', 'UNSNOOZE:', 'LIST:', 'WATCHES:', 'EXTEND:', 'HELP:'];
// 		colonCmds.forEach((colonCmd) => {
// 			if (colonCmd === cmd) {
// 				message.author.send('Current commands do not require a colon.  I entered your command, but wanted to give you a heads-up.');
// 				cmd = cmd.substring(0, cmd.length - 1);
// 				return;
// 			}
// 		});
// 		switch(cmd) {
// 		// !help
// 		case 'HELP':
// 			standardCommands.help(message);
// 			break;
// 		// !watch <item>
// 		case 'WATCH':
// 			standardCommands.watch(message, args);
// 			break;
// 		// !unwatch: <item>, <server>
// 		case 'UNWATCH':
// 			standardCommands.unwatch(message, args);
// 			break;
// 		// !watches: [search term]
// 		case 'WATCHES':
// 			standardCommands.watches(message, args);
// 			break;
// 		// !list
// 		case 'LIST':
// 			standardCommands.list(message, args);
// 			break;
// 		// !extend
// 		case 'EXTEND':
// 			standardCommands.extend(message, args);
// 			break;
// 		// !block
// 		case 'BLOCK':
// 			standardCommands.block(message, args);
// 			break;
// 		// !unblock
// 		case 'UNBLOCK':
// 			standardCommands.unblock(message, args);
// 			break;
// 		// !blocks
// 		case 'BLOCKS':
// 			standardCommands.blocks(message, args);
// 			break;
// 		// !snooze
// 		case 'SNOOZE':
// 			standardCommands.snooze(message, args);
// 			break;
// 		// !unsnooze
// 		case 'UNSNOOZE':
// 			standardCommands.unsnooze(message, args);
// 			break;
// 		// !gnome fact
// 		case 'GNOME FACT':
// 			standardCommands.gnomeFact(message, args);
// 			break;
// 		// default: command not recognized...
// 		default:
// 			standardCommands.unrecognized(message, args);
// 			break;
// 		}

// 		// message the general channel that commands are not recognized in this channel if command detected:
// 		if (!message.author.bot && message.channel.type === 'text' && message.channel.id !== COMMAND_CHANNEL) {
// 			bot.channels.cache.get(COMMAND_CHANNEL).send(`Hi <@${message.author.id}>, I received your command but deleted it from <#${GENERAL_CHANNEL}> to keep things tidy.  In the future, please use this channel instead or send me a direct message.  Thanks!`).catch(console.error);
// 			message.delete().catch(console.error);
// 		}
// 	}
// 	// delete or remove auction spam from general chat
// 	else if (!message.author.bot && message.channel.type === 'text' && message.channel.id === GENERAL_CHANNEL) {
// 		const content = message.content.toUpperCase();
// 		if (content.includes('WTS') || content.includes('WTB') || content.includes('WTT')) {
// 			let msgMoved = false;
// 			if (content.includes('BLUE')) {
// 				bot.channels.cache.get(BLUE_TRADING_CHANNEL).send(`Hi <@${message.author.id}>, I'm trying to keep <#${GENERAL_CHANNEL}> free of auction listings.  I've moved your message to this channel instead.\n\n**${message.author.username} auctions:** \n\`${message.content}\``).catch(console.error);
// 				msgMoved = true;
// 			}
// 			if (content.includes('GREEN')) {
// 				bot.channels.cache.get(BLUE_TRADING_CHANNEL).send(`Hi <@${message.author.id}>, I'm trying to keep <#${GENERAL_CHANNEL}> free of auction listings.  I've moved your message to this channel instead.\n\n**${message.author.username} auctions:** \n\`${message.content}\``).catch(console.error);
// 				msgMoved = true;
// 			}
// 			if (!msgMoved) {
// 				message.author.send(`Hi <@${message.author.id}>, I'm trying to keep #general_chat free of auction listings.  Please use either <#${GREEN_TRADING_CHANNEL}> or <#${BLUE_TRADING_CHANNEL}>. Thanks!`).catch(console.error);
// 			}
// 			message.delete().catch(console.error);
// 		}
// 	}
// 	else if (message.channel.id === COMMAND_CHANNEL || message.channel.type === 'dm') {
// 		message.author.send('I\'d love to chat, but I\'m just a dumb bot.  Try !help').catch(console.error);
// 	}
// });

function sendMessageWithReactions(user, msg, data) {
	user.send(msg)
		.then(message => {
			embedReactions(message, data, MessageType[2]);
		})
		.catch(console.error);
}


async function pingUser(watchId, user, userId, seller, item, price, server, fullAuction, timestamp) {
	// query db for communication history and blocked sellers - abort if not valid
	const validity = await db.validateWatchNotification(userId, watchId, seller);
	// console.log(now, 'user = ', user, 'seller = ', seller, 'item = ', item, 'validity = ', validity)
	if (!validity) return;
	await db.postSuccessfulCommunication(watchId, seller);

	const url = await fetchImageUrl(item).catch(console.error);
	const formattedPrice = price ? `${price}pp` : 'No Price Listed';
	const formattedItem = formatCapitalCase(item);
	const historical_pricing = await fetchWikiPricing(item, server);

	const fields = [];

	fields.push({
		name: formattedPrice || 'No Price Listed',
		value: `${formatCapitalCase(item)}`,
		inline: false,
	});

	if (historical_pricing) {
		fields.push({
			name: 'Historical Pricing Data',
			value: historical_pricing,
			inline: false,
		});
	}

	const data = {
		item,
		seller,
		server,
		watchId,
	};

	const msg = new MessageEmbed()
		.setColor(SERVER_COLOR[server])
		.setImage(url === 'https://i.imgur.com/wXJsk7Y.png' ? null : url)
		.setTitle(`${formatCapitalCase(item)}`)
		.setAuthor('Watch Notification', url, wiki_url[item] ? `https://wiki.project1999.com${wiki_url[item]}` : null)
		.setDescription(`**${seller}** is currently selling **${formatCapitalCase(item)}** ${price ? 'for **' + price + 'pp**' : ''} on Project 1999 **${formatCapitalCase(server)}** server. \n\n\`\`${removeLogTimestamp(fullAuction)}\`\``)
		.addFields(fields)
		.setFooter({ text: `To snooze this watch for 6 hours, click 💤\nTo end this watch, click ❌\nTo ignore auctions by this seller, click 🔕\nTo extend this watch, click ♻\nWatch expires ${moment(timestamp).add(7, 'days').fromNow()}` })
		.setTimestamp();
	if (bot.users.cache.get(user.toString()) === undefined) {
		bot.guilds.cache.get(GUILD).members.fetch(user.toString())
			.then((myUser)=>{
				sendMessageWithReactions(myUser, msg, data);
			})
			.catch(console.error);
	}
	else {
		sendMessageWithReactions(bot.users.cache.get(user.toString()), msg, data);
	}
}

function streamAuction(auction_user, auction_contents, server) {
	const channelID = settings.servers[server].stream_channel;
	const classicChannelID = settings.servers[server].stream_channel_classic;
	const rawAuction = `\`\`\`\n${auction_user} auctions, \'${auction_contents}\'\`\`\``;

	fetchAndFormatAuctionData(auction_user, auction_contents, server).then(formattedAuctionMessage => {
		bot.channels.fetch(channelID.toString())
			.then((channel) => {
				channel.send(formattedAuctionMessage);
			})
			.catch(console.error);
	}).catch(console.error);

	bot.channels.fetch(classicChannelID.toString())
		.then((channel) => {
			channel.send(rawAuction);
		})
		.catch(console.error);
}


bot.login(TOKEN);


module.exports = { pingUser, streamAuction,  };