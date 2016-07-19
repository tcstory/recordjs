import Recorder from './recorder.js';

window.URL = window.URL || window.webkitURL;
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;

let recorder;

function startRecording() {
    if (navigator.getUserMedia) {
        navigator.getUserMedia({audio: true}, onSuccess, onFail);
    } else {
        console.log('navigator.getUserMedia not present');
    }
}

function stopRecording(cb) {
    recorder.stop();
    recorder.exportWAV(cb);
}

function onFail(e) {
    console.log('Rejected!', e);
}

function onSuccess(s) {
    let context;
    if (typeof AudioContext === 'function') {
        context = new AudioContext();
    } else {
        context = new webkitAudioContext();
    }
    let mediaStreamSource = context.createMediaStreamSource(s);
    recorder = new Recorder(mediaStreamSource);
    recorder.record();
}

export  {
    startRecording,
    stopRecording
}