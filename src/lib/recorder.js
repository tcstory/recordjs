const WORKER_PATH = require('file-loader!./recorderWorker.js');
const MP3_WORKER_PATH = require('file-loader!./mp3Worker.js');
let Lame = require('exports-loader?Lame./libmp3lame.min.js');

function Recorder(source, cfg) {
    let encoderWorker = new Worker(MP3_WORKER_PATH);
    let config = cfg || {};
    let bufferLen = config.bufferLen || 4096;
    let numChannels = config.numChannels || 2;
    let context = source.context;

    let node =
        (
            context.createScriptProcessor || context.createJavaScriptNode
        ).call(context, bufferLen, numChannels, numChannels);

    node.onaudioprocess = function (e) {
        if (!recording) {
            return;
        }
        let buffer = [];
        for (let channel = 0; channel < numChannels; channel++) {
            buffer.push(e.inputBuffer.getChannelData(channel));
        }
        worker.postMessage({
            command: 'record',
            buffer: buffer
        });
    };

    let worker = new Worker(WORKER_PATH);
    worker.postMessage({
        command: 'init',
        config: {
            sampleRate: context.sampleRate,
            numChannels: numChannels
        }
    });

    let recording = false, currCallback;
    let configure = function (cfg) {
        for (let prop in cfg) {
            if (cfg.hasOwnProperty(prop)) {
                config[prop] = cfg[prop];
            }
        }
    };

    let record = function () {
        recording = true;
    };

    let stop = function () {
        recording = false;
    };

    let clear = function () {
        worker.postMessage({command: 'clear'});
    };

    let getBuffer = function (cb) {
        currCallback = cb || config.callback;
        worker.postMessage({command: 'getBuffer'})
    };

    let exportWAV = function (cb, type) {
        currCallback = cb || config.callback;
        type = type || config.type || 'audio/wav';
        if (!currCallback) {
            throw new Error('Callback not set');
        }
        worker.postMessage({
            command: 'exportWAV',
            type: type
        });
    };

    //Mp3 conversion
    worker.onmessage = function (e) {
        let blob = e.data;
        let arrayBuffer;
        let fileReader = new FileReader();
        fileReader.onload = function () {
            arrayBuffer = this.result;
            let buffer = new Uint8Array(arrayBuffer),
                data = parseWav(buffer);

            encoderWorker.postMessage({
                cmd: 'init', config: {
                    mode: 3,
                    channels: 1,
                    samplerate: data.sampleRate,
                    bitrate: data.bitsPerSample,
                    Lame: Lame
                }
            });
            encoderWorker.postMessage({cmd: 'encode', buf: Uint8ArrayToFloat32Array(data.samples)});
            encoderWorker.postMessage({cmd: 'finish'});
            encoderWorker.onmessage = function (e) {
                if (e.data.cmd == 'data') {
                    let mp3Blob = new Blob([new Uint8Array(e.data.buf)], {type: 'audio/mp3'});
                    let url = 'data:audio/mp3;base64,' + encode64(e.data.buf);
                    console.log(url)
                }
            };
        };
        
        fileReader.readAsArrayBuffer(blob);
        currCallback(blob);
    };


    function encode64(buffer) {
        let binary = '',
            bytes = new Uint8Array(buffer),
            len = bytes.byteLength;

        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    function parseWav(wav) {
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
    }

    function Uint8ArrayToFloat32Array(u8a) {
        let f32Buffer = new Float32Array(u8a.length);
        for (let i = 0; i < u8a.length; i++) {
            let value = u8a[i << 1] + (u8a[(i << 1) + 1] << 8);
            if (value >= 0x8000) {
                value |= ~0x7FFF;
            }
            f32Buffer[i] = value / 0x8000;
        }
        return f32Buffer;
    }

    source.connect(node);
    node.connect(context.destination);    //this should not be necessary
    
    return {
        record: record,
        stop: stop,
        clear: clear,
        exportWAV: exportWAV
    }
}

export default Recorder;



