import { client as WebSocketClient, connection as WsConnection, IMessage as WsMessage } from 'websocket'
import logger from './logger'
import { camelCaseKeys } from './utils/objectKeys'
import { EventEmitter } from 'events'

// Zello API Documentation: https://github.com/zelloptt/zello-channel-api/blob/master/API.md

export function startZelloApiClient(config: ZelloConfig): ZelloApiClient {
  const client = new ZelloApiClient(config)
  client.start()
  return client
}

class ZelloApiClient {

  private currentStream: MessageStreamImpl | undefined

  constructor(private config: ZelloConfig) {}

  start() {
    logger.info('Start Zello API Client...')

    const client = new WebSocketClient()

    client.on('connectFailed', error => logger.error(`Zello WebSocket connection failed: ${error}`))

    client.on('connect', this.handleWsConnection)

    client.connect(`wss://zellowork.io/ws/${this.config.network}`)
  }

  private handleWsConnection = (connection: WsConnection) => {

    logger.info('Zello WebSocket Client Connected')

    connection.on('error', error => logger.error(`Zello WebSocket connection Error: ${error}`))

    connection.on('close', () => logger.info('Zello WebSocket connection closed'))

    connection.on('message', this.handleWsMessage)

    // Connect to the channel
    connection.sendUTF(JSON.stringify({
      command: 'logon',
      seq: 1,
      auth_token: this.config.authToken,
      channel: this.config.channel,
    }))
  }

  private handleWsMessage = (message: WsMessage) => {
    logger.debug(`Zello API Message: ${message}`)

    if (message.type === 'utf8' && message.utf8Data) {
      // JSON-formatted WebSocket text messages
      const event = camelCaseKeys(JSON.parse(message.utf8Data))
      switch (event.command) {
        case 'on_stream_start': this.handleStreamStart(event as StreamStartEvent); break
        case 'on_stream_stop': this.handleStreamStop(event as StreamStopEvent); break
        case 'on_error': this.handleError(event as ErrorEvent); break
      }
    } else if (message.type === 'binary' && message.binaryData) {
      // WebSocket binary message
      this.handleStreamData(message.binaryData)
    } else {
      logger.error(`Unexpected WebSocket message: ${message}`)
    }
  }

  private handleStreamStart({ from, streamId, codecHeader, packetDuration }: StreamStartEvent): void {
    // For the moment, the hypothesis is that concurrent streams never occurred.
    if (this.currentStream && !this.currentStream.isFinished) {
      logger.error(`A new stream [${streamId}] started while the current stream ` +
        `[${this.currentStream.streamId}] is not terminated`)
    }

    const parsedHeader = this.parseCodecHeader(codecHeader)
    this.currentStream = new MessageStreamImpl({ streamId, from, codecInfo: { ...parsedHeader, packetDuration } })
    this.config.onMessageStream(this.currentStream)
  }

  private handleStreamStop({ streamId }: StreamStopEvent): void {
    if (!this.currentStream || this.currentStream.isFinished) {
      logger.error('Stream stop event received while no current stream is present')
      return
    }
    if (streamId !== this.currentStream.streamId) {
      logger.error(`Unexpected stream id [${streamId}] on stream stop event. Expected: [${streamId}]`)
      return
    }
    this.currentStream.finish()
    this.currentStream = undefined
  }

  private handleStreamData(buffer: Buffer): void {
    if (!this.currentStream || this.currentStream.isFinished) {
      logger.error('Stream data received while no current stream is present')
      return
    }
    const { streamId, packet } = this.parseStreamData(buffer)
    if (streamId !== this.currentStream.streamId) {
      logger.error(`Unexpected stream id [${streamId}] on received stream data. Expected: [${streamId}]`)
      return
    }

    this.currentStream.emit('data', packet)
  }

  private handleError(event: ErrorEvent): void {
    logger.error(`Error received from Zello API: ${event.error}`)
  }

  private parseCodecHeader(header: string): CodecHeader {
    const buffer = Buffer.from(header, 'base64')
    return {
      sampleRate: buffer.readUInt16LE(0),
      framesPerPacket: buffer.readUInt8(2),
      frameSize: buffer.readUInt8(3),
    }
  }

  private parseStreamData(message: Buffer): StreamDataEvent {
    // More info here: https://github.com/zelloptt/zello-channel-api/blob/master/API.md#stream-data
    return {
      streamId: message.readUInt32BE(1),
      packetId: message.readUInt32BE(5),
      packet: message.slice(9),
    }
  }
}

export type ZelloConfig = {
  authToken: string,
  network: string,
  channel: string,
  /** Callback called each time a new message stream is received from Zello */
  onMessageStream: (message: MessageStream) => void,
}

/**
 * Represent a message stream received from Zello.
 */
export interface MessageStream {
  /** Id of the stream */
  streamId: number
  /** Sender of the message */
  from: string
  /** Codec related infos */
  codecInfo: CodecInfo

  /** Called each time a new audio packet is received from Zello */
  on(event: 'data', cb: (data: Buffer) => void): MessageStream

  /** Called on time at the end of the stream */
  on(event: 'end', cb: () => void): MessageStream
}

class MessageStreamImpl extends EventEmitter implements MessageStream {
  streamId: number
  from: string
  isFinished: boolean = false
  codecInfo: CodecInfo

  constructor(params: { streamId: number, from: string, codecInfo: CodecInfo }) {
    super()
    this.streamId = params.streamId
    this.from = params.from
    this.codecInfo = params.codecInfo
  }

  finish(): void {
    this.isFinished = true
    this.emit('end')
  }
}

type StreamStartEvent = {
  command: 'on_stream_start',
  type: 'audio',
  /** The name of audio codec used. Required for audio streams. Must be `opus` */
  codec: 'opus',
  /** Base64 encoded codec header */
  codecHeader: string,
  /** Audio packet duration in milliseconds. Values between 20 ms and 200 ms are supported */
  packetDuration: number,
  /** The id of the stream that started */
  streamId: number,
  /** The name of the channel */
  channel: string,
  /** The username of the sender of the message */
  from:	string,
}

type StreamStopEvent = {
  command: 'on_stream_stop',
  /** The id of the stream that stopped */
  streamId: number,
}

type StreamDataEvent = {
  streamId: number,
  packetId: number,
  packet: Buffer,
}

export type CodecHeader = {
  sampleRate: number,
  framesPerPacket: number,
  frameSize: number,
}

export type CodecInfo = CodecHeader & { packetDuration: number }

export type ErrorEvent = {
  command: 'on_error',
  /** See: https://github.com/zelloptt/zello-channel-api/blob/master/API.md#error-codes */
  error: string,
}
