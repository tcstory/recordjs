import {startRecording, stopRecording} from './lib/index.js';

window.URL = window.URL || window.webkitURL;


let btn = document.querySelector('button');
let text = document.querySelector('p');
let audio = document.querySelector('audio');
let recording = false;

btn.addEventListener('click', function (ev) {
    if (recording) {
        recording = false;
        stopRecording(function (blob) {
            audio.src = window.URL.createObjectURL(blob);
        });
        text.innerText = 'stop';
    } else {
        recording = true;
        startRecording();
        text.innerText = 'recording'
    }
});
