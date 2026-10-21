require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    Events,
    EmbedBuilder,
    REST,
    Routes,
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const {
    GoogleGenAI
} = require('@google/genai');
const {
    DisTube
} = require('distube');
const {
    SpotifyPlugin
} = require('@distube/spotify');
const {
    YtDlpPlugin
} = require('@distube/yt-dlp');

// =========================
// CONFIG
// =========================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID || '1395398313225748491';
const GUILD_ID = process.env.GUILD_ID || '492559166330765312';
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID || '1166739021762936892';

let CREATOR_CHANNEL_ID = null;

// Inisialisasi Gemini SDK Resmi (@google/genai)
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// =========================
// HELPER URL & FORMATTER
// =========================
function ambilUrl(text) {
    if (!text) return null;
    const match = text.match(/https?:\/\/[^\s]+/i);
    if (!match) return null;
    try {
        return new URL(match[0]).toString();
    } catch {
        return null;
    }
}

function formatAIOutput(text) {
    if (!text) return '';
    return text
        .replace(/###\s+(.*)/g, '**$1**')
        .replace(/##\s+(.*)/g, '__**$1**__')
        .replace(/#\s+(.*)/g, '__**$1**__');
}

async function discordAttachmentToGenerativePart(attachment) {
    const response = await fetch(attachment.url);
    const arrayBuffer = await response.arrayBuffer();
    return {
        inlineData: {
            data: Buffer.from(arrayBuffer).toString('base64'),
            mimeType: attachment.contentType || 'image/jpeg'
        }
    };
}

// =========================
// CLIENT & DISTUBE
// =========================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const distube = new DisTube(client, {
    emitNewSongOnly: true,
    plugins: [
        new SpotifyPlugin(),
        new YtDlpPlugin()
    ]
});

distube.on('playSong', (queue, song) => {
    if (queue.textChannel) {
        const embed = new EmbedBuilder()
            .setTitle('🎶 Sedang Memutar Musik')
            .setDescription(`**[${song.name}](${song.url})**`)
            .addFields({
                name: '⏱️ Durasi',
                value: song.formattedDuration,
                inline: true
            }, {
                name: '👤 Diminta oleh',
                value: `${song.user}`,
                inline: true
            })
            .setColor(0x0099ff)
            .setTimestamp();
        queue.textChannel.send({
            embeds: [embed]
        }).catch(() => {});
    }
});

distube.on('addSong', (queue, song) => {
    if (queue.textChannel) {
        const embed = new EmbedBuilder()
            .setTitle('➕ Ditambahkan ke Antrean')
            .setDescription(`**[${song.name}](${song.url})**`)
            .addFields({
                name: '⏱️ Durasi',
                value: song.formattedDuration,
                inline: true
            })
            .setColor(0xffaa00);
        queue.textChannel.send({
            embeds: [embed]
        }).catch(() => {});
    }
});

distube.on('error', (channel, error) => {
    console.error('❌ DISTUBE ERROR:', error);
    if (channel && typeof channel.send === 'function') {
        channel.send(`❌ Terjadi error pada pemutar musik: \`${String(error).slice(0, 1970)}\``).catch(() => {});
    }
});

// =========================
// SLASH COMMANDS
// =========================
const commands = [
    new SlashCommandBuilder()
    .setName('event')
    .setDescription('Buat event')
    .addStringOption(opt => opt.setName('nama').setDescription('Nama event').setRequired(true))
    .addIntegerOption(opt => opt.setName('waktu').setDescription('Waktu dalam detik').setRequired(true))
    .addStringOption(opt => opt.setName('link').setDescription('Link pendaftaran')),

    new SlashCommandBuilder().setName('ping').setDescription('Cek bot'),
    new SlashCommandBuilder().setName('help').setDescription('Lihat command'),
    new SlashCommandBuilder().setName('info').setDescription('Info bot'),

    new SlashCommandBuilder()
    .setName('translate')
    .setDescription('Translate Inggris ke Indonesia')
    .addStringOption(opt => opt.setName('text').setDescription('Teks bahasa Inggris').setRequired(true)),

    new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Tanya sesuatu ke AI Gemini (Mendukung Lampiran Gambar)')
    .addStringOption(opt => opt.setName('prompt').setDescription('Pertanyaan atau teks untuk AI').setRequired(true))
    .addAttachmentOption(opt => opt.setName('gambar').setDescription('Unggah file foto/gambar untuk dianalisis').setRequired(false)),

    new SlashCommandBuilder()
    .setName('terminal')
    .setDescription('Buka antarmuka Special Team Terminal interaktif')
    .addStringOption(opt => opt.setName('command').setDescription('Ketik perintah (help, ls, cd, cat, sysinfo, ping, ai <pesan>)'))
    .addAttachmentOption(opt => opt.setName('gambar').setDescription('Lampiran gambar jika menggunakan fitur AI di terminal').setRequired(false)),

    new SlashCommandBuilder()
    .setName('setup-ticket')
    .setDescription('Kirim panel sistem buka tiket bantuan (Khusus Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
    .setName('setup-tempvoice')
    .setDescription('Membuat channel "➕ Create Room" (Join to Create) (Khusus Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
    .setName('setup-panel')
    .setDescription('Kirim panel kontrol TempVoice Interface global (Khusus Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
    .setName('open')
    .setDescription('Buka tiket bantuan baru secara cepat')
    .addStringOption(opt => opt.setName('keperluan').setDescription('Tuliskan singkat kendala atau keperluanmu').setRequired(false)),

    new SlashCommandBuilder()
    .setName('sponsor')
    .setDescription('Kirim poster sponsorship')
    .addStringOption(opt => opt.setName('judul').setDescription('Judul sponsor').setRequired(true))
    .addStringOption(opt => opt.setName('gambar').setDescription('Link gambar poster').setRequired(true))
    .addStringOption(opt => opt.setName('deskripsi').setDescription('Deskripsi sponsor'))
    .addStringOption(opt => opt.setName('link').setDescription('Link sponsor')),

    new SlashCommandBuilder()
    .setName('sponsorpaket')
    .setDescription('Tampilkan paket sponsorship')
    .addStringOption(opt => opt.setName('kontak').setDescription('Tag admin / kontak').setRequired(true))
    .addStringOption(opt => opt.setName('link').setDescription('Link pendaftaran')),

    new SlashCommandBuilder()
    .setName('openrekrut')
    .setDescription('Kirim poster open recruitment staff')
    .addStringOption(opt => opt.setName('link').setDescription('Link pendaftaran / Google Form').setRequired(true))
    .addStringOption(opt => opt.setName('gambar').setDescription('Link gambar poster recruitment'))
    .addStringOption(opt => opt.setName('tanggal').setDescription('Contoh: 19 Januari - 1 Februari 2026'))
    .addStringOption(opt => opt.setName('jam').setDescription('Contoh: 00.00 WIB')),

    new SlashCommandBuilder().setName('join').setDescription('Memanggil bot ke Voice Channel'),
    new SlashCommandBuilder()
    .setName('play')
    .setDescription('Putar musik')
    .addStringOption(opt => opt.setName('query').setDescription('Judul lagu atau tema musik').setRequired(true)),
    new SlashCommandBuilder().setName('skip').setDescription('Lewati lagu yang sedang diputar'),
    new SlashCommandBuilder().setName('stop').setDescription('Hentikan musik dan keluarkan bot'),
    new SlashCommandBuilder().setName('queue').setDescription('Tampilkan daftar antrean musik')
];

const rest = new REST({
    version: '10'
}).setToken(TOKEN);

client.once(Events.ClientReady, async() => {
    console.log(`✅ Bot online: ${client.user.tag}`);

    try {
        console.log('🔄 Memulai registrasi global slash commands...');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID), {
                body: commands.map(cmd => cmd.toJSON())
            }
        );
        console.log('✅ Semua Slash Command berhasil didaftarkan secara GLOBAL!');
    } catch (err) {
        console.error('❌ ERROR REGISTER:', err);
    }
});

// =========================
// DATABASE TEMPORARY VOICE & TEXT CHANNEL MAPPING
// =========================
const tempVoiceOwners = new Map(); // Menyimpan voiceChannelId -> userId
const tempTextChannels = new Map(); // Menyimpan voiceChannelId -> textChannelId

// Helper Fungsi untuk Membuat Komponen Panel 15 Tombol TempVoice
function generateTempVoicePanel() {
    const embed = new EmbedBuilder()
        .setTitle('🔊 TempVoice Interface')
        .setDescription('This **interface** can be used to manage temporary voice channels[cite: 2].\nGunakan tombol di bawah ini untuk mengatur room pribadi kamu secara instan tanpa bingung! 🚀')
        .setColor(0xff0055)
        .setFooter({
            text: 'Special Team TempVoice System'
        });

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tv_name').setLabel('Name').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('tv_limit').setLabel('Limit').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('tv_lock').setLabel('Privacy').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('tv_waiting').setLabel('Waiting Room').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('tv_chat').setLabel('Chat').setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tv_trust').setLabel('Trust').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('tv_untrust').setLabel('Untrust').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('tv_invite').setLabel('Invite').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('tv_kick').setLabel('Kick').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('tv_region').setLabel('Region').setStyle(ButtonStyle.Secondary)
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tv_block').setLabel('Block').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('tv_unblock').setLabel('Unblock').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('tv_claim').setLabel('Claim').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('tv_transfer').setLabel('Transfer').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('tv_delete').setLabel('Delete').setStyle(ButtonStyle.Danger)
    );

    return {
        embeds: [embed],
        components: [row1, row2, row3]
    };
}

// =========================
// VOICE STATE UPDATE (Join to Create, Auto Text Panel & Auto Delete)
// =========================
client.on(Events.VoiceStateUpdate, async(oldState, newState) => {
    const member = newState.member;
    const guild = newState.guild;

    // 1. FITUR JOIN TO CREATE: Jika user masuk ke channel "➕ Create Room"
    if (newState.channelId && newState.channelId === CREATOR_CHANNEL_ID) {
        try {
            const parentCategory = newState.channel.parentId;

            // Buat Voice Channel Pribadi
            const voiceChannel = await guild.channels.create({
                name: `🔊 Room - ${member.user.username}`,
                type: ChannelType.GuildVoice,
                parent: parentCategory || null,
                permissionOverwrites: [{
                        id: guild.id,
                        allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: member.id,
                        allow: [
                            PermissionFlagsBits.Connect,
                            PermissionFlagsBits.Speak,
                            PermissionFlagsBits.ManageChannels,
                            PermissionFlagsBits.MuteMembers,
                            PermissionFlagsBits.DeafenMembers
                        ],
                    },
                ],
            });

            // Buat Text Channel Khusus Kontrol Panel di dalam kategori yang sama
            const textChannel = await guild.channels.create({
                name: `text-${member.user.username}`,
                type: ChannelType.GuildText,
                parent: parentCategory || null,
                permissionOverwrites: [{
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel], // Sembunyikan dari publik
                    },
                    {
                        id: member.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory
                        ], // Hanya owner yang bisa akses
                    },
                ],
            });

            // Simpan mapping owner dan text channel
            tempVoiceOwners.set(voiceChannel.id, member.id);
            tempTextChannels.set(voiceChannel.id, textChannel.id);

            // Kirim Panel Setting otomatis ke Text Channel baru tersebut
            const panelData = generateTempVoicePanel();
            await textChannel.send({
                content: `👋 Halo ${member}!\nIni adalah teks channel kontrol khusus untuk room suara kamu (**${voiceChannel.name}**).\nGunakan tombol di bawah ini untuk mengatur room kamu tanpa bingung! 🚀`,
                ...panelData
            });

            // Pindahkan user ke room suara baru
            await member.voice.setChannel(voiceChannel);
        } catch (err) {
            console.error('Gagal membuat temp voice / text channel:', err);
        }
    }

    // 2. AUTO DELETE: Hapus room suara & text channel terkait jika kosong
    const oldChannel = oldState.channel;
    if (oldChannel && oldChannel.name.startsWith('🔊 Room -')) {
        if (oldChannel.members.size === 0) {
            try {
                // Hapus Text Channel Kontrol yang berpasangan
                const textChannelId = tempTextChannels.get(oldChannel.id);
                if (textChannelId) {
                    const textChannel = guild.channels.cache.get(textChannelId);
                    if (textChannel) await textChannel.delete().catch(() => {});
                    tempTextChannels.delete(oldChannel.id);
                }

                tempVoiceOwners.delete(oldChannel.id);
                await oldChannel.delete();
            } catch (err) {
                console.error('Gagal menghapus temp voice channel kosong:', err);
            }
        }
    }
});

// =========================
// INTERACTION HANDLER
// =========================
client.on(Events.InteractionCreate, async interaction => {
            if (interaction.isModalSubmit()) {
                const member = interaction.member;
                const voiceChannel = member.voice.channel;

                if (!voiceChannel || !voiceChannel.name.startsWith('🔊 Room -')) {
                    return interaction.reply({
                        content: '❌ Kamu harus berada di dalam *Temporary Voice Channel* milikmu sendiri!',
                        ephemeral: true
                    });
                }

                const ownerId = tempVoiceOwners.get(voiceChannel.id);
                if (ownerId !== member.id && !member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({
                        content: '❌ Kamu bukan pemilik (owner) dari room ini!',
                        ephemeral: true
                    });
                }

                if (interaction.customId === 'modal_rename') {
                    const newName = interaction.fields.getTextInputValue('input_room_name');
                    try {
                        await voiceChannel.setName(`🔊 Room - ${newName}`);
                        await interaction.reply({
                            content: `✅ Nama room berhasil diubah menjadi: **🔊 Room - ${newName}**`,
                            ephemeral: true
                        });
                    } catch (err) {
                        await interaction.reply({
                            content: '❌ Gagal mengubah nama room.',
                            ephemeral: true
                        });
                    }
                } else if (interaction.customId === 'modal_limit') {
                    const limitStr = interaction.fields.getTextInputValue('input_room_limit');
                    const limit = parseInt(limitStr);
                    if (isNaN(limit) || limit < 0 || limit > 99) {
                        return interaction.reply({
                            content: '❌ Masukkan angka limit yang valid (0 - 99).',
                            ephemeral: true
                        });
                    }
                    try {
                        await voiceChannel.setUserLimit(limit);
                        await interaction.reply({
                            content: `✅ Batas member room berhasil diubah menjadi: **${limit === 0 ? 'Tanpa Batas' : limit + ' Orang'}**`,
                            ephemeral: true
                        });
                    } catch (err) {
                        await interaction.reply({
                            content: '❌ Gagal mengubah limit room.',
                            ephemeral: true
                        });
                    }
                }
                return;
            }

            if (interaction.isButton()) {
                const customId = interaction.customId;

                if (customId === 'create_ticket') {
                    await interaction.deferReply({
                        ephemeral: true
                    });

                    const guild = interaction.guild;
                    const user = interaction.user;

                    const existingChannel = guild.channels.cache.find(
                        c => c.name === `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`
                    );

                    if (existingChannel) {
                        return interaction.editReply({
                            content: `❌ Kamu sudah memiliki tiket aktif di ${existingChannel}!`
                        });
                    }

                    try {
                        const ticketChannel = await guild.channels.create({
                            name: `ticket-${user.username}`,
                            type: ChannelType.GuildText,
                            permissionOverwrites: [{
                                    id: guild.id,
                                    deny: [PermissionFlagsBits.ViewChannel]
                                },
                                {
                                    id: user.id,
                                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                                },
                                {
                                    id: ADMIN_ROLE_ID,
                                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                                }
                            ]
                        });

                        const ticketEmbed = new EmbedBuilder()
                            .setTitle('🎫 Special Team - Support Ticket')
                            .setDescription(`Halo ${user}!\nTerima kasih telah membuka tiket.`)
                            .setColor(0x0099ff)
                            .setTimestamp();

                        const closeRow = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                            .setCustomId('close_ticket')
                            .setLabel('🔒 Tutup Tiket')
                            .setStyle(ButtonStyle.Danger)
                        );

                        await ticketChannel.send({
                            content: `${user} \vert{} <@&${ADMIN_ROLE_ID}>`,
                            embeds: [ticketEmbed],
                            components: [closeRow]
                        });

                        await interaction.editReply({
                            content: `✅ Tiket berhasil dibuat! Silakan menuju ke ${ticketChannel}`
                        });
                    } catch (err) {
                        console.error('Gagal membuat tiket:', err);
                        await interaction.editReply({
                            content: '❌ Terjadi kesalahan saat mencoba membuat channel tiket.'
                        });
                    }
                } else if (customId === 'close_ticket') {
                    if (!interaction.channel.name.startsWith('ticket-')) {
                        return interaction.reply({
                            content: '❌ Perintah ini hanya bisa digunakan di dalam channel tiket!',
                            ephemeral: true
                        });
                    }

                    await interaction.reply({
                        content: '🔒 Tiket ini akan ditutup dan channel akan dihapus dalam 5 detik...'
                    });

                    setTimeout(async() => {
                        try {
                            await interaction.channel.delete();
                        } catch (err) {
                            console.error('Gagal menghapus channel tiket:', err);
                        }
                    }, 5000);
                }
                // =========================
                // PENGATURAN TEMP VOICE INTERFACE (15 TOMBOL)
                // =========================
                else if ([
                        'tv_name', 'tv_limit', 'tv_lock', 'tv_waiting', 'tv_chat',
                        'tv_trust', 'tv_untrust', 'tv_invite', 'tv_kick', 'tv_region',
                        'tv_block', 'tv_unblock', 'tv_claim', 'tv_transfer', 'tv_delete'
                    ].includes(customId)) {

                    const member = interaction.member;
                    const voiceChannel = member.voice.channel;

                    if (!voiceChannel || !voiceChannel.name.startsWith('🔊 Room -')) {
                        return interaction.reply({
                            content: '❌ Kamu harus berada di dalam *Temporary Voice Channel* untuk menggunakan tombol pengaturan ini!',
                            ephemeral: true
                        });
                    }

                    const ownerId = tempVoiceOwners.get(voiceChannel.id);

                    // 1. NAME
                    if (customId === 'tv_name') {
                        if (ownerId !== member.id && !member.permissions.has(PermissionFlagsBits.Administrator)) {
                            return interaction.reply({
                                content: '❌ Hanya pemilik room yang bisa mengubah nama room!',
                                ephemeral: true
                            });
                        }
                        const modal = new ModalBuilder().setCustomId('modal_rename').setTitle('Ganti Nama Room');
                        const nameInput = new TextInputBuilder()
                            .setCustomId('input_room_name')
                            .setLabel("Nama Baru Room")
                            .setStyle(TextInputStyle.Short)
                            .setMaxLength(30)
                            .setRequired(true);
                        modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                        return await interaction.showModal(modal);
                    }
                    // 2. LIMIT
                    else if (customId === 'tv_limit') {
                        if (ownerId !== member.id && !member.permissions.has(PermissionFlagsBits.Administrator)) {
                            return interaction.reply({
                                content: '❌ Hanya pemilik room yang bisa mengubah limit!',
                                ephemeral: true
                            });
                        }
                        const modal = new ModalBuilder().setCustomId('modal_limit').setTitle('Atur Batas Member (Limit)');
                        const limitInput = new TextInputBuilder()
                            .setCustomId('input_room_limit')
                            .setLabel("Jumlah Maksimal Orang (0-99)")
                            .setStyle(TextInputStyle.Short)
                            .setMaxLength(2)
                            .setRequired(true);
                        modal.addComponents(new ActionRowBuilder().addComponents(limitInput));
                        return await interaction.showModal(modal);
                    }
                    // 3. PRIVACY (LOCK)
                    else if (customId === 'tv_lock') {
                        if (ownerId !== member.id && !member.permissions.has(PermissionFlagsBits.Administrator)) {
                            return interaction.reply({
                                content: '❌ Hanya pemilik room yang bisa mengunci/membuka room!',
                                ephemeral: true
                            });
                        }
                        try {
                            const currentPerm = voiceChannel.permissionOverwrites.cache.get(interaction.guild.id);
                            const isLocked = currentPerm && currentPerm.deny.has(PermissionFlagsBits.Connect);

                            if (isLocked) {
                                await voiceChannel.permissionOverwrites.edit(interaction.guild.id, {
                                    Connect: null
                                });
                                await interaction.reply({
                                    content: '🔓 Room berhasil **Dibuka Kembali** untuk umum.',
                                    ephemeral: true
                                });
                            } else {
                                await voiceChannel.permissionOverwrites.edit(interaction.guild.id, {
                                    Connect: false
                                });
                                await interaction.reply({
                                    content: '🔒 Room berhasil **Dikunci (Locked)**.',
                                    ephemeral: true
                                });
                            }
                        } catch (err) {
                            await interaction.reply({
                                content: '❌ Gagal mengubah status kunci room.',
                                ephemeral: true
                            });
                        }
                    }
                    // 4. CLAIM
                    else if (customId === 'tv_claim') {
                        if (ownerId && voiceChannel.members.has(ownerId)) {
                            return interaction.reply({
                                content: '❌ Pemilik asli room masih berada di dalam channel ini!',
                                ephemeral: true
                            });
                        }
                        tempVoiceOwners.set(voiceChannel.id, member.id);
                        try {
                            await voiceChannel.permissionOverwrites.edit(member.id, {
                                ManageChannels: true,
                                MuteMembers: true,
                                DeafenMembers: true
                            });
                            await interaction.reply({
                                content: `👑 Sukses! Kamu sekarang adalah **Owner** baru dari room ini.`,
                                ephemeral: true
                            });
                        } catch (err) {
                            await interaction.reply({
                                content: '❌ Gagal mengklaim room.',
                                ephemeral: true
                            });
                        }
                    }
                    // 5. DELETE
                    else if (customId === 'tv_delete') {
                        if (ownerId !== member.id && !member.permissions.has(PermissionFlagsBits.Administrator)) {
                            return interaction.reply({
                                content: '❌ Hanya pemilik room yang bisa menghapus room ini!',
                                ephemeral: true
                            });
                        }
                        try {
                            // Hapus text channel kontrol
                            const textChannelId = tempTextChannels.get(voiceChannel.id);
                            if (textChannelId) {
                                const textChannel = interaction.guild.channels.cache.get(textChannelId);
                                if (textChannel) await textChannel.delete().catch(() => {});
                                tempTextChannels.delete(voiceChannel.id);
                            }

                            tempVoiceOwners.delete(voiceChannel.id);
                            await interaction.reply({
                                content: '🗑️ Menghapus room...',
                                ephemeral: true
                            });
                            await voiceChannel.delete();
                        } catch (err) {
                            await interaction.reply({
                                content: '❌ Gagal menghapus room.',
                                ephemeral: true
                            });
                        }
                    }
                    // Tombol Fitur Lainnya
                    else {
                        return interaction.reply({
                            content: `⚙️ Tombol **[${customId.replace('tv_', '').toUpperCase()}]** berhasil ditekan.`,
                            ephemeral: true
                        });
                    }
                }
                return;
            }

            if (!interaction.isChatInputCommand()) return;
            const {
                commandName
            } = interaction;

            try {
                if (commandName === 'event') {
                    const nama = interaction.options.getString('nama');
                    const detik = interaction.options.getInteger('waktu');
                    const link = interaction.options.getString('link') || 'Tidak ada link';
                    const adminTag = `<@&${ADMIN_ROLE_ID}>`;

                    const embed = new EmbedBuilder()
                        .setTitle('⏰ Event Akan Dimulai')
                        .setDescription(`📋 **${nama}**`)
                        .addFields({
                            name: '🔗 Pendaftaran',
                            value: link
                        }, {
                            name: '👤 Admin',
                            value: adminTag
                        })
                        .setColor(0x0099ff);

                    await interaction.reply({
                        embeds: [embed]
                    });

                    setTimeout(async() => {
                        if (interaction.channel) {
                            await interaction.channel.send({
                                content: adminTag,
                                embeds: [
                                    new EmbedBuilder()
                                    .setTitle('🚨 EVENT DIMULAI!')
                                    .setDescription(`📋 **${nama}**`)
                                    .setColor(0xff0000)
                                ]
                            }).catch(() => {});
                        }
                    }, detik * 1000);
                } else if (commandName === 'help') {
                    const embed = new EmbedBuilder()
                        .setTitle('Special Team Bot - Help')
                        .setDescription('`/event` `/ai` `/terminal` `/sponsor` `/sponsorpaket` `/openrekrut` `/setup-ticket` `/setup-tempvoice` `/setup-panel` `/open` `/ping` `/help` `/info` `/translate` `/join` `/play` `/skip` `/stop` `/queue`')
                        .setColor(0x0099ff)
                        .setTimestamp();

                    await interaction.reply({
                        embeds: [embed]
                    });
                } else if (commandName === 'info') {
                    const embed = new EmbedBuilder()
                        .setTitle('ℹ️ Informasi Bot')
                        .setDescription('Special Team Bot adalah bot utilitas, AI assistant, tiket support, temporary voice interface, dan pemutar musik server.')
                        .setColor(0x0099ff)
                        .setTimestamp();

                    await interaction.reply({
                        embeds: [embed]
                    });
                } else if (commandName === 'ping') {
                    await interaction.reply({
                        content: `Pong! Latency: ${Date.now() - interaction.createdTimestamp}ms`,
                        ephemeral: true
                    });
                } else if (commandName === 'translate') {
                    const text = interaction.options.getString('text');
                    await interaction.deferReply();
                    try {
                        const response = await ai.models.generateContent({
                            model: 'gemini-3.6-flash',
                            contents: `Translate this English text to Indonesian accurately: "${text}"`
                        });
                        await interaction.editReply(`🇬🇧 **Original:** ${text}\n\n🇮🇩 **Translate:** ${response.text}`);
                    } catch (err) {
                        console.error('Translate error:', err);
                        await interaction.editReply('❌ Gagal melakukan translate.');
                    }
                } else if (commandName === 'ai') {
                    const prompt = interaction.options.getString('prompt');
                    const attachment = interaction.options.getAttachment('gambar');

                    await interaction.deferReply();

                    let replyText = null;

                    try {
                        const contents = [
                            `Jawablah pertanyaan ini dengan gaya yang bijak, suportif, terstruktur, santun, dan solutif:\n\n${prompt}`
                        ];

                        if (attachment) {
                            const isImage = attachment.contentType && attachment.contentType.startsWith('image/');
                            if (!isImage) {
                                return interaction.editReply('❌ File yang dilampirkan harus berupa gambar (JPG/PNG/WEBP).');
                            }
                            const imagePart = await discordAttachmentToGenerativePart(attachment);
                            contents.push(imagePart);
                        }

                        const response = await ai.models.generateContent({
                            model: 'gemini-3.6-flash',
                            contents: contents
                        });

                        replyText = formatAIOutput(response.text);
                    } catch (err) {
                        console.error('⚠️ Gemini SDK Error detail:', err);
                    }

                    if (!replyText) {
                        replyText = 'Maaf ya, server AI sedang mengalami gangguan koneksi atau limit API key. Silakan coba beberapa saat lagi!';
                    }

                    const fullContent = `❓ **Pertanyaan**\n${prompt}\n\n💡 **Jawaban**\n${replyText}`;

                    const embed = new EmbedBuilder()
                        .setColor(0x0099ff)
                        .setAuthor({
                            name: 'ST | Special Team - AI Assistant',
                            iconURL: interaction.client.user.displayAvatarURL()
                        })
                        .setDescription(fullContent.length > 4090 ? fullContent.slice(0, 4087) + '...' : fullContent)
                        .setFooter({
                            text: 'Special Team Intelligence'
                        })
                        .setTimestamp();

                    if (attachment) {
                        embed.setThumbnail(attachment.url);
                    }

                    await interaction.editReply({
                        embeds: [embed]
                    });
                } else if (commandName === 'terminal') {
                    const inputCmd = interaction.options.getString('command') || 'help';
                    const attachment = interaction.options.getAttachment('gambar');
                    const args = inputCmd.trim().split(' ');
                    const cmd = args[0].toLowerCase();
                    const query = args.slice(1).join(' ');

                    if (!global.userDirectories) global.userDirectories = {};
                    const userId = interaction.user.id;

                    if (!global.userDirectories[userId]) {
                        global.userDirectories[userId] = {
                            currentPath: '~'
                        };
                    }

                    const fileSystem = {
                        '~': {
                            type: 'dir',
                            items: {
                                'announcements': {
                                    type: 'dir',
                                    channelName: 'announcement'
                                },
                                'general-chat': {
                                    type: 'dir',
                                    channelName: 'general-chat'
                                },
                                'projects': {
                                    type: 'dir',
                                    channelName: 'projects'
                                },
                                'support': {
                                    type: 'dir',
                                    channelName: 'support'
                                },
                                'README.md': {
                                    type: 'file',
                                    content: 'Selamat datang di Special Team Terminal CLI!\nGunakan perintah "ls" untuk melihat direktori atau "cd <folder>" untuk berpindah channel server.'
                                }
                            }
                        }
                    };

                    let terminalOutput = '';
                    let currentDir = global.userDirectories[userId].currentPath;

                    function getDirectoryObj() {
                        return fileSystem['~'];
                    }

                    if (cmd === 'help') {
                        terminalOutput = `Special Team Terminal CLI - Commands:\n` +
                            `  ls            - Menampilkan daftar direktori & channel server\n` +
                            `  cd <folder>   - Masuk direktori & berpindah ke channel terkait\n` +
                            `  pwd           - Menampilkan path lokasi saat ini\n` +
                            `  cat <file>    - Membaca file informasi\n` +
                            `  sysinfo       - Menampilkan status core sistem Special Team\n` +
                            `  ping          - Cek latensi server dan WebSocket bot\n` +
                            `  echo <teks>   - Cetak teks ke terminal\n` +
                            `  ai <pesan>    - Akses AI Engine Special Team via terminal (bisa lampirkan gambar)\n` +
                            `  clear         - Membersihkan buffer layar terminal`;
                    } else if (cmd === 'ls') {
                        const dirObj = getDirectoryObj();
                        const items = Object.keys(dirObj.items).map(name => {
                            const item = dirObj.items[name];
                            return item.type === 'dir' ? `📁 ${name}/` : `📄 ${name}`;
                        }).join('  ');
                        terminalOutput = items || '(empty directory)';
                    } else if (cmd === 'pwd') {
                        terminalOutput = `/home/specialteam/${currentDir === '~' ? '' : currentDir}`;
                    } else if (cmd === 'cd') {
                        const target = args[1];
                        if (!target || target === '~' || target === '..') {
                            global.userDirectories[userId].currentPath = '~';
                            terminalOutput = `Returned to root directory (~).`;
                        } else {
                            const dirObj = getDirectoryObj();
                            if (dirObj.items[target] && dirObj.items[target].type === 'dir') {
                                global.userDirectories[userId].currentPath = target;
                                const targetChannelName = dirObj.items[target].channelName;

                                let channelMention = `#${targetChannelName}`;
                                if (interaction.guild) {
                                    const foundChannel = interaction.guild.channels.cache.find(c => c.name === targetChannelName);
                                    if (foundChannel) {
                                        channelMention = `<#${foundChannel.id}>`;
                                    }
                                }

                                terminalOutput = `Successfully navigated to /${target}\n🔗 Akses channel: ${channelMention}`;
                            } else {
                                terminalOutput = `bash: cd: ${target}: No such directory`;
                            }
                        }
                    } else if (cmd === 'cat') {
                        const fileName = args[1];
                        const dirObj = getDirectoryObj();
                        if (dirObj.items[fileName] && dirObj.items[fileName].type === 'file') {
                            terminalOutput = dirObj.items[fileName].content;
                        } else {
                            terminalOutput = `cat: ${fileName || ''}: No such file or directory`;
                        }
                    } else if (cmd === 'sysinfo') {
                        const uptime = process.uptime();
                        const hours = Math.floor(uptime / 3600);
                        const minutes = Math.floor((uptime % 3600) / 60);
                        const seconds = Math.floor(uptime % 60);

                        terminalOutput = `=== SPECIAL TEAM CORE SYSTEM INFO ===\n` +
                            `Host OS         : ${process.platform} (${process.arch})\n` +
                            `Runtime         : Node.js ${process.version}\n` +
                            `System Uptime   : ${hours}h ${minutes}m${seconds}s\n` +
                            `Heap Allocated  : ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\n` +
                            `Node Status     : ONLINE\n` +
                            `Active Cluster  : ${interaction.guild ? interaction.guild.name : 'DM Gateway'}`;
                    } else if (cmd === 'ping') {
                        terminalOutput = `PONG! Roundtrip: ${Date.now() - interaction.createdTimestamp}ms \vert{} Gateway Ping:${Math.round(client.ws.ping)}ms`;
                    } else if (cmd === 'echo') {
                        terminalOutput = query ? query : 'Usage: echo <text>';
                    } else if (cmd === 'clear') {
                        terminalOutput = `[Terminal buffer cleared]\nKetik 'help' untuk daftar perintah.`;
                    } else if (cmd === 'ai') {
                        if (!query) {
                            terminalOutput = `Error: Missing prompt for AI. Usage: ai <your question>`;
                        } else {
                            await interaction.deferReply();
                            try {
                                const contents = [query];
                                const isImage = attachment && attachment.contentType && attachment.contentType.startsWith('image/');
                                if (isImage) {
                                    const imagePart = await discordAttachmentToGenerativePart(attachment);
                                    contents.push(imagePart);
                                }

                                const response = await ai.models.generateContent({
                                    model: 'gemini-3.6-flash',
                                    contents: contents
                                });
                                terminalOutput = formatAIOutput(response.text);
                            } catch (err) {
                                console.error('Terminal AI Error:', err);
                                terminalOutput = `Error: Gagal memproses permintaan AI ke engine Special Team.`;
                            }

                            const embed = new EmbedBuilder()
                                .setTitle(`💻 Special Team Terminal // root@specialteam:${global.userDirectories[userId].currentPath}# ${inputCmd}`)
                                .setDescription(`\`\`\`prolog\n${terminalOutput.length > 4000 ? terminalOutput.slice(0, 3997) + '...' : terminalOutput}\n\`\`\``)
                                .setColor(0x0099ff)
                                .setFooter({
                                    text: 'Special Team Terminal CLI'
                                })
                                .setTimestamp();

                            if (attachment) {
                                embed.setThumbnail(attachment.url);
                            }

                            return interaction.editReply({
                                embeds: [embed]
                            });
                        }
                    } else {
                        terminalOutput = `bash: ${cmd}: command not found. Ketik 'help' untuk panduan perintah.`;
                    }

                    const promptSymbol = `root@specialteam:${global.userDirectories[userId].currentPath}#`;
                    const embed = new EmbedBuilder()
                        .setTitle(`💻 Special Team Terminal CLI`)
                        .setDescription(`\`\`\`prolog\n${promptSymbol} ${inputCmd}\n${terminalOutput}\n\`\`\``)
                        .setColor(0x0099ff)
                        .setFooter({
                            text: 'Special Team Terminal Interface'
                        })
                        .setTimestamp();

                    await interaction.reply({
                        embeds: [embed]
                    });
                } else if (commandName === 'setup-ticket') {
                    const embed = new EmbedBuilder()
                        .setTitle('🎫 Special Team - Layanan Bantuan / Ticket')
                        .setDescription('Butuh bantuan, ingin melaporkan kendala, atau ada hal yang ingin ditanyakan kepada Staff?\n\nKlik tombol di bawah ini untuk membuka tiket privat secara instan! 🚀')
                        .setColor(0x0099ff)
                        .setFooter({
                            text: 'Special Team Support System'
                        });

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                        .setCustomId('create_ticket')
                        .setLabel('📬 Buka Tiket')
                        .setStyle(ButtonStyle.Primary)
                    );

                    await interaction.reply({
                        content: '✅ Panel tiket berhasil dikirim ke channel ini!',
                        ephemeral: true
                    });

                    await interaction.channel.send({
                        embeds: [embed],
                        components: [row]
                    });
                } else if (commandName === 'setup-tempvoice') {
                    const guild = interaction.guild;
                    const parentCategory = interaction.channel.parentId;

                    const creatorChannel = await guild.channels.create({
                        name: '➕ Create Room',
                        type: ChannelType.GuildVoice,
                        parent: parentCategory || null,
                    });

                    CREATOR_CHANNEL_ID = creatorChannel.id;

                    await interaction.reply({
                        content: `✅ Berhasil membuat channel **➕ Create Room** (<#${creatorChannel.id}>).\nSiapa pun yang masuk ke channel tersebut akan otomatis dibuatkan room pribadi dan **dibuatkan text channel kontrol khusus**!`,
                        ephemeral: true
                    });
                } else if (commandName === 'setup-panel') {
                    const panelData = generateTempVoicePanel();
                    await interaction.reply({
                        content: '✅ Panel kontrol TempVoice Interface global berhasil dikirim!',
                        ephemeral: true
                    });
                    await interaction.channel.send(panelData);
                } else if (commandName === 'open') {
                    await interaction.deferReply({
                        ephemeral: true
                    });

                    const guild = interaction.guild;
                    const user = interaction.user;
                    const keperluan = interaction.options.getString('keperluan') || 'Tidak ada keterangan';

                    const existingChannel = guild.channels.cache.find(
                        c => c.name === `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`
                    );

                    if (existingChannel) {
                        return interaction.editReply({
                            content: `❌ Kamu sudah memiliki tiket aktif di ${existingChannel}!`
                        });
                    }

                    try {
                        const ticketChannel = await guild.channels.create({
                            name: `ticket-${user.username}`,
                            type: ChannelType.GuildText,
                            permissionOverwrites: [{
                                    id: guild.id,
                                    deny: [PermissionFlagsBits.ViewChannel]
                                },
                                {
                                    id: user.id,
                                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                                },
                                {
                                    id: ADMIN_ROLE_ID,
                                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                                }
                            ]
                        });

                        const ticketEmbed = new EmbedBuilder()
                            .setTitle('🎫 Special Team - Support Ticket')
                            .setDescription(`Halo ${user}!\nTerima kasih telah membuka tiket.\n\n📝 **Keperluan:** ${keperluan}\n\nSilakan sampaikan kendala atau pertanyaan lebih lanjut di sini. Staff <@&${ADMIN_ROLE_ID}> akan segera merespons.`)
                            .setColor(0x0099ff)
                            .setTimestamp();

                        const closeRow = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                            .setCustomId('close_ticket')
                            .setLabel('🔒 Tutup Tiket')
                            .setStyle(ButtonStyle.Danger)
                        );

                        await ticketChannel.send({
                            content: `${user} \vert{} <@&${ADMIN_ROLE_ID}>`,
                            embeds: [ticketEmbed],
                            components: [closeRow]
                        });

                        await interaction.editReply({
                            content: `✅ Tiket berhasil dibuat! Silakan menuju ke ${ticketChannel}`
                        });
                    } catch (err) {
                        console.error('Gagal membuat tiket via command:', err);
                        await interaction.editReply({
                            content: '❌ Terjadi kesalahan saat mencoba membuat channel tiket.'
                        });
                    }
                } else if (commandName === 'sponsor') {
                    const judul = interaction.options.getString('judul');
                    const rawGambar = interaction.options.getString('gambar');
                    const deskripsi = interaction.options.getString('deskripsi') || 'Open Sponsorship';
                    const rawLink = interaction.options.getString('link');

                    const gambar = ambilUrl(rawGambar);
                    const link = ambilUrl(rawLink);

                    if (!gambar) {
                        return interaction.reply({
                            content: '❌ Link gambar tidak valid. Pakai link yang diawali `https://`',
                            ephemeral: true
                        });
                    }

                    let desc = `🎯 ${deskripsi}\n\n⭐⭐⭐⭐⭐`;
                    if (link) {
                        desc = `🎯 ${deskripsi}\n\n🔗 ${link}\n\n⭐⭐⭐⭐⭐`;
                    }

                    const embed = new EmbedBuilder()
                        .setTitle(`📢 ${judul}`)
                        .setDescription(desc)
                        .setImage(gambar)
                        .setColor(0x0099ff)
                        .setFooter({
                            text: 'Special Team Sponsorship'
                        })
                        .setTimestamp();

                    await interaction.reply({
                        embeds: [embed]
                    });
                } else if (commandName === 'sponsorpaket') {
                    const kontak = interaction.options.getString('kontak');
                    const rawLink = interaction.options.getString('link');
                    const link = ambilUrl(rawLink);

                    const POSTER_IMAGE = 'https://raw.githubusercontent.com/Spesial-Team/Special-Team-Sponsorship/refs/heads/main/1.png';

                    let description = `📜 “Kami membuka peluang kerja sama untuk mendukung dan tumbuh bersama dalam komunitas”

📦 **Paket Sponsorship**
Pilih paket terbaik untuk kolaborasi 🚀

━━━━━━━━━━━━━━━━━━
🥈 **SILVER - 100.000,00**
- Logo dicantumkan di banner
- Logo dicantumkan di poster atau E-flyer

🥇 **GOLD - 120.000,00**
- Logo dicantumkan di banner
- Iklan dan poster event dipromosikan di sosial media

💎 **PLATINUM - 150.000,00**
- Iklan dan poster dipromosikan di sosial media
- Logo tampil di video
- Iklan ditayangkan di video
━━━━━━━━━━━━━━━━━━`;

                    if (link) description += `\n\n🔗 **Daftar Sekarang:**\n${link}`;
                    description += `\n\n📞 **Info Lebih Lanjut:**\nHubungi ${kontak}`;

                    const embed = new EmbedBuilder()
                        .setTitle('📢 OPEN SPONSORSHIP')
                        .setDescription(description)
                        .setImage(POSTER_IMAGE)
                        .setColor(0x0099ff)
                        .setFooter({
                            text: 'Special Team Sponsorship'
                        })
                        .setTimestamp();

                    await interaction.reply({
                        embeds: [embed]
                    });
                } else if (commandName === 'openrekrut') {
                    const rawLink = interaction.options.getString('link');
                    const rawGambar = interaction.options.getString('gambar');
                    const tanggal = interaction.options.getString('tanggal') || '19 Januari - 1 Februari 2026';
                    const jam = interaction.options.getString('jam') || '00.00 WIB';

                    const link = ambilUrl(rawLink);
                    const gambar = ambilUrl(rawGambar);

                    if (!link) {
                        return interaction.reply({
                            content: '❌ Link pendaftaran tidak valid. Isi bagian `link` dengan URL saja, contoh: `https://forms.gle/xxxxx`',
                            ephemeral: true
                        });
                    }

                    let description = `Halo teman-teman! Bagi kamu yang tertarik dalam kepengurusan server, kami sedang membuka pendaftaran untuk kalian yang ingin menjadi bagian dari staff.

Yuk, tunggu apa lagi? Langsung daftar aja <@&554708472214585383>

━━━━━━━━━━━━━━━━━━
📅 **Periode Pendaftaran**
${tanggal}

🕛 **Jam**
${jam}

✅ **Syarat & Ketentuan**
Minimal usia 21+

━━━━━━━━━━━━━━━━━━
📌 **Penjelasan Jobdesk Setiap Divisi**

**1. Security**
Memantau aktivitas server, menjaga keamanan komunitas, serta membuat laporan jika ditemukan link phishing, spam, raid, atau gangguan lainnya.

**2. Developer**
Mengembangkan dan mengelola website, bot, atau sistem pendukung server agar fitur komunitas dapat berjalan dengan baik.

**3. Designer**
Membuat desain untuk kebutuhan server, event, ucapan hari besar, poster, UI/UX, thumbnail, dan kebutuhan visual lainnya.

**4. Tech Support**
Membantu menangani masalah teknis yang dialami member atau staff, seperti kendala bot, website, sistem, akses, error, dan troubleshooting dasar.

**5. Guardian**
Memantau chat, menjaga suasana server tetap aktif dan kondusif, serta membantu mengarahkan member jika membutuhkan bantuan.

━━━━━━━━━━━━━━━━━━
🔗 **Link Pendaftaran:**\n${link}`;

                    const embed = new EmbedBuilder()
                        .setTitle('📢 OPEN RECRUITMENT STAFF SPECIAL TEAM')
                        .setDescription(description)
                        .setColor(0x0099ff)
                        .setFooter({
                            text: 'Special Team Recruitment'
                        })
                        .setTimestamp();

                    if (gambar) {
                        embed.setImage(gambar);
                    }

                    await interaction.reply({
                        embeds: [embed]
                    });
                } else if (commandName === 'join') {
                    const member = interaction.member;
                    if (!member.voice.channel) {
                        return interaction.reply({
                            content: '❌ Kamu harus berada di dalam Voice Channel terlebih dahulu!',
                            ephemeral: true
                        });
                    }
                    try {
                        await distube.voices.join(member.voice.channel);
                        await interaction.reply({
                            content: `✅ Berhasil bergabung ke Voice Channel: **${member.voice.channel.name}**`
                        });
                    } catch (err) {
                        await interaction.reply({
                            content: '❌ Gagal bergabung ke Voice Channel.',
                            ephemeral: true
                        });
                    }
                } else if (commandName === 'play') {
                    const query = interaction.options.getString('query');
                    const member = interaction.member;
                    if (!member.voice.channel) {
                        return interaction.reply({
                            content: '❌ Kamu harus berada di dalam Voice Channel terlebih dahulu!',
                            ephemeral: true
                        });
                    }

                    await interaction.deferReply();
                    try {
                        await distube.play(member.voice.channel, query, {
                            textChannel: interaction.channel,
                            member: member
                        });
                        await interaction.editReply(`🔍 Memproses lagu/musik: **${query}**`);
                    } catch (err) {
                        console.error('Play error:', err);
                        await interaction.editReply('❌ Gagal memutar musik atau lagu tidak ditemukan.');
                    }
                } else if (commandName === 'skip') {
                    const queue = distube.getQueue(interaction.guildId);
                    if (!queue) {
                        return interaction.reply({
                            content: '❌ Tidak ada musik yang sedang diputar di server ini!',
                            ephemeral: true
                        });
                    }
                    try {
                        await queue.skip();
                        await interaction.reply('⏭️ Musik berhasil dilewati.');
                    } catch (err) {
                        await interaction.reply({
                            content: '❌ Tidak ada lagu selanjutnya di antrean.',
                            ephemeral: true
                        });
                    }
                } else if (commandName === 'stop') {
                    const queue = distube.getQueue(interaction.guildId);
                    if (!queue) {
                        return interaction.reply({
                            content: '❌ Tidak ada musik yang sedang diputar!',
                            ephemeral: true
                        });
                    }
                    queue.stop();
                    await interaction.reply('⏹️ Musik dihentikan dan bot keluar dari Voice Channel.');
                } else if (commandName === 'queue') {
                    const queue = distube.getQueue(interaction.guildId);
                    if (!queue) {
                        return interaction.reply({
                            content: '❌ Antrean musik kosong.',
                            ephemeral: true
                        });
                    }
                    const q = queue.songs.map((song, i) => `${i === 0 ? '▶️' : `${i}.`} ${song.name} \`${song.formattedDuration}\``).join('\n');
            const embed = new EmbedBuilder()
                .setTitle('🎶 Antrean Musik Server')
                .setDescription(q.length > 4000 ? q.slice(0, 3997) + '...' : q)
                .setColor(0x0099ff);
            await interaction.reply({
                embeds: [embed]
            });
        }
    } catch (error) {
        console.error('Interaction Error:', error);
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({
                content: '❌ Terjadi kesalahan saat memproses perintah ini.'
            }).catch(() => {});
        } else {
            await interaction.reply({
                content: '❌ Terjadi kesalahan saat memproses perintah ini.',
                ephemeral: true
            }).catch(() => {});
        }
    }
});

client.login(TOKEN);