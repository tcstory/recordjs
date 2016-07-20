const WORKER_PATH = require('file-loader!./recorderWorker.js');
const MP3_WORKER_PATH = require('file-loader!./mp3Worker.js');

window.URL = window.URL || window.webkitURL;
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
window.AudioContext = window.AudioContext || window.webkitAudioContext;

let Recorder = {
    start() {
        if (navigator.getUserMedia) {
            navigator.getUserMedia({audio: true}, (s) => {
                let context = new AudioContext();
                let mediaStreamSource = context.createMediaStreamSource(s);
                this._init(mediaStreamSource, {numChannels: 1});
                this.record();
            }, function () {
                console.log('Rejected!', e);
            });
        } else {
            console.log('navigator.getUserMedia not present');
        }
    },
    _init(source, cfg) {
        this.encoderWorker = new Worker(MP3_WORKER_PATH);
        this.config = cfg || {};
        this.bufferLen = cfg.bufferLen || 4096;
        this.numChannels = cfg.numChannels || 1;
        this.context = source.context;

        this.node =
            (
                this.context.createScriptProcessor || this.context.createJavaScriptNode
            ).call(this.context, this.bufferLen, this.numChannels, this.numChannels);

        this.node.onaudioprocess = (e) => {
            if (!this.recording) {
                return;
            }
            let buffer = [];
            for (let channel = 0; channel < this.numChannels; channel++) {
                buffer.push(e.inputBuffer.getChannelData(channel));
            }
            this.worker.postMessage({
                command: 'record',
                buffer: buffer
            });
        };

        this.worker = new Worker(WORKER_PATH);
        this.worker.postMessage({
            command: 'init',
            config: {
                sampleRate: this.context.sampleRate,
                numChannels: this.numChannels
            }
        });

        this.recording = false;
        this.currCallback = null;
        this.configure = function (cfg) {
            for (let prop in cfg) {
                if (cfg.hasOwnProperty(prop)) {
                    this.config[prop] = cfg[prop];
                }
            }
        };
        //Mp3 conversion
        this.worker.onmessage = (e) => {
            if (e.data.command === 'exportWAV') {
                this._exportWav(e.data);
            } else if (e.data.command === 'exportMP3') {
                this._exportMp3(e.data);
            }
        };

        source.connect(this.node);
        this.node.connect(this.context.destination);    //this should not be necessary
    },
    record() {
        this.recording = true;
    },
    stop() {
        this.context.close();
        this.recording = false;
    },
    clear() {
        this.stop();
        this.worker.postMessage({command: 'clear'});
    },
    _getBuffer(cb) {
        this.currCallback = cb || this.config.callback;
        this.worker.postMessage({command: 'getBuffer'})
    },
    exportWAV(cb = function () {}, type) {
        this.wavCallback = cb;
        type = type || this.config.type || 'audio/wav';
        this.worker.postMessage({
            command: 'exportWAV',
            type: type
        });
    },
    exportMP3(cb  = function () {}, type) {
        this.mp3Callback = cb;
        type = type || this.config.type || 'audio/mp3';
        this.worker.postMessage({
            command: 'exportMP3',
            type: type
        });
    },
    _encode64(buffer) {
        let binary = '',
            bytes = new Uint8Array(buffer),
            len = bytes.byteLength;

        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    },
    _parseWav(wav) {
        function readInt(i, bytes) {
            let ret = 0,
                shft = 0;

            while (bytes) {
                ret += wav[i] << shft;
                shft += 8;
                i++;
                bytes--;
            }
            return ret;
        }

        if (readInt(20, 2) != 1) {
            throw 'Invalid compression code, not PCM';
        }
        if (readInt(22, 2) != 1) {
            throw 'Invalid number of channels, not 1';
        }
        return {
            sampleRate: readInt(24, 4),
            bitsPerSample: readInt(34, 2),
            samples: wav.subarray(44)
        };
    },
    _Uint8ArrayToFloat32Array(u8a) {
        let f32Buffer = new Float32Array(u8a.length);
        for (let i = 0; i < u8a.length; i++) {
            let value = u8a[i << 1] + (u8a[(i << 1) + 1] << 8);
            if (value >= 0x8000) {
                value |= ~0x7FFF;
            }
            f32Buffer[i] = value / 0x8000;
        }
        return f32Buffer;
    },
    _exportWav(e) {
        let wavBlob = e.data;
        this.wavCallback(wavBlob);
    },
    _exportMp3(e) {
        let blob = e.data;
        let arrayBuffer;
        let fileReader = new FileReader();
        fileReader.onload = () => {
            arrayBuffer = fileReader.result;
            let buffer = new Uint8Array(arrayBuffer),
                data = this._parseWav(buffer);

            this.encoderWorker.postMessage({
                cmd: 'init', config: {
                    mode: 3,
                    channels: 1,
                    samplerate: data.sampleRate,
                    bitrate: data.bitsPerSample
                }
            });
            this.encoderWorker.postMessage({cmd: 'encode', buf: this._Uint8ArrayToFloat32Array(data.samples)});
            this.encoderWorker.postMessage({cmd: 'finish'});
            this.encoderWorker.onmessage = (e) => {
                if (e.data.cmd == 'data') {
                    let mp3Blob = new Blob([new Uint8Array(e.data.buf)], {type: 'audio/mp3'});
                    this.mp3Callback(mp3Blob);
                }
            };
        };

        fileReader.readAsArrayBuffer(blob);
    }
};

export default Recorder;



