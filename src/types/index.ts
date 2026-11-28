export interface MessageFile {
  id: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface Message {
  _id: string;
  username: string;
  /** Public id of the author. Missing on messages created before identities existed. */
  userId?: string;
  text: string;
  createdAt: string;
  editedAt?: string;
  /** Legacy single-file field */
  file?: MessageFile;
  files?: MessageFile[];
  reactions?: { [key: string]: string[] };
}
