require('dotenv').config();
const {
    REST,
    Routes,
    SlashCommandBuilder
} = require('discord.js');

const commands = [
    new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Balas dengan Pong dan input')
    .addStringOption(option =>
        option.setName('target')
        .setDescription('Apa yang ingin kamu ping')
        .setRequired(true)),
    new SlashCommandBuilder()
    .setName('help')
    .setDescription('Menampilkan bantuan'),
    new SlashCommandBuilder()
    .setName('info')
    .setDescription('Menampilkan info bot'),
].map(command => command.toJSON());

const rest = new REST({
    version: '10'
}).setToken(process.env.TOKEN);

(async() => {
    try {
        console.log('🔁 Mengupdate slash commands...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID), {
                body: commands
            },
        );
        console.log('✅ Selesai mendaftarkan commands!');
    } catch (error) {
        console.error(error);
    }
})();