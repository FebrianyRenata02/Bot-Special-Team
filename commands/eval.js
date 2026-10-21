const {
    SlashCommandBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eval')
        .setDescription('Jalankan kode JavaScript')
        .addStringOption(option =>
            option.setName('code')
            .setDescription('Kode JavaScript yang mau dieksekusi')
            .setRequired(true)),

    async execute(interaction) {
        const code = interaction.options.getString('code');

        // Cek kalau yang pakai bukan kamu (ganti ID di bawah)
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({
                content: '❌ Kamu tidak punya izin.',
                ephemeral: true
            });
        }

        try {
            let result = eval(code);

            if (result instanceof Promise) result = await result;

            await interaction.reply(`✅ Output:\n\`\`\`js\n${result}\n\`\`\``);
        } catch (err) {
            await interaction.reply(`❌ Error:\n\`\`\`js\n${err}\n\`\`\``);
        }
    }
};