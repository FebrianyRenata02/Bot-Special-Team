const {
    Events,
    EmbedBuilder
} = require('discord.js');
const {
    client,
    ADMIN_ROLE_ID
} = require('.');

// =========================
// INTERACTION
// =========================
client.on(Events.InteractionCreate, async(interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const {
        commandName
    } = interaction;

    // =========================
    // EVENT
    // =========================
    if (commandName === 'event') {
        const nama = interaction.options.getString('nama');
        const detik = interaction.options.getInteger('waktu');
        const link = interaction.options.getString('link') || 'Tidak ada link';

        const adminTag = `<@&${ADMIN_ROLE_ID}>`;

        // EMBED AWAL
        const embedStart = new EmbedBuilder()
            .setTitle('⏰ Event Akan Dimulai')
            .setDescription(`🎮 **${nama}**`)
            .addFields({
                name: '📋 Pendaftaran',
                value: link
            }, {
                name: '👤 Admin',
                value: adminTag
            })
            .setColor(0x00ff00)
            .setFooter({
                text: `Dimulai dalam ${detik} detik`
            });

        await interaction.reply({
            embeds: [embedStart]
        });

        // SAAT EVENT DIMULAI
        setTimeout(async() => {
            const embedLive = new EmbedBuilder()
                .setTitle('🚨 EVENT DIMULAI!')
                .setDescription(`🎮 **${nama}**`)
                .addFields({
                    name: '📋 Link',
                    value:
                })
                .setColor(0xff0000);

            await interaction.channel.send({
                content: adminTag,
                embeds: [embedLive]
            });
        }, detik * 1000);
    }




    // =========================
    // PING
    // =========================
    else if (commandName === 'ping') {
        await interaction.reply('🏓 Pong!');
    }




    // =========================
    // HELP
    // =========================
    else if (commandName === 'help') {
        await interaction.reply('📌 Command: /event, /ping, /help, /info');
    }




    // =========================
    // INFO
    // =========================
    else if (commandName === 'info') {
        await interaction.reply('ℹ️ Bot Discord Spesial Team');
    }
});