// We need to import the CSS so that webpack will load it.
// The MiniCssExtractPlugin is used to separate it out into
// its own CSS file.
import "../css/app.scss"

// webpack automatically bundles all modules in your
// entry points. Those entry points can be configured
// in "webpack.config.js".
//
// Import deps with the dep name or local files with a relative path, for example:
//
//     import {Socket} from "phoenix"
//     import socket from "./socket"
//
import "phoenix_html"
import phxSocket from "./socket"

import _webrtcAdapter from 'webrtc-adapter';

const rtcConfig = {iceServers: [{urls: 'stun:stun.l.google.com:19302'}]};

let myName, peerName, phxChannel, rtcConnection, rtcChannel, userMediaAvailable = false;

const connectBtn = document.getElementById('connect');
const msgSendingDiv = document.getElementById('msg-sending-box');
const senderBtn = document.getElementById('msg-input');
const msgDiv = document.getElementById('msg-box');

async function tackleUserMediaPermission() {
  await askUserMediaPermission();

  const startStreamBtn = document.getElementById('start-stream');
  startStreamBtn.disabled = !userMediaAvailable;
  if (userMediaAvailable) {
    startStreamBtn.addEventListener('click', startStreamUserMedia);
  }
}

async function askUserMediaPermission(videoOnly = false) {
  try {
    const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: !videoOnly });
    userMediaStream.getTracks().forEach(track => {
      track.stop();
    });
    userMediaAvailable = true;
  } catch (e) {
    if (videoOnly) {
      alert('asking user media failed, error:\n' + e.message)
    } else {
      await askUserMediaPermission(true)
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  connectBtn.addEventListener('click', initAndConnectPhxChannel);

  senderBtn.addEventListener('keypress', ({ which }) => which === 13 && sendMsg());
  document.getElementById('msg-send').addEventListener('click', sendMsg);

  tackleUserMediaPermission();
}, false);

// A:
function initAndConnectPhxChannel() {
  const myNameInput = document.getElementById('my-name')
  const peerNameInput = document.getElementById('peer-name')
  myName = myNameInput.value;
  peerName = peerNameInput.value;

  if (!(myName && peerName)) return;

  console.group('A. initAndConnectPhxChannel');

  console.log('myName:', myName, 'peerName:', peerName);

  [myNameInput, peerNameInput, connectBtn].forEach(i => {
    i.disabled = true;
  });
  connectBtn.classList.add('pointer-events-none', 'opacity-25');

  phxChannel = phxSocket.channel("handshake:" + myName, {})

  phxChannel.on("offer", prepareAnswerAndPush);
  phxChannel.on("answer", useAnswer);
  phxChannel.on("ice", useIceCandidate);

  console.groupEnd();

  phxChannel
    .join()
    .receive("ok", offerAndPush)
    .receive("error", resp => {
      alert("Unable to join", resp)
      throw(resp)
    })
}

function createRtcConnection() {
  rtcConnection = new RTCPeerConnection(rtcConfig);

  rtcConnection.onicecandidate = pushIceCandidate;
  rtcConnection.oniceconnectionstatechange = rtcConnectionChanged;
  rtcConnection.ondatachannel = ({channel}) => {
    rtcChannel = channel;
    rtcChannel.onmessage = receiveMsg;
  }
  rtcConnection.ontrack = receiveRemoteStream;
}

// B.
async function offerAndPush() {
  console.group('B. offerAndPush');

  if (!rtcConnection) {
    createRtcConnection();
  }

  if (!rtcChannel) {
    // IMPORTANT! createDataChannel is required before creating offer
    rtcChannel = rtcConnection.createDataChannel("msg");
    rtcChannel.onmessage = receiveMsg;
  }

  const offer = await rtcConnection.createOffer();
  await rtcConnection.setLocalDescription(offer);

  console.log('push offer description:', JSON.stringify(rtcConnection.localDescription))
  phxChannel.push("offer", {
    target: peerName, offer: JSON.stringify(rtcConnection.localDescription)
  });

  console.groupEnd();
}

// C.
async function prepareAnswerAndPush({from, offer}) {
  if(from === peerName) {
    console.group('C. prepareAnswerAndPush');
    console.log('from:', from, 'get offer:', offer);

    if (
      !rtcConnection ||
      (rtcConnection && rtcConnection.signalingState === 'have-local-offer')
    ) {
      createRtcConnection();
    }

    await rtcConnection.setRemoteDescription(JSON.parse(offer));
    const answer = await rtcConnection.createAnswer()
    await rtcConnection.setLocalDescription(answer)

    console.log('push answer description:', JSON.stringify(rtcConnection.localDescription))
    phxChannel.push("answer", {
      target: peerName, answer: JSON.stringify(rtcConnection.localDescription)
    });

    console.groupEnd();
  }
}

// D.
function useAnswer({from, answer}) {
  if(from === peerName) {
    console.group('D. useAnswer');
    console.log('from:', from, 'get answer:', answer);

    rtcConnection.setRemoteDescription(JSON.parse(answer));

    console.groupEnd();
  }
}

// E.
function pushIceCandidate({candidate}) {
  if(candidate) {
    console.group('E. pushIceCandidate');
    console.log('candidate:', candidate);

    console.log('push ice candidate:', JSON.stringify(candidate))
    phxChannel.push("ice", {target: peerName, ice: JSON.stringify(candidate)});

    console.groupEnd();
  }
}

// F.
function useIceCandidate({from, ice}) {
  console.group('F. useIceCandidate');
  console.log('ice:', ice);

  rtcConnection.addIceCandidate(JSON.parse(ice));

  console.groupEnd();
}

function rtcConnectionChanged() {
  const { iceConnectionState } = rtcConnection;
  console.log('rtcConnectionChanged', iceConnectionState);

  const disabling = iceConnectionState !== 'connected' && iceConnectionState !== 'completed';

  senderBtn.style.background = {
    checking: '#ffeeb1',
    failed: '#ffaec8',
    disconnected: '#ffaec8',
    closed: '#ffaec8',
    connected: '#e2ffef',
    completed: '#e2ffef',
  }[iceConnectionState];

  senderBtn.disabled = disabling;
  if (disabling) {
    msgSendingDiv.classList.add('opacity-25', 'pointer-events-none');
  } else {
    msgSendingDiv.classList.remove('opacity-25', 'pointer-events-none');
  }
}

function sendMsg() {
  const value = senderBtn.value;
  if(rtcChannel && value) {
    console.log('rtc send:', value);
    rtcChannel.send(value);
    senderBtn.value = '';
  }
}

async function selectAndgetUserMediaStream() {
  const mediaDevs = await navigator.mediaDevices.enumerateDevices();

  const audioDevSelect = document.getElementById('audio-devices');
  const videoDevSelect = document.getElementById('video-devices');

  audioDevSelect.innerHTML = '';
  videoDevSelect.innerHTML = '';

  mediaDevs.filter(({ deviceId }) => deviceId !== 'default').forEach(({ deviceId, label, kind }) => {
    const optionDOM = document.createElement('option');
    optionDOM.value = deviceId;
    optionDOM.text = label;

    if (kind === 'audioinput') {
      audioDevSelect.add(optionDOM);
    } else if (kind === 'videoinput') {
      videoDevSelect.add(optionDOM);
    }
  })

  await new Promise(resolve => {
    const selectsDiv = document.getElementById('media-dev-selects');
    selectsDiv.classList.remove('hidden');
    document.getElementById('confirm-stream-dev').addEventListener('click', () => {
      selectsDiv.classList.add('hidden');
      resolve()
    }, { once: true })
  })

  const mediaConstraints = {
    audio: audioDevSelect.value ? { deviceId: { exact: audioDevSelect.value } } : false,
    video: videoDevSelect.value ? { deviceId: { exact: videoDevSelect.value } } : false,
  }
  return navigator.mediaDevices.getUserMedia(mediaConstraints);
}

async function startStreamUserMedia() {
  console.log('startStreamUserMedia');

  const userMediaStream = await selectAndgetUserMediaStream();
  userMediaStream.getTracks().forEach(track => {
    console.log('rtcConnection.addTrack:', track, userMediaStream)
    rtcConnection.addTrack(track, userMediaStream);
  });

  document.getElementById('media').classList.remove('hidden');

  const videoDOM = document.getElementById('my-media')
  videoDOM.srcObject = userMediaStream;

  offerAndPush();
}

function receiveMsg({ data }) {
  console.log('receiveMsg:', data);

  const el = document.createElement("p");
  const txtNode = document.createTextNode(data);

  el.appendChild(txtNode);
  msgDiv.appendChild(el);
}

let setStreamTimeout;
function receiveRemoteStream(event) {
  console.log('receiveRemoteStream', event.streams);

  const videoDOM = document.getElementById('peer-media')
  const stream = event.streams[0];

  if (setStreamTimeout) clearTimeout(setStreamTimeout);
  setStreamTimeout = setTimeout(() => {
    console.log('setRemoteStream', stream);

    document.getElementById('media').classList.remove('hidden');

    videoDOM.srcObject = stream;
  }, 750);
}
