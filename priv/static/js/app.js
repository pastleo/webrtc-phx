import { Socket } from 'https://unpkg.com/phoenix@1.3.4/assets/js/phoenix.js?module';

const phxSocket = new Socket("/socket", {});
phxSocket.connect();

let myName, peerName, phxChannel, rtcConnection, rtcChannel;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('connect')
    .addEventListener('click', initAndConnectPhxChannel);
  document.getElementById('msg-sender')
    .addEventListener('keypress', sendMsg);
}, false);

// A:
function initAndConnectPhxChannel() {
  console.group('A. initAndConnectPhxChannel');

  myName = document.getElementById('my-name').value;
  peerName = document.getElementById('peer-name').value;
  console.log('myName:', myName, 'peerName:', peerName);

  phxChannel = phxSocket.channel("handshake:" + myName, {})

  phxChannel.on("offer", prepareAnswerAndPush);
  phxChannel.on("answer", useAnswer);
  phxChannel.on("ice", useIceCandidate);

  phxChannel
    .join()
    .receive("ok", prepareOfferAndPush)
    .receive("error", resp => {
      alert("Unable to join", resp)
      throw(resp)
    })
  
  console.groupEnd();
}

// B.
function prepareOfferAndPush() {
  console.group('B. prepareOfferAndPush');

  rtcConnection = new RTCPeerConnection();

  // IMPORTANT! createDataChannel is required before creating offer
  rtcChannel = rtcConnection.createDataChannel("msg");
  rtcChannel.onmessage = receiveMsg;

  rtcConnection.onicecandidate = pushIceCandidate;
  rtcConnection.oniceconnectionstatechange = rtcConnectionChanged;

  rtcConnection
    .createOffer()
    .then(offer => rtcConnection.setLocalDescription(offer))
    .then(() => {
      console.log('push offer description:', JSON.stringify(rtcConnection.localDescription))
      phxChannel.push("offer", {target: peerName, offer: JSON.stringify(rtcConnection.localDescription)});
    })

  console.groupEnd();
}

// C.
function prepareAnswerAndPush({from, offer}) {
  if(from === peerName) {
    console.group('C. prepareAnswerAndPush');
    console.log('from:', from, 'get offer:', offer);

    // for the 'being connected' peer (who click the connect button first),
    // only connect to proper phx channel, its offer will be ignored
    // we need a new connection for 'being connected' here
    rtcConnection = new RTCPeerConnection();

    rtcConnection.ondatachannel = ({channel}) => {
      rtcChannel = channel;
      rtcChannel.onmessage = receiveMsg;
    }

    rtcConnection.onicecandidate = pushIceCandidate;
    rtcConnection.oniceconnectionstatechange = rtcConnectionChanged;

    rtcConnection
      .setRemoteDescription(JSON.parse(offer))
      .then(() => rtcConnection.createAnswer())
      .then(answer => rtcConnection.setLocalDescription(answer))
      .then(() => {
        console.log('push answer description:', JSON.stringify(rtcConnection.localDescription))
        phxChannel.push("answer", {target: peerName, answer: JSON.stringify(rtcConnection.localDescription)});
      })

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

  document.getElementById('msg').style.background = {
    checking: '#ffeeb1',
    failed: '#ffaec8',
    disconnected: '#ffaec8',
    closed: '#ffaec8',
    connected: '#e2ffef',
    completed: '#e2ffef',
  }[iceConnectionState];

  document.getElementById('msg-sender').disabled =
    iceConnectionState !== 'connected' && iceConnectionState !== 'completed';
}

function sendMsg({ which, target }) {
  if(rtcChannel && which === 13) {
    console.log('rtc send:', target.value);
    rtcChannel.send(target.value);
    target.value = '';
  }
}

function receiveMsg({ data }) {
  console.log('receiveMsg');
  console.log('data: ', data);

  const el = document.createElement("p");
  const txtNode = document.createTextNode(data);

  el.appendChild(txtNode);
  document.getElementById('msg').appendChild(el);
}

