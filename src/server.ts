import config from 'config'
import { startZelloApiClient, MessageStream } from './zelloApiClient'
import logger from './logger'
import { createOggProcessor } from './utils/ogg'
import { speechToText } from './speechToText'

startZelloApiClient({
  authToken: config.get<string>('zello.auth.dev_token'),
  network: config.get<string>('zello.network'),
  channel: config.get<string>('zello.channel'),
  onMessageStream(message: MessageStream) {
    logger.info(`Receive Zello message from ${message.from} [${message.streamId}].`)
    const oggProcessor = createOggProcessor({
      sampleRate: message.codecInfo.sampleRate,
      packetDuration: message.codecInfo.packetDuration,
    })
    message
      .on('data', data => oggProcessor.push(data))
      .on('end', () => {
        logger.info(`End of Zello message [${message.streamId}].`)

        const oggOpusByteArray = oggProcessor.process()

        speechToText(oggOpusByteArray, { sampleRate: message.codecInfo.sampleRate })
          .then(transcription => {
            logger.info(`Message [${message.streamId}] transcription: ${transcription}`)
          })
          .catch(err => {
            logger.error(`Google Speech error: ${err}`)
          })
      })
  },
})
