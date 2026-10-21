// register-commands.js
const {
    SlashCommandBuilder,
    REST,
    Routes
} = require('discord.js');
require('dotenv').config();

const commands = [
    new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Balas dengan Pong dan pesan tambahan')
    .addStringOption(option =>
        option.setName('pesan')
        .setDescription('Pesan tambahan')
        .setRequired(false)
    ),
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

rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID), {
            body: commands
        }
    ).then(() => console.log('✅ Slash commands berhasil didaftarkan.'))
    .catch(console.error);