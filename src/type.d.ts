type TChannelActionTypes =
  | "join"
  | "content"
  | "leave"
  | "getParticipants"
  | "participantsList"
  | "cursorPosition";

interface IchannelMessage {
  type: TChannelActionTypes;
  [key: string]: any;
}
interface IParticipant {
  id: string;
  nickname: string;
  cursorPosition: number;
}
