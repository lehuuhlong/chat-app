export interface Message {
  _id: string;
  username: string;
  text: string;
  createdAt: string;
  file?: {
    id: string;
    filename: string;
    originalname: string;
    mimetype: string;
    size: number;
  };
  files?: {
    id: string;
    filename: string;
    originalname: string;
    mimetype: string;
    size: number;
  }[];
  reactions?: { [key: string]: string[] };
}
