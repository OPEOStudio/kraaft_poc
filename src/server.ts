import config from 'config'
import { SpeechClient } from '@google-cloud/speech'
import { startZelloApiClient, MessageStream } from './zelloApiClient'
import logger from './logger'
import { createOggProcessor } from './utils/ogg'

const client = new SpeechClient({
  keyFilename: `${process.cwd()}/.credentials/gcp.json`,
})

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

        client
          .recognize({
            config: {
              encoding: 'OGG_OPUS',
              sampleRateHertz: message.codecInfo.sampleRate,
              languageCode: config.get<string>('google_speech.language'),
            },
            audio: {
              content: oggOpusByteArray.toString('base64'),
            },
          })
          .then(data => {
            const response = data[0];
            const transcription = response.results
              .map(result => result.alternatives[0].transcript)
              .join('\n')
            logger.info(`Message [${message.streamId}] transcription: ${transcription}`)
          })
          .catch(err => logger.error(`Google Speech error: ${err}`))
      })
  },
})
