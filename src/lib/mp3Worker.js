let mp3codec;
let Lame;

self.onmessage = function (e) {
    let mp3data;
    switch (e.data.cmd) {
        case 'init':
            if (!e.data.config) {
                e.data.config = {};
            }
            Lame = e.data.config.Lame;
            mp3codec = Lame.init();
            Lame.set_mode(mp3codec, e.data.config.mode || Lame.JOINT_STEREO);
            Lame.set_num_channels(mp3codec, e.data.config.channels || 2);
            Lame.set_num_samples(mp3codec, e.data.config.samples || -1);
            Lame.set_in_samplerate(mp3codec, e.data.config.samplerate || 44100);
            Lame.set_out_samplerate(mp3codec, e.data.config.samplerate || 44100);
            Lame.set_bitrate(mp3codec, e.data.config.bitrate || 128);
            Lame.init_params(mp3codec);
            break;
        case 'encode':
            mp3data = Lame.encode_buffer_ieee_float(mp3codec, e.data.buf, e.data.buf);
            self.postMessage({cmd: 'data', buf: mp3data.data});
            break;
        case 'finish':
            mp3data = Lame.encode_flush(mp3codec);
            self.postMessage({cmd: 'end', buf: mp3data.data});
            Lame.close(mp3codec);
            mp3codec = null;
            break;
    }
};