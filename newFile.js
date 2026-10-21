const { Routes } = require('discord.js');
const { rest, commands } = require('./deploy-commands');

(async() => {
    try {
        console.log('📡 Registering slash commands...');
        await rest.put(
            Routes.applicationCommands(process.env, .1395398313225748491), { body: commands }
        );
        console.log('✅ Selesai!');
    } catch (error) {
        console.error(error);
    }
})();