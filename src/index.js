import Recorder from './lib/index.js';

window.URL = window.URL || window.webkitURL;


let btn = document.querySelectorAll('button');
let text = document.querySelector('p');
let audio = document.querySelector('audio');

Recorder.init();

btn[0].addEventListener('click', function (ev) {
    if (Recorder.recording) {
        Recorder.stop();
        text.innerText = 'stop';
        document.body.classList.remove('recording')
    } else {
        Recorder.start();
        text.innerText = 'recording';
        document.body.classList.add('recording')
    }
});
btn[1].addEventListener('click', function () {
    Recorder.exportMP3(function (mp3Blob) {
        console.log(mp3Blob);
        console.log("Force download");
        var url = window.URL.createObjectURL(mp3Blob);
        audio.src = url;
        // var link = window.document.createElement('a');
        // link.href = url;
        // link.download = 'output.mp3';
        // var click = document.createEvent("Event");
        // click.initEvent("click", true, true);
        // link.dispatchEvent(click);
    });
});
btn[2].addEventListener('click', function () {
    Recorder.exportWAV(function (wavBlob) {
        console.log(wavBlob);
        console.log("Force download");
        var url = window.URL.createObjectURL(wavBlob);
        audio.src = url;
        // var link = window.document.createElement('a');
        // link.href = url;
        // link.download = 'output.wav';
        // var click = document.createEvent("Event");
        // click.initEvent("click", true, true);
        // link.dispatchEvent(click);
    });
});