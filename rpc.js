const RPC = require('discord-rpc');
const clientId = '1395398313225748491'; // Ganti dengan Client ID aplikasi Discord kamu

const rpc = new RPC.Client({
    transport: 'ipc'
});

rpc.on('ready', () => {
    console.log(`RPC Special Team aktif sebagai: ${rpc.user.username}`);

    // Fungsi untuk memperbarui status secara berkala
    setInterval(() => {
        rpc.setActivity({
            details: 'Special Team Community',
            state: 'Aktif & Berkolaborasi',
            startTimestamp: new Date(), // Menghitung durasi waktu aktif (timer)
            largeImageKey: 'logo_besar', // Ganti dengan nama asset key gambar di Discord Developer Portal kamu
            largeImageText: 'Special Team',
            smallImageKey: 'logo_kecil', // (Opsional) Ganti dengan asset key gambar kecil
            smallImageText: 'Online',
            buttons: [{
                    label: 'Gabung Komunitas Discord',
                    url: 'https://discord.com/invite/EQZHmPfJHS'
                },
                {
                    label: 'Visit Site Special Team',
                    url: 'https://st-specialteam.netlify.app/'
                }
            ]
        });
    }, 15e3); // Update setiap 15 detik
});

rpc.login({
    clientId
}).catch(console.error);