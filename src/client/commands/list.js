
const { SlashCommandBuilder } = require('@discordjs/builders');
const { list } = require('../executors')
const {
	MessageEmbed, ThreadChannel
} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('list')
		.setDescription('Lists available commands'),
	async execute(interaction) {
		//ideally I'd like to handle all responses in these files, but oddly could
		//not get async/await to work properly in this code block, so the interaction
		//is passed to executors
		await list(interaction).then(console.log).catch(console.error);
	
	},
};