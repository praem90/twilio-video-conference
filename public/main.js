
const form = document.getElementById("room-name-form");
const roomNameInput = document.getElementById("room-name-input");
const container = document.getElementById("video-container");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");

const dataTrack = new Twilio.Video.LocalDataTrack();
const dataTrackPublished = {};
dataTrackPublished.promise = new Promise((resolve, reject) => {
  dataTrackPublished.resolve = resolve;
  dataTrackPublished.reject = reject;
});

messageForm.addEventListener('submit', e => {
    e.preventDefault();
    const data = JSON.stringify({
        message: messageInput.value
    });
    dataTrackPublished.promise.then(() => dataTrack.send(data));
    messageInput.value = '';
});

const startRoom = async (event) => {
  // prevent a page reload when a user submits the form
  event.preventDefault();
  // hide the join form
  form.style.visibility = "hidden";
  // retrieve the room name
  const roomName = roomNameInput.value;

  // fetch an Access Token from the join-room route
  const response = await fetch("/join-room", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ roomName: roomName }),
  });
  const { token } = await response.json();

  // join the video room with the token
  const room = await joinVideoRoom(roomName, token);

    document.getElementById('message-container').classList.remove('hidden');

  // render the local and remote participants' video and audio tracks
  handleConnectedParticipant(room.localParticipant);
    room.localParticipant.publishTrack(dataTrack);



room.localParticipant.on('trackPublished', publication => {
  if (publication.track === dataTrack) {
    dataTrackPublished.resolve();
  }
});

room.localParticipant.on('trackPublicationFailed', (error, track) => {
  if (track === dataTrack) {
    dataTrackPublished.reject(error);
  }
});

  room.participants.forEach(handleConnectedParticipant);
  room.on("participantConnected", handleConnectedParticipant);

  // handle cleanup when a participant disconnects
  room.on("participantDisconnected", handleDisconnectedParticipant);
  window.addEventListener("pagehide", () => room.disconnect());
  window.addEventListener("beforeunload", () => room.disconnect());
};

const handleConnectedParticipant = (participant) => {
  // create a div for this participant's tracks
  const participantDiv = document.createElement("div");
  participantDiv.setAttribute("id", participant.identity);
  container.appendChild(participantDiv);

  // iterate through the participant's published tracks and
  // call `handleTrackPublication` on them
  participant.tracks.forEach((trackPublication) => {
    handleTrackPublication(trackPublication, participant);
  });

  // listen for any new track publications
  participant.on("trackPublished", handleTrackPublication);
};

const handleTrackPublication = (trackPublication, participant) => {
  function displayTrack(track) {
      if (track.kind === 'data') {
          track.on('message', data => {
              data = JSON.parse(data);
              console.log(data);
              const message = document.createElement('li');
              message.classList.add('px-4', 'py-4');
              message.innerText = data.message;
              document.getElementById('messages').appendChild(message);
          });
          return;
      }
    // append this track to the participant's div and render it on the page
    const participantDiv = document.getElementById(participant.identity);
    // track.attach creates an HTMLVideoElement or HTMLAudioElement
    // (depending on the type of track) and adds the video or audio stream
    participantDiv.append(track.attach());
  }

  // check if the trackPublication contains a `track` attribute. If it does,
  // we are subscribed to this track. If not, we are not subscribed.
  if (trackPublication.track) {
      displayTrack(trackPublication.track);
  }

  // listen for any new subscriptions to this track publication
  trackPublication.on("subscribed", displayTrack);
};

const handleDisconnectedParticipant = (participant) => {
  // stop listening for this participant
  participant.removeAllListeners();
  // remove this participant's div from the page
  const participantDiv = document.getElementById(participant.identity);
  participantDiv.remove();
};

const joinVideoRoom = async (roomName, token) => {
  // join the video room with the Access Token and the given room name
  const room = await Twilio.Video.connect(token, {
    room: roomName,
  });
  return room;
};

form.addEventListener("submit", startRoom);
