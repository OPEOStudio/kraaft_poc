import config from 'config'
import { startZelloApiClient, MessageStream } from './zello'
import logger from './logger'
import { createOggProcessor } from './utils/ogg'
import { speechToText } from './speechToText'
import { messageToIssue } from './messageToIssue'
import { createIssue } from './trello'

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
      .on('end', async () => {
        logger.info(`End of Zello message [${message.streamId}].`)

        try {
          const oggOpusByteArray = oggProcessor.process()

          const transcription = await speechToText(oggOpusByteArray, { sampleRate: message.codecInfo.sampleRate })

          logger.info(`Message [${message.streamId}] transcription: ${transcription}`)

          const issue = messageToIssue({
            id: message.streamId.toString(),
            from: message.from,
            content: transcription
          })

          if (issue) {
            const id = await createIssue(issue)
            logger.info(`Issue created in Trello [${id}]`)
          } else {
            logger.info(`Message [${message.streamId}] ignored`)
          }
        } catch (e) {
          logger.error(e)
        }
      })
  },
})
