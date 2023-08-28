const nicknameLayer = document.getElementById(
  "nicknameLayer"
) as HTMLDivElement;
const nicknameInput = document.getElementById(
  "nicknameInput"
) as HTMLInputElement;
const joinButton = document.getElementById("joinButton") as HTMLButtonElement;
const editor = document.getElementById("editor") as HTMLDivElement;
const contentTextarea = document.getElementById(
  "content"
) as HTMLTextAreaElement;
const participantsDiv = document.getElementById(
  "participants"
) as HTMLDivElement;
const noticeMessageDiv = document.getElementById(
  "noticeMessage"
) as HTMLDivElement;

const channel = new BroadcastChannel("simple_web_text_editor");
function postMessage(
  type: TChannelActionTypes,
  props: { [key: string]: any }
): void {
  channel.postMessage({ type, ...props });
}

let participants: IParticipant[] = [];

const getTextWidth = (function () {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  return (text: string) => {
    if (ctx) {
      ctx.font = window.getComputedStyle(contentTextarea).font;
      return ctx.measureText(text).width;
    }
    return 0;
  };
})();

function updateNoticeMessage(message: string) {
  noticeMessageDiv.innerHTML = message;
}

function updateParticipants() {
  participantsDiv.innerHTML = participants
    .map((participant) => participant.nickname)
    .join("<br/>");
}

function joinButtonOnClick() {
  const nickname = nicknameInput.value.trim();
  if (nickname) {
    nicknameLayer.classList.add("hidden");
    editor.classList.remove("hidden");

    const cursorPosition = contentTextarea.selectionStart;
    const participant: IParticipant = {
      id: Date.now().toString(),
      nickname,
      cursorPosition,
    };
    handleChannelJoin(participant);
    postMessage("join", { participant });
  }
}

function init() {
  postMessage("getParticipants", {});
  postMessage("getContent", {});

  contentTextarea.addEventListener("input", () => {
    const content = contentTextarea.value;
    postMessage("content", { content });

    const cursorPosition = contentTextarea.selectionStart;
    const myNickname = nicknameInput.value.trim();
    const myParticipant = participants.find(
      (participant) => participant.nickname === myNickname
    );
    if (myParticipant) {
      postMessage("cursorPosition", {
        participantId: myParticipant.id,
        cursorPosition,
      });
    }
  });
}

function handleChannelJoin(participant: IParticipant) {
  updateNoticeMessage(`${participant.nickname}님이 입장하였습니다.`);
  participants.push(participant);
  updateParticipants();
  updateCursorPosition();
}

function handleChannelMessage(event: MessageEvent) {
  const data = event.data;
  const participantId: string = data.participantId;
  const myNickname = nicknameInput.value.trim();

  switch (data.type) {
    case "join":
      const currentParticipant: IParticipant = data.participant;
      handleChannelJoin(currentParticipant);
      break;
    case "content":
      const senderNickname = participants.find(
        (participant) => participant.id === data.participantId
      )?.nickname;
      if (senderNickname !== myNickname) {
        contentTextarea.value = data.content;
      }
      break;
    case "leave":
      const index = participants.findIndex(
        (participant) => participant.id === participantId
      );
      if (index !== -1) {
        participants.splice(index, 1);
        updateParticipants();

        const cursorSpan = document.getElementById(`cursor_${participantId}`);
        if (cursorSpan) {
          cursorSpan.remove();
        }
      }
      break;
    case "getParticipants":
      postMessage("participantsList", { participants });
      break;
    case "participantsList":
      participants = data.participants;
      updateParticipants();
      updateCursors();
      break;
    case "cursorPosition":
      const cursorPosition = data.cursorPosition;
      const participant = participants.find(
        (participant) => participant.id === participantId
      );
      if (participant) {
        participant.cursorPosition = cursorPosition;
        if (participant.nickname === myNickname) {
          updateCursors();
        }
      }
      break;
    default:
      break;
  }
  updateCursors();
}

function drawCursor(participant: IParticipant) {
  let cursorSpan = document.getElementById(`cursor_${participant.id}`);
  if (!cursorSpan) {
    cursorSpan = document.createElement("span");
    cursorSpan.id = `cursor_${participant.id}`;
    cursorSpan.classList.add("cursorLabel");
    cursorSpan.textContent = participant.nickname;
    editor.appendChild(cursorSpan);
  }

  const cursorPosition = participant.cursorPosition;
  const value = contentTextarea.value;
  const textBeforeCursor = value.substring(0, cursorPosition);

  const row = (textBeforeCursor.match(/\n/g) || []).length;

  const lines = value.split("\n");
  const textOnRow = lines[row];

  const lastLineBreakPos = textBeforeCursor.lastIndexOf("\n");
  const col =
    lastLineBreakPos === -1
      ? cursorPosition
      : cursorPosition - lastLineBreakPos - 1;

  const lineHeight = 16;
  const cursorTop = contentTextarea.offsetTop + lineHeight * row;

  const cursorLeft =
    contentTextarea.offsetLeft + getTextWidth(textOnRow.slice(0, col));

  cursorSpan.style.position = "absolute";
  cursorSpan.style.top = `${cursorTop - 20}px`;
  cursorSpan.style.left = `${cursorLeft + 5}px`;
  cursorSpan.style.width = "fit-content";
}

function updateCursorPosition() {
  const cursorPosition = contentTextarea.selectionStart;

  postMessage("cursorPosition", {
    participants,
    cursorPosition,
  });
}

function updateCursors() {
  const myNickname = nicknameInput.value.trim();
  const myParticipant = participants.find(
    (participant) => participant.nickname === myNickname
  );

  const existingCursorIds = new Set(
    participants.map((participant) => `cursor_${participant.id}`)
  );
  const allCursorSpans = editor.getElementsByClassName("cursorLabel");
  for (let i = allCursorSpans.length - 1; i >= 0; i--) {
    const cursorSpan = allCursorSpans[i];
    if (!existingCursorIds.has(cursorSpan.id)) {
      cursorSpan.remove();
    }
  }

  participants.forEach((participant) => {
    if (!myParticipant || participant.id !== myParticipant.id) {
      drawCursor(participant);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  channel.onmessage = handleChannelMessage;
  joinButton.addEventListener("click", joinButtonOnClick);

  init();
});

window.addEventListener("beforeunload", () => {
  const myNickname = nicknameInput.value.trim();
  const myParticipant = participants.find(
    (participant) => participant.nickname === myNickname
  );
  if (myParticipant) {
    participants = participants.filter(
      (participant) => participant.nickname !== myNickname
    );
    updateParticipants();
    postMessage("leave", { participantId: myParticipant.id });
  }
});
