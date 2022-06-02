const { SlashCommandBuilder } = require('@discordjs/builders');
const { watch } = require('../executors');
const { buttonBuilder, collectButtonInteractions } = require('../clientHelpers');

// This is an example command file for reference - filenames containing "example" are omitted during fs sync

// These command files should contain the config for the command and not much else
module.exports = {
	data: new SlashCommandBuilder()
		.setName('CommandName') //the display + machine name of the command - can't be duplicated or contains spaces
		.setDescription('Add or modify a watch.')
		.addStringOption(option => option.setName('item').setDescription('Enter item name').setRequired(true))
		.addStringOption(option => option.setName('server').setDescription('Select a server').addChoices([['blue server', 'BLUE'], ['green server', 'GREEN']]).setRequired(true))
		.addNumberOption(option => option.setName('price').setDescription('Enter optional maximum price')),
	// logic is shipped to executors file, which does the heavy lifting client side
    // as well as interfaces with the db
        async execute(interaction) {
		await watch(interaction)
			.then(async ({ embeds, metadata }) => {
                // metadata is used for button state and registering listeners on buttons 
				const btnRow = buttonBuilder([{ type: 'itemSnooze', active: metadata?.itemSnooze }, { type: 'unwatch' }, { type: 'itemRefresh' }]);
				await collectButtonInteractions(interaction, metadata);
				await interaction.reply({ embeds, components: [btnRow] });
			})
			.catch(async (err) => {
				await interaction.reply(err.message);
			});
	},
};